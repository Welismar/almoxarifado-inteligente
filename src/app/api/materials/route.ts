import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfile, hasPermission } from "@/lib/permissions";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase não configurado.");
  }

  return { url: url.replace(/\/$/, ""), anonKey };
}

function getServiceRoleKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY;
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("stockwise-access-token")?.value;
}

async function getCurrentUser(url: string, anonKey: string, accessToken: string) {
  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!userResponse.ok) return null;

  return (await userResponse.json()) as { id?: string; email?: string; user_metadata?: { full_name?: string } };
}

async function ensureUserCompanyProfile(url: string, accessToken: string) {
  const anonKey = getSupabaseConfig().anonKey;
  const serviceRoleKey = getServiceRoleKey();

  if (!serviceRoleKey) {
    return null;
  }

  const user = await getCurrentUser(url, anonKey, accessToken);
  if (!user?.id) {
    return null;
  }

  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=id,company_id&user_id=eq.${user.id}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (profileResponse.ok) {
    const profiles = (await profileResponse.json()) as Array<{ company_id?: string; id?: string }>;
    if (profiles[0]?.company_id) {
      return profiles[0].company_id;
    }
  }

  const companyResponse = await fetch(`${url}/rest/v1/companies`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      name: user.user_metadata?.full_name || user.email || "Empresa Stockwise",
      document: "00000000000000",
    }),
  });

  if (!companyResponse.ok) {
    return null;
  }

  const company = ((await companyResponse.json()) as Array<{ id?: string }>)[0];
  const companyId = company?.id;
  if (!companyId) {
    return null;
  }

  const profileCreateResponse = await fetch(`${url}/rest/v1/profiles`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
    body: JSON.stringify({
      id: user.id,
      company_id: companyId,
      full_name: user.user_metadata?.full_name || user.email || "Administrador",
      role: "admin",
    }),
  });

  if (!profileCreateResponse.ok) {
    return null;
  }

  return companyId;
}

async function getCompanyId(url: string, anonKey: string, accessToken: string) {
  const user = await getCurrentUser(url, anonKey, accessToken);
  if (!user?.id) return null;

  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=company_id&id=eq.${user.id}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!profileResponse.ok) return null;

  const profiles = (await profileResponse.json()) as Array<{ company_id: string }>;
  const existingCompanyId = profiles[0]?.company_id ?? null;
  if (existingCompanyId) {
    return existingCompanyId;
  }

  return ensureUserCompanyProfile(url, accessToken);
}

export async function GET() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const { url, anonKey } = getSupabaseConfig();
    const companyId = await getCompanyId(url, anonKey, accessToken);

    if (!companyId) {
      return NextResponse.json({ materials: [] });
    }

    const response = await fetch(`${url}/rest/v1/materials?select=id,code,name,unit,barcode,technical_description,minimum_stock,maximum_stock,reorder_point,average_cost,status&company_id=eq.${companyId}&order=name.asc`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível carregar os materiais." }, { status: response.status });
    }

    return NextResponse.json({ materials: await response.json() });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  const body = (await request.json()) as {
    code?: string;
    name?: string;
    unit?: string;
    minimumStock?: number;
    averageCost?: number;
    barcode?: string;
    technicalDescription?: string;
    maximumStock?: number;
    reorderPoint?: number;
  };

  if (!body.code?.trim() || !body.name?.trim() || !body.unit?.trim()) {
    return NextResponse.json({ error: "Código, descrição e unidade são obrigatórios." }, { status: 400 });
  }

  try {
    const { url, anonKey } = getSupabaseConfig();
    const companyId = await getCompanyId(url, anonKey, accessToken);

    if (!companyId) {
      return NextResponse.json({ error: "Usuário sem empresa vinculada." }, { status: 403 });
    }

    const profile = await getProfile(url, anonKey, accessToken);
    if (!profile || !hasPermission(profile.profile.role, "materials:write")) {
      return NextResponse.json({ error: "Seu perfil não pode cadastrar materiais." }, { status: 403 });
    }

    const response = await fetch(`${url}/rest/v1/materials`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        company_id: companyId,
        code: body.code.trim(),
        name: body.name.trim(),
        unit: body.unit.trim().toUpperCase(),
        barcode: body.barcode?.trim() || null,
        technical_description: body.technicalDescription?.trim() || null,
        minimum_stock: Math.max(0, Number(body.minimumStock ?? 0)),
        maximum_stock: body.maximumStock ? Math.max(0, Number(body.maximumStock)) : null,
        reorder_point: Math.max(0, Number(body.reorderPoint ?? body.minimumStock ?? 0)),
        average_cost: Math.max(0, Number(body.averageCost ?? 0)),
      }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível cadastrar o material." }, { status: response.status });
    }

    return NextResponse.json({ material: (await response.json())[0] }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}
