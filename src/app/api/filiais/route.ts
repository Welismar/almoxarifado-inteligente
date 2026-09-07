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

    const [projectsResponse, warehousesResponse, locationsResponse, balancesResponse] = await Promise.all([
      fetch(`${url}/rest/v1/projects?select=id,name,code,status&order=name.asc`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/warehouses?select=id,name,code,project_id&order=name.asc`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/locations?select=id,name,code,warehouse_id&order=name.asc`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
      fetch(`${url}/rest/v1/stock_balances?select=quantity,reserved_quantity,warehouse_id`, {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      }),
    ]);

    if (!projectsResponse.ok || !warehousesResponse.ok || !locationsResponse.ok || !balancesResponse.ok) {
      return NextResponse.json({ error: "Não foi possível carregar a visão de filiais." }, { status: 500 });
    }

    const projects = (await projectsResponse.json()) as Array<{ id: string; name: string; code?: string | null; status?: string | null }>;
    const warehouses = (await warehousesResponse.json()) as Array<{ id: string; name: string; code?: string | null; project_id: string }>;
    const locations = (await locationsResponse.json()) as Array<{ id: string; name: string; code?: string | null; warehouse_id: string }>;
    const balances = (await balancesResponse.json()) as Array<{ quantity: number; reserved_quantity?: number; warehouse_id: string }>;

    const warehouseMap = new Map<string, Array<{ id: string; name: string; code?: string | null }>>();
    const locationMap = new Map<string, number>();
    const warehouseTotals = new Map<string, { quantity: number; reserved: number }>();

    warehouses.forEach((warehouse) => {
      const projectWarehouses = warehouseMap.get(warehouse.project_id) ?? [];
      projectWarehouses.push({ id: warehouse.id, name: warehouse.name, code: warehouse.code });
      warehouseMap.set(warehouse.project_id, projectWarehouses);
      warehouseTotals.set(warehouse.id, { quantity: 0, reserved: 0 });
    });

    locations.forEach((location) => {
      const current = locationMap.get(location.warehouse_id) ?? 0;
      locationMap.set(location.warehouse_id, current + 1);
    });

    balances.forEach((balance) => {
      const warehouse = warehouses.find((item) => item.id === balance.warehouse_id);
      if (!warehouse) return;
      const current = warehouseTotals.get(balance.warehouse_id) ?? { quantity: 0, reserved: 0 };
      current.quantity += Number(balance.quantity ?? 0);
      current.reserved += Number(balance.reserved_quantity ?? 0);
      warehouseTotals.set(balance.warehouse_id, current);
    });

    const sites = projects.map((project) => {
      const projectWarehouses = warehouseMap.get(project.id) ?? [];
      const warehouseCount = projectWarehouses.length;
      const locationCount = projectWarehouses.reduce((sum, warehouse) => sum + (locationMap.get(warehouse.id) ?? 0), 0);
      const totals = projectWarehouses.reduce(
        (sum, warehouse) => {
          const values = warehouseTotals.get(warehouse.id) ?? { quantity: 0, reserved: 0 };
          return { quantity: sum.quantity + values.quantity, reserved: sum.reserved + values.reserved };
        },
        { quantity: 0, reserved: 0 },
      );

      return {
        id: project.id,
        name: project.name,
        code: project.code ?? "SEM-CÓDIGO",
        status: project.status ?? "active",
        warehouses: warehouseCount,
        locations: locationCount,
        totalQuantity: totals.quantity,
        totalReserved: totals.reserved,
        available: Math.max(0, totals.quantity - totals.reserved),
      };
    });

    return NextResponse.json({ sites });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}
