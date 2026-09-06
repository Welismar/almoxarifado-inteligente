import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const movementTypes = new Set(["receipt", "issue", "return", "transfer", "adjustment", "loss", "inventory"]);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as Record<string, unknown>;
  const requiredIds = ["projectId", "warehouseId", "materialId", "locationId"];
  if (requiredIds.some((field) => typeof body[field] !== "string" || !body[field])) {
    return NextResponse.json({ error: "Obra, almoxarifado, material e localização são obrigatórios." }, { status: 400 });
  }

  if (typeof body.type !== "string" || !movementTypes.has(body.type)) {
    return NextResponse.json({ error: "Tipo de movimentação inválido." }, { status: 400 });
  }

  const quantity = Number(body.quantity);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "A quantidade deve ser maior que zero." }, { status: 400 });
  }

  const response = await fetch(`${url}/rest/v1/rpc/record_stock_movement`, {
    method: "POST",
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      p_project_id: body.projectId,
      p_warehouse_id: body.warehouseId,
      p_material_id: body.materialId,
      p_location_id: body.locationId,
      p_type: body.type,
      p_quantity: quantity,
      p_unit_cost: Number(body.unitCost ?? 0),
      p_lot: body.lot ?? null,
      p_expiry_date: body.expiryDate ?? null,
      p_reference_type: body.referenceType ?? null,
      p_reference_id: body.referenceId ?? null,
      p_notes: body.notes ?? null,
    }),
  });

  if (!response.ok) {
    return NextResponse.json({ error: "Movimentação recusada pelo estoque." }, { status: response.status });
  }

  return NextResponse.json({ movement: await response.json() }, { status: 201 });
}
