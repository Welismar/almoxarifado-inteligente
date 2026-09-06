import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const params = new URL(request.url).searchParams;

  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const filters = ["select=type,quantity,unit_cost,created_at,materials(code,name,unit),projects(name)", "type=in.(issue,loss)", "order=created_at.desc"];
  if (params.get("projectId")) filters.push(`project_id=eq.${encodeURIComponent(params.get("projectId")!)}`);
  if (params.get("from")) filters.push(`created_at=gte.${encodeURIComponent(`${params.get("from")}T00:00:00.000Z`)}`);
  if (params.get("to")) filters.push(`created_at=lt.${encodeURIComponent(`${params.get("to")}T23:59:59.999Z`)}`);

  const response = await fetch(`${url}/rest/v1/stock_movements?${filters.join("&")}`, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível gerar o relatório de consumo." }, { status: response.status });
  return NextResponse.json({ movements: await response.json() });
}
