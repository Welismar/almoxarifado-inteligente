import { cookies } from "next/headers";
import { NextResponse } from "next/server";

type InventoryItemRow = {
  id: string;
  inventory_id: string;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
  notes: string | null;
  materials?: { code?: string; name?: string; unit?: string } | null;
  locations?: { code?: string; name?: string } | null;
  inventories?: {
    id?: string;
    status?: string;
    projects?: { name?: string } | null;
    warehouses?: { name?: string } | null;
  } | null;
};

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

  const select = "id,inventory_id,system_quantity,physical_quantity,difference,notes,materials(code,name,unit),locations(code,name),inventories(id,status,projects(name),warehouses(name))";
  const response = await fetch(`${url}/rest/v1/inventory_items?select=${encodeURIComponent(select)}&difference=neq.0`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!response.ok) return NextResponse.json({ error: "Não foi possível carregar as divergências do inventário." }, { status: response.status });

  const items = (await response.json()) as InventoryItemRow[];
  return NextResponse.json({ items: items.filter((item) => item.inventories?.status !== "approved") });
}

export async function POST(request: Request) {
  const { accessToken, url, anonKey } = await context();
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

export async function PATCH(request: Request) {
  const { accessToken, url, anonKey } = await context();
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as { itemId?: string; note?: string };
  if (!body.itemId) return NextResponse.json({ error: "Item do inventário obrigatório." }, { status: 400 });

  const response = await fetch(`${url}/rest/v1/rpc/approve_inventory_difference`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({ p_inventory_item_id: body.itemId, p_note: body.note ?? null }),
  });

  if (!response.ok) {
    const result = (await response.json().catch(() => ({}))) as { message?: string; error?: string };
    return NextResponse.json({ error: result.message ?? result.error ?? "Aprovação recusada." }, { status: response.status });
  }

  return NextResponse.json({ item: await response.json() }, { status: 200 });
}
