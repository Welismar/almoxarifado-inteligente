import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function context() {
  const cookieStore = await cookies();
  return { accessToken: cookieStore.get("stockwise-access-token")?.value, url: process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, ""), anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY };
}

async function companyId(url: string, anonKey: string, accessToken: string) {
  const userResponse = await fetch(`${url}/auth/v1/user`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { id?: string };
  if (!user.id) return null;
  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=company_id&id=eq.${user.id}`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!profileResponse.ok) return null;
  const profiles = (await profileResponse.json()) as Array<{ company_id: string }>;
  return profiles[0]?.company_id ?? null;
}

export async function GET() {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const response = await fetch(`${url}/rest/v1/suppliers?select=id,legal_name,trade_name,document,email,phone,created_at&order=legal_name.asc`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível carregar os fornecedores." }, { status: response.status });
  return NextResponse.json({ suppliers: await response.json() });
}

export async function POST(request: Request) {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const body = (await request.json()) as { legalName?: string; tradeName?: string; document?: string; email?: string; phone?: string };
  if (!body.legalName?.trim()) return NextResponse.json({ error: "Razão social é obrigatória." }, { status: 400 });
  const id = await companyId(url, anonKey, accessToken);
  if (!id) return NextResponse.json({ error: "Usuário sem empresa vinculada." }, { status: 403 });
  const response = await fetch(`${url}/rest/v1/suppliers`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", Prefer: "return=representation" }, body: JSON.stringify({ company_id: id, legal_name: body.legalName.trim(), trade_name: body.tradeName?.trim() || null, document: body.document?.trim() || null, email: body.email?.trim() || null, phone: body.phone?.trim() || null }) });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível cadastrar o fornecedor." }, { status: response.status });
  return NextResponse.json({ supplier: (await response.json())[0] }, { status: 201 });
}
