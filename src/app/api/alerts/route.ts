import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  if (!url || !anonKey) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }

  const response = await fetch(
    `${url}/rest/v1/stock_balances?select=quantity,reserved_quantity,materials(code,name,unit,minimum_stock,status),warehouses(name),locations(code,name)&order=updated_at.desc`,
    {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Não foi possível carregar os alertas." }, { status: response.status });
  }

  const balances = (await response.json()) as Array<{
    quantity: number;
    reserved_quantity: number;
    materials: { code: string; name: string; unit: string; minimum_stock: number; status: string } | null;
    warehouses: { name: string } | null;
    locations: { code: string; name: string } | null;
  }>;

  const alerts = balances
    .filter((balance) => {
      const minimum = Number(balance.materials?.minimum_stock ?? 0);
      const quantity = Number(balance.quantity ?? 0);
      return balance.materials && quantity <= minimum;
    })
    .map((balance) => {
      const minimum = Number(balance.materials?.minimum_stock ?? 0);
      const quantity = Number(balance.quantity ?? 0);
      const available = Math.max(0, quantity - Number(balance.reserved_quantity ?? 0));

      return {
        material: balance.materials?.name ?? "Material sem nome",
        code: balance.materials?.code ?? "SEM-COD",
        unit: balance.materials?.unit ?? "un",
        quantity,
        available,
        minimum,
        warehouse: balance.warehouses?.name ?? "Sem almoxarifado",
        location: balance.locations?.name ?? balance.locations?.code ?? "Sem local",
        status: quantity <= minimum ? "critical" : "attention",
      };
    });

  return NextResponse.json({
    generatedAt: new Date().toISOString(),
    total: alerts.length,
    alerts,
  });
}
