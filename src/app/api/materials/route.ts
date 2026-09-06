import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase não configurado.");
  }

  return { url: url.replace(/\/$/, ""), anonKey };
}

async function getAccessToken() {
  const cookieStore = await cookies();
  return cookieStore.get("stockwise-access-token")?.value;
}

export async function GET() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const { url, anonKey } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/materials?select=id,code,name,unit,minimum_stock,average_cost,status&order=name.asc`, {
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
  };

  if (!body.code?.trim() || !body.name?.trim() || !body.unit?.trim()) {
    return NextResponse.json({ error: "Código, descrição e unidade são obrigatórios." }, { status: 400 });
  }

  try {
    const { url, anonKey } = getSupabaseConfig();
    const response = await fetch(`${url}/rest/v1/materials`, {
      method: "POST",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({
        code: body.code.trim(),
        name: body.name.trim(),
        unit: body.unit.trim().toUpperCase(),
        minimum_stock: Math.max(0, Number(body.minimumStock ?? 0)),
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
