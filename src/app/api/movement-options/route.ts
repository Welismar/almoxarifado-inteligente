import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error("Supabase não configurado.");
  }

  return { url: url.replace(/\/$/, ""), anonKey };
}

async function getCurrentCompanyId(url: string, accessToken: string, anonKey: string) {
  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { id?: string };
  if (!user.id) return null;

  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=company_id&id=eq.${user.id}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!profileResponse.ok) return null;
  const profiles = (await profileResponse.json()) as Array<{ company_id?: string }>;
  return profiles[0]?.company_id ?? null;
}

async function fetchWithCompanyFallback(
  url: string,
  accessToken: string,
  anonKey: string,
  table: string,
  select: string,
  order: string,
  companyId: string | null,
  extraFilters = "",
) {
  const baseQuery = `${url}/rest/v1/${table}?select=${select}${companyId ? `&company_id=eq.${companyId}` : ""}${extraFilters ? `&${extraFilters}` : ""}&order=${order}`;
  const response = await fetch(baseQuery, { headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` }, cache: "no-store" });

  if (companyId && response.status === 400) {
    const fallback = await fetch(`${url}/rest/v1/${table}?select=${select}${extraFilters ? `&${extraFilters}` : ""}&order=${order}`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    });
    return fallback;
  }

  return response;
}

export async function GET() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;

  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });

  try {
    const { url, anonKey } = getSupabaseConfig();
    const companyId = await getCurrentCompanyId(url, accessToken, anonKey);

    const [projects, warehouses, locations, materials, people] = await Promise.all([
      fetchWithCompanyFallback(url, accessToken, anonKey, "projects", "id,name", "name.asc", companyId),
      fetchWithCompanyFallback(url, accessToken, anonKey, "warehouses", "id,name,project_id", "name.asc", companyId),
      fetchWithCompanyFallback(url, accessToken, anonKey, "locations", "id,name,code,warehouse_id", "code.asc", companyId),
      fetchWithCompanyFallback(url, accessToken, anonKey, "materials", "id,code,name,unit,average_cost", "name.asc", companyId, "status=eq.active"),
      fetchWithCompanyFallback(url, accessToken, anonKey, "profiles", "id,full_name,role", "full_name.asc", companyId),
    ]);

    if ([projects, warehouses, locations, materials, people].some((response) => !response.ok)) {
      return NextResponse.json({ error: "Não foi possível carregar as opções do estoque." }, { status: 502 });
    }

    return NextResponse.json({
      projects: await projects.json(),
      warehouses: await warehouses.json(),
      locations: await locations.json(),
      materials: await materials.json(),
      people: await people.json(),
    });
  } catch {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  }
}
