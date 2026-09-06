import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const response = await fetch(`${url}/rest/v1/stock_balances?select=quantity,reserved_quantity,materials(code,name,unit,minimum_stock,average_cost,status),warehouses(name),locations(code,name)&order=updated_at.desc`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) return NextResponse.json({ error: "Não foi possível gerar o relatório." }, { status: response.status });
  return NextResponse.json({ generatedAt: new Date().toISOString(), balances: await response.json() });
}
