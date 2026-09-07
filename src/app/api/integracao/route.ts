import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfile, hasPermission } from "@/lib/permissions";

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase não configurado.");
  }

  return { url: url.replace(/\/$/, ""), anonKey };
}

async function getCurrentUser(accessToken: string, url: string, anonKey: string) {
  const response = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as { id?: string; email?: string; user_metadata?: { full_name?: string } };
}

async function getCompanyId(accessToken: string, url: string, anonKey: string) {
  const user = await getCurrentUser(accessToken, url, anonKey);
  if (!user?.id) return null;

  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=company_id&id=eq.${user.id}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!profileResponse.ok) return null;
  const profiles = (await profileResponse.json()) as Array<{ company_id?: string }>;
  return profiles[0]?.company_id ?? null;
}

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (insideQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        insideQuotes = !insideQuotes;
      }
      continue;
    }

    if (char === "," && !insideQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseCsv(csv: string) {
  const normalized = csv.replace(/\r/g, "").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map((value) => value.toLowerCase().trim());
  const rows = lines.slice(1).filter((line) => line.trim()).map((line) => {
    const values = splitCsvLine(line);
    const entry: Record<string, string> = {};

    headers.forEach((header, index) => {
      entry[header] = values[index] ?? "";
    });

    return entry;
  });

  return rows;
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const { url, anonKey } = getConfig();
    const profile = await getProfile(url, anonKey, accessToken);
    if (!profile || !hasPermission(profile.profile.role, "integration:write")) {
      return NextResponse.json({ error: "Seu perfil não pode importar dados." }, { status: 403 });
    }
    const body = (await request.json()) as {
      csv?: string;
      rows?: Array<Record<string, unknown>>;
    };

    const companyId = await getCompanyId(accessToken, url, anonKey);
    if (!companyId) {
      return NextResponse.json({ error: "Usuário sem empresa vinculada." }, { status: 403 });
    }

    const rowSource = body.rows?.length ? body.rows : parseCsv(body.csv ?? "");
    if (!rowSource.length) {
      return NextResponse.json({ error: "Nenhuma linha de importação foi enviada." }, { status: 400 });
    }

    const imported: Array<Record<string, string | number>> = [];
    const errors: string[] = [];

    for (const [index, rawRow] of rowSource.entries()) {
      const row = rawRow as Record<string, unknown>;
      const code = String(row.code ?? row.codigo ?? row.Codigo ?? "").trim();
      const name = String(row.name ?? row.descricao ?? row.descrição ?? row.nome ?? "").trim();
      const unit = String(row.unit ?? row.unidade ?? row.un ?? "UN").trim().toUpperCase();
      const minimumStock = Number(row.minimum_stock ?? row.minimo ?? row.minimum ?? 0);
      const averageCost = Number(row.average_cost ?? row.custo_medio ?? row.custo ?? 0);
      const status = String(row.status ?? "active").trim().toLowerCase();

      if (!code || !name) {
        errors.push(`Linha ${index + 2}: código e descrição são obrigatórios.`);
        continue;
      }

      const payload = {
        company_id: companyId,
        code,
        name,
        unit: unit || "UN",
        minimum_stock: Number.isFinite(minimumStock) ? Math.max(0, minimumStock) : 0,
        average_cost: Number.isFinite(averageCost) ? Math.max(0, averageCost) : 0,
        status: ["active", "blocked", "quarantine", "inactive"].includes(status) ? status : "active",
      };

      const response = await fetch(`${url}/rest/v1/materials?on_conflict=company_id,code`, {
        method: "POST",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        errors.push(`Linha ${index + 2}: ${errorText || "falha na importação."}`);
        continue;
      }

      const data = (await response.json()) as Array<Record<string, string | number>>;
      imported.push(data[0] ?? payload);
    }

    return NextResponse.json({
      imported: imported.length,
      total: rowSource.length,
      errors,
      items: imported,
    });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}
