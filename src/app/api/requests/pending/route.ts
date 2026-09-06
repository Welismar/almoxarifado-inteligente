import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function context() {
  const cookieStore = await cookies();
  return {
    accessToken: cookieStore.get("stockwise-access-token")?.value,
    url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export async function GET() {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const response = await fetch(`${url}/rest/v1/material_requests?select=id,project_id,priority,needed_at,front,service,cost_center,created_at,material_request_items(id,requested_quantity,materials(code,name,unit))&status=eq.pending&order=created_at.asc`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível carregar as requisições." }, { status: response.status });
  return NextResponse.json({ requests: await response.json() });
}

export async function PATCH(request: Request) {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const body = (await request.json()) as { requestId?: string; approvedQuantity?: number };
  if (!body.requestId) return NextResponse.json({ error: "Requisição obrigatória." }, { status: 400 });

  const response = await fetch(`${url}/rest/v1/rpc/approve_material_request`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_request_id: body.requestId, p_approved_quantity: body.approvedQuantity ?? null }),
  });
  if (!response.ok) return NextResponse.json({ error: "Aprovação recusada." }, { status: response.status });
  return NextResponse.json({ request: await response.json() });
}
