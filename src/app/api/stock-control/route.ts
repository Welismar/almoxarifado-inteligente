import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase não configurado.");
  }

  return { url: url.replace(/\/$/, ""), anonKey };
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const { url, anonKey } = getConfig();

    const response = await fetch(
      `${url}/rest/v1/stock_balances?select=material_id,warehouse_id,location_id,quantity,reserved_quantity,materials(code,name,unit,status),warehouses(name),locations(code,name)&order=quantity.desc`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível carregar reservas e bloqueios." }, { status: response.status });
    }

    const rows = (await response.json()) as Array<{
      material_id: string;
      warehouse_id: string;
      location_id: string | null;
      quantity: number;
      reserved_quantity: number;
      materials: { code: string; name: string; unit: string; status: string } | null;
      warehouses: { name: string } | null;
      locations: { code: string; name: string } | null;
    }>;

    return NextResponse.json({
      entries: rows.map((row) => ({
        material_id: row.material_id,
        warehouse_id: row.warehouse_id,
        location_id: row.location_id,
        quantity: Number(row.quantity ?? 0),
        reserved_quantity: Number(row.reserved_quantity ?? 0),
        available: Math.max(0, Number(row.quantity ?? 0) - Number(row.reserved_quantity ?? 0)),
        material: row.materials ?? { code: "SEM-COD", name: "Material sem nome", unit: "UN", status: "inactive" },
        warehouse: row.warehouses?.name ?? "Sem almoxarifado",
        location: row.locations?.name ?? row.locations?.code ?? "Sem local",
      })),
    });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}

function buildBalanceQuery(materialId: string, warehouseId: string, locationId: string | null) {
  const params = new URLSearchParams({
    select: "quantity,reserved_quantity",
    material_id: `eq.${materialId}`,
    warehouse_id: `eq.${warehouseId}`,
  });

  if (locationId === null) {
    params.set("location_id", "is.null");
  } else {
    params.set("location_id", `eq.${locationId}`);
  }

  return params;
}

export async function PATCH(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;

  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  try {
    const { url, anonKey } = getConfig();
    const body = (await request.json()) as {
      material_id?: string;
      warehouse_id?: string;
      location_id?: string | null;
      reservedQuantity?: number;
      status?: "active" | "blocked" | "quarantine" | "inactive";
    };

    const materialId = body.material_id?.trim();
    const warehouseId = body.warehouse_id?.trim();

    if (body.status && materialId) {
      const response = await fetch(`${url}/rest/v1/materials?id=eq.${materialId}`, {
        method: "PATCH",
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
          Prefer: "return=representation",
        },
        body: JSON.stringify({ status: body.status }),
      });

      if (!response.ok) {
        return NextResponse.json({ error: "Não foi possível alterar o status do material." }, { status: response.status });
      }

      return NextResponse.json({ success: true, status: body.status });
    }

    if (!materialId || !warehouseId) {
      return NextResponse.json({ error: "material_id e warehouse_id são obrigatórios." }, { status: 400 });
    }

    const balanceQuery = buildBalanceQuery(materialId, warehouseId, body.location_id ?? null);
    const currentResponse = await fetch(`${url}/rest/v1/stock_balances?${balanceQuery.toString()}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });

    if (!currentResponse.ok) {
      return NextResponse.json({ error: "Não foi possível localizar o saldo para reservar." }, { status: currentResponse.status });
    }

    const currentRows = (await currentResponse.json()) as Array<{ quantity?: number; reserved_quantity?: number }>;
    const current = currentRows[0];

    if (!current) {
      return NextResponse.json({ error: "Saldo não encontrado para o material e local informados." }, { status: 404 });
    }

    const currentQuantity = Number(current.quantity ?? 0);
    const nextReserved = Math.max(0, Math.min(Number(body.reservedQuantity ?? current.reserved_quantity ?? 0), currentQuantity));

    const updateResponse = await fetch(`${url}/rest/v1/stock_balances?${balanceQuery.toString()}`, {
      method: "PATCH",
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        Prefer: "return=representation",
      },
      body: JSON.stringify({ reserved_quantity: nextReserved }),
    });

    if (!updateResponse.ok) {
      return NextResponse.json({ error: "Não foi possível atualizar a reserva do estoque." }, { status: updateResponse.status });
    }

    return NextResponse.json({
      success: true,
      reserved_quantity: nextReserved,
      available: Math.max(0, currentQuantity - nextReserved),
    });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}
