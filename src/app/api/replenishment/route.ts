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

    const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
    const [response, movementsResponse] = await Promise.all([
      fetch(
        `${url}/rest/v1/stock_balances?select=material_id,quantity,reserved_quantity,materials(code,name,unit,minimum_stock,reorder_point,maximum_stock,status),warehouses(name,project_id),locations(code,name)&order=updated_at.desc`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
      ),
      fetch(
        `${url}/rest/v1/stock_movements?select=material_id,type,quantity,created_at&created_at=gte.${since}&type=in.(issue,loss)`,
        { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" },
      ),
    ]);

    if (!response.ok || !movementsResponse.ok) {
      return NextResponse.json({ error: "Não foi possível carregar a reposição." }, { status: response.status });
    }

    const movements = (await movementsResponse.json()) as Array<{ material_id: string; quantity: number }>;
    const consumptionByMaterial = movements.reduce<Record<string, number>>((result, movement) => {
      result[movement.material_id] = (result[movement.material_id] ?? 0) + Number(movement.quantity ?? 0);
      return result;
    }, {});

    const balances = (await response.json()) as Array<{
      material_id: string;
      quantity: number;
      reserved_quantity: number;
      materials: { code: string; name: string; unit: string; minimum_stock: number; reorder_point: number; maximum_stock: number | null; status: string } | null;
      warehouses: { name: string; project_id: string } | null;
      locations: { code: string; name: string } | null;
    }>;

    const suggestions = balances
      .filter((balance) => balance.materials && balance.materials.status !== "blocked")
      .map((balance) => {
        const quantity = Number(balance.quantity ?? 0);
        const reserved = Number(balance.reserved_quantity ?? 0);
        const available = Math.max(0, quantity - reserved);
        const minimum = Number(balance.materials?.minimum_stock ?? 0);
        const reorderPoint = Number(balance.materials?.reorder_point ?? minimum);
        const consumption90d = consumptionByMaterial[balance.material_id] ?? 0;
        const averageDailyConsumption = consumption90d / 90;
        const targetStock = Number(balance.materials?.maximum_stock ?? Math.max(minimum, reorderPoint) + averageDailyConsumption * 30);
        const deficit = Math.max(0, minimum - available);

        return {
          materialId: balance.material_id,
          projectId: balance.warehouses?.project_id ?? "",
          material: balance.materials?.name ?? "Material sem nome",
          code: balance.materials?.code ?? "SEM-COD",
          unit: balance.materials?.unit ?? "UN",
          minimum,
          quantity,
          reserved,
          available,
          deficit,
          consumption90d,
          averageDailyConsumption: Math.round(averageDailyConsumption * 100) / 100,
          coverageDays: averageDailyConsumption > 0 ? Math.round((available / averageDailyConsumption) * 10) / 10 : null,
          targetStock: Math.ceil(targetStock),
          warehouse: balance.warehouses?.name ?? "Sem almoxarifado",
          location: balance.locations?.name ?? balance.locations?.code ?? "Sem local",
          suggestedQty: Math.max(deficit, Math.ceil(targetStock - available)),
          priority: deficit > 0 ? (deficit >= minimum ? "Crítica" : "Atenção") : "Normal",
        };
      })
      .filter((item) => item.deficit > 0)
      .sort((a, b) => b.deficit - a.deficit);

    return NextResponse.json({
      generatedAt: new Date().toISOString(),
      total: suggestions.length,
      suggestions,
      summary: {
        totalDeficit: suggestions.reduce((sum, row) => sum + row.deficit, 0),
        totalSuggested: suggestions.reduce((sum, row) => sum + row.suggestedQty, 0),
      },
    });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}
