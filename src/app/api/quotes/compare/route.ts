import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function context() { const cookieStore = await cookies(); return { accessToken: cookieStore.get("stockwise-access-token")?.value, url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }; }

export async function GET() {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const response = await fetch(`${url}/rest/v1/purchase_quotes?select=id,purchase_request_id,supplier_id,status,freight,delivery_days,payment_terms,created_at,suppliers(legal_name,trade_name),purchase_quote_items(quantity,unit_price,materials(code,name,unit))&status=eq.submitted&order=created_at.asc`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível carregar as cotações." }, { status: response.status });
  return NextResponse.json({ quotes: await response.json() });
}

export async function PATCH(request: Request) {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const body = (await request.json()) as { quoteId?: string };
  if (!body.quoteId) return NextResponse.json({ error: "Cotação obrigatória." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/rpc/select_purchase_quote`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_quote_id: body.quoteId }) });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível criar o pedido de compra." }, { status: response.status });
  return NextResponse.json({ order: await response.json() });
}
