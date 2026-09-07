import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const materialId = new URL(request.url).searchParams.get("materialId");
  const params = new URL(request.url).searchParams;

  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  if (!materialId) return NextResponse.json({ error: "Material obrigatório." }, { status: 400 });

  const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };
  const [materialResponse, movementsResponse] = await Promise.all([
    fetch(`${url}/rest/v1/materials?select=id,code,name,unit,average_cost&id=eq.${materialId}`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/stock_movements?select=id,type,quantity,unit_cost,lot,created_at,responsible_id,service_front,equipment_type,collaborator_name&material_id=eq.${encodeURIComponent(materialId)}${params.get("projectId") ? `&project_id=eq.${encodeURIComponent(params.get("projectId")!)}` : ""}${params.get("lot") ? `&lot=eq.${encodeURIComponent(params.get("lot")!)}` : ""}${params.get("from") ? `&created_at=gte.${encodeURIComponent(`${params.get("from")}T00:00:00.000Z`)}` : ""}${params.get("to") ? `&created_at=lt.${encodeURIComponent(`${params.get("to")}T23:59:59.999Z`)}` : ""}${params.get("type") ? `&type=eq.${encodeURIComponent(params.get("type")!)}` : ""}&order=created_at.asc`, { headers, cache: "no-store" }),
  ]);

  if (!materialResponse.ok || !movementsResponse.ok) return NextResponse.json({ error: "Não foi possível carregar o Kardex." }, { status: 502 });
  const materials = await materialResponse.json();
  if (!materials[0]) return NextResponse.json({ error: "Material não encontrado." }, { status: 404 });
  return NextResponse.json({ material: materials[0], movements: await movementsResponse.json() });
}
