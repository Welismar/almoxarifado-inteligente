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

    const [materialsResponse, balancesResponse, requestsResponse, movementsResponse] = await Promise.all([
      fetch(`${url}/rest/v1/materials?select=id,code,name,minimum_stock,average_cost,status,company_id`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/stock_balances?select=quantity,reserved_quantity,materials(code,name,minimum_stock,average_cost,status),warehouses(name),locations(code,name)`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/material_requests?select=id,status,priority,created_at,project_id`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/stock_movements?select=id,type,quantity,created_at&order=created_at.desc&limit=200`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    ]);

    if (!materialsResponse.ok || !balancesResponse.ok || !requestsResponse.ok || !movementsResponse.ok) {
      return NextResponse.json({ error: "Não foi possível carregar o dashboard executivo." }, { status: 500 });
    }

    const materials = (await materialsResponse.json()) as Array<{
      id: string;
      code: string;
      name: string;
      minimum_stock: number;
      average_cost: number;
      status: string;
    }>;

    const balances = (await balancesResponse.json()) as Array<{
      quantity: number;
      reserved_quantity: number;
      materials: { code: string; name: string; minimum_stock: number; average_cost: number; status: string } | null;
      warehouses: { name: string } | null;
      locations: { code: string; name: string } | null;
    }>;

    const requests = (await requestsResponse.json()) as Array<{
      id: string;
      status: string;
      priority: string;
      created_at: string;
      project_id: string | null;
    }>;

    const movements = (await movementsResponse.json()) as Array<{
      id: string;
      type: string;
      quantity: number;
      created_at: string;
    }>;

    const activeItems = materials.filter((material) => material.status === "active").length;
    const blockedItems = materials.filter((material) => material.status === "blocked").length;

    const criticalRows = balances.filter((balance) => {
      const minimum = Number(balance.materials?.minimum_stock ?? 0);
      const quantity = Number(balance.quantity ?? 0);
      return balance.materials && quantity <= minimum;
    });

    const totalStockValue = balances.reduce((sum, balance) => {
      const quantity = Number(balance.quantity ?? 0);
      const averageCost = Number(balance.materials?.average_cost ?? 0);
      return sum + quantity * averageCost;
    }, 0);

    const reservedStock = balances.reduce((sum, balance) => sum + Number(balance.reserved_quantity ?? 0), 0);
    const openRequests = requests.filter((request) => ["pending", "approved", "separating"].includes(request.status)).length;

    const recentMovements = movements.filter((movement) => {
      const date = new Date(movement.created_at);
      const days = (Date.now() - date.getTime()) / 86400000;
      return days <= 7;
    });

    const issueVolume = recentMovements
      .filter((movement) => movement.type === "issue")
      .reduce((sum, movement) => sum + Number(movement.quantity ?? 0), 0);

    const forecastCandidates = criticalRows
      .slice(0, 5)
      .map((balance) => ({
        material: balance.materials?.name ?? "Material sem nome",
        code: balance.materials?.code ?? "SEM-COD",
        quantity: Number(balance.quantity ?? 0),
        minimum: Number(balance.materials?.minimum_stock ?? 0),
        warehouse: balance.warehouses?.name ?? "Sem almoxarifado",
        status: Number(balance.quantity ?? 0) <= Number(balance.materials?.minimum_stock ?? 0) ? "Crítico" : "Atenção",
      }));

    return NextResponse.json({
      metrics: {
        total_items: materials.length,
        active_items: activeItems,
        blocked_items: blockedItems,
        critical_items: criticalRows.length,
        open_requests: openRequests,
        reserved_stock: reservedStock,
        stock_value: totalStockValue,
        issue_volume_7d: issueVolume,
      },
      forecastCandidates,
      requests: requests.slice(0, 6).map((request) => ({
        id: request.id,
        status: request.status,
        priority: request.priority,
        created_at: request.created_at,
      })),
      lastMovements: recentMovements.slice(0, 6).map((movement) => ({
        id: movement.id,
        type: movement.type,
        quantity: movement.quantity,
        created_at: movement.created_at,
      })),
    });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}
