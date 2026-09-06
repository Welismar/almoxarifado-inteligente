import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const headers = { apikey: anonKey, Authorization: `Bearer ${accessToken}` };
  const [projects, warehouses, locations, materials] = await Promise.all([
    fetch(`${url}/rest/v1/projects?select=id,name&order=name.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/warehouses?select=id,name,project_id&order=name.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/locations?select=id,name,code,warehouse_id&order=code.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/rest/v1/materials?select=id,code,name,unit,average_cost&status=eq.active&order=name.asc`, { headers, cache: "no-store" }),
  ]);

  if ([projects, warehouses, locations, materials].some((response) => !response.ok)) {
    return NextResponse.json({ error: "Não foi possível carregar as opções do estoque." }, { status: 502 });
  }

  return NextResponse.json({
    projects: await projects.json(),
    warehouses: await warehouses.json(),
    locations: await locations.json(),
    materials: await materials.json(),
  });
}
