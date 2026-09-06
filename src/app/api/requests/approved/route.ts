import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function context() {
  const cookieStore = await cookies();
  return { accessToken: cookieStore.get("stockwise-access-token")?.value, url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

export async function GET() {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const response = await fetch(`${url}/rest/v1/material_requests?select=id,project_id,priority,front,service,material_request_items(id,approved_quantity,issued_quantity,materials(code,name,unit))&status=eq.approved&order=created_at.asc`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível carregar as requisições aprovadas." }, { status: response.status });
  return NextResponse.json({ requests: await response.json() });
}

export async function PATCH(request: Request) {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const body = (await request.json()) as { requestId?: string; warehouseId?: string; locationId?: string };
  if (!body.requestId || !body.warehouseId || !body.locationId) return NextResponse.json({ error: "Requisição, almoxarifado e local são obrigatórios." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/rpc/issue_material_request`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_request_id: body.requestId, p_warehouse_id: body.warehouseId, p_location_id: body.locationId }) });
  if (!response.ok) return NextResponse.json({ error: "Separação recusada pelo estoque." }, { status: response.status });
  return NextResponse.json({ request: await response.json() });
}
