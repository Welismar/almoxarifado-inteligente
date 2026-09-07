import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfile, hasPermission } from "@/lib/permissions";

async function context() { const cookieStore = await cookies(); return { accessToken: cookieStore.get("stockwise-access-token")?.value, url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY }; }

export async function GET() {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };
  const [requests, suppliers] = await Promise.all([
    fetch(`${url}/rest/v1/purchase_requests?select=id,status,project_id,purchase_request_items(requested_quantity,materials(code,name,unit))&status=in.(pending,quoted)&order=created_at.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/suppliers?select=id,legal_name,trade_name&order=legal_name.asc`, { headers, cache: "no-store" }),
  ]);
  if (!requests.ok || !suppliers.ok) return NextResponse.json({ error: "Não foi possível carregar as opções de cotação." }, { status: 502 });
  return NextResponse.json({ requests: await requests.json(), suppliers: await suppliers.json() });
}

export async function POST(request: Request) {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const profile = await getProfile(url, anonKey, accessToken);
  if (!profile || !hasPermission(profile.profile.role, "purchases:create")) return NextResponse.json({ error: "Seu perfil não pode registrar cotações." }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>;
  const price = Number(body.unitPrice);
  if (!["requestId", "supplierId"].every((field) => typeof body[field] === "string" && body[field])) return NextResponse.json({ error: "Solicitação e fornecedor são obrigatórios." }, { status: 400 });
  if (!Number.isFinite(price) || price < 0) return NextResponse.json({ error: "Preço unitário inválido." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/rpc/create_purchase_quote`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_purchase_request_id: body.requestId, p_supplier_id: body.supplierId, p_unit_price: price, p_freight: Number(body.freight || 0), p_delivery_days: body.deliveryDays ? Number(body.deliveryDays) : null, p_payment_terms: body.paymentTerms || null, p_notes: body.notes || null }) });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível registrar a cotação." }, { status: response.status });
  return NextResponse.json({ quote: await response.json() }, { status: 201 });
}
