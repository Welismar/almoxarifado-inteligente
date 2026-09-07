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
      `${url}/rest/v1/stock_balances?select=quantity,reserved_quantity,materials(code,name,unit,minimum_stock,status),warehouses(name),locations(code,name)&order=updated_at.desc`,
      {
        headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      return NextResponse.json({ error: "Não foi possível carregar a reposição." }, { status: response.status });
    }

    const balances = (await response.json()) as Array<{
      quantity: number;
      reserved_quantity: number;
      materials: { code: string; name: string; unit: string; minimum_stock: number; status: string } | null;
      warehouses: { name: string } | null;
      locations: { code: string; name: string } | null;
    }>;

    const suggestions = balances
      .filter((balance) => balance.materials && balance.materials.status !== "blocked")
      .map((balance) => {
        const quantity = Number(balance.quantity ?? 0);
        const reserved = Number(balance.reserved_quantity ?? 0);
        const available = Math.max(0, quantity - reserved);
        const minimum = Number(balance.materials?.minimum_stock ?? 0);
        const deficit = Math.max(0, minimum - available);

        return {
          material: balance.materials?.name ?? "Material sem nome",
          code: balance.materials?.code ?? "SEM-COD",
          unit: balance.materials?.unit ?? "UN",
          minimum,
          quantity,
          reserved,
          available,
          deficit,
          warehouse: balance.warehouses?.name ?? "Sem almoxarifado",
          location: balance.locations?.name ?? balance.locations?.code ?? "Sem local",
          suggestedQty: Math.max(deficit, 0) + Math.ceil(deficit * 0.2),
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
