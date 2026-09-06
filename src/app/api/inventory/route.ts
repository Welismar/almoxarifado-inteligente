import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const body = (await request.json()) as Record<string, unknown>;
  const quantity = Number(body.physicalQuantity);
  if (!["projectId", "warehouseId", "locationId", "materialId"].every((field) => typeof body[field] === "string" && body[field])) return NextResponse.json({ error: "Obra, almoxarifado, local e material são obrigatórios." }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity < 0) return NextResponse.json({ error: "Quantidade física inválida." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/rpc/record_inventory_count`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_project_id: body.projectId, p_warehouse_id: body.warehouseId, p_location_id: body.locationId, p_material_id: body.materialId, p_physical_quantity: quantity, p_type: body.type || "partial", p_notes: body.notes || null }) });
  if (!response.ok) return NextResponse.json({ error: "Contagem recusada." }, { status: response.status });
  return NextResponse.json({ item: await response.json() }, { status: 201 });
}
