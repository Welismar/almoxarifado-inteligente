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
    `${url}/rest/v1/audit_log?select=id,entity_type,action,reason,created_at,actor:actor_id(full_name,role),old_values,new_values&order=created_at.desc&limit=50`,
    {
      headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return NextResponse.json({ error: "Não foi possível carregar a auditoria." }, { status: response.status });
  }

  const entries = (await response.json()) as Array<{
    id: string;
    entity_type: string;
    action: string;
    reason?: string | null;
    created_at: string;
    actor?: { full_name?: string; role?: string } | null;
    old_values?: Record<string, unknown> | null;
    new_values?: Record<string, unknown> | null;
  }>;

  return NextResponse.json({ entries });
}
