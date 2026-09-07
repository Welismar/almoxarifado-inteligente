import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfile } from "@/lib/permissions";

const roles = ["admin", "almoxarife", "encarregado", "mestre", "engenheiro", "compras", "qualidade", "financeiro", "gerente", "diretoria", "manutencao"] as const;

function config() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return { url, anonKey, serviceRoleKey };
}

async function currentAdmin() {
  const accessToken = (await cookies()).get("stockwise-access-token")?.value;
  const { url, anonKey } = config();
  if (!accessToken || !url || !anonKey) return null;
  const profile = await getProfile(url, anonKey, accessToken);
  return profile?.profile.role === "admin" ? { accessToken, profile } : null;
}

export async function GET() {
  const admin = await currentAdmin();
  const { url, serviceRoleKey } = config();
  if (!admin) return NextResponse.json({ error: "Apenas administradores podem gerenciar usuários." }, { status: 403 });
  if (!url || !serviceRoleKey) return NextResponse.json({ error: "Administração de usuários não configurada." }, { status: 500 });

  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}` };
  const [profilesResponse, usersResponse] = await Promise.all([
    fetch(`${url}/rest/v1/profiles?select=id,company_id,full_name,role,created_at&company_id=eq.${admin.profile.profile.company_id}&order=full_name.asc`, { headers, cache: "no-store" }),
    fetch(`${url}/auth/v1/admin/users?per_page=1000`, { headers, cache: "no-store" }),
  ]);

  if (!profilesResponse.ok || !usersResponse.ok) return NextResponse.json({ error: "Não foi possível carregar os usuários." }, { status: 502 });
  const profiles = (await profilesResponse.json()) as Array<{ id: string; company_id: string; full_name: string; role: string; created_at: string }>;
  const users = (await usersResponse.json()) as { users?: Array<{ id: string; email?: string; email_confirmed_at?: string | null; last_sign_in_at?: string | null }> };
  const usersById = new Map((users.users ?? []).map((user) => [user.id, user]));

  return NextResponse.json({
    users: profiles.map((profile) => ({ ...profile, email: usersById.get(profile.id)?.email ?? "", confirmed: Boolean(usersById.get(profile.id)?.email_confirmed_at), lastSignInAt: usersById.get(profile.id)?.last_sign_in_at ?? null })),
    roles,
  });
}

export async function PATCH(request: Request) {
  const admin = await currentAdmin();
  const { url, serviceRoleKey } = config();
  if (!admin) return NextResponse.json({ error: "Apenas administradores podem alterar usuários." }, { status: 403 });
  if (!url || !serviceRoleKey) return NextResponse.json({ error: "Administração de usuários não configurada." }, { status: 500 });

  const body = (await request.json()) as { userId?: string; role?: string; fullName?: string };
  if (!body.userId || !body.role || !roles.includes(body.role as (typeof roles)[number])) return NextResponse.json({ error: "Usuário e perfil válido são obrigatórios." }, { status: 400 });
  if (body.userId === admin.profile.profile.id && body.role !== "admin") return NextResponse.json({ error: "O administrador atual não pode remover o próprio acesso." }, { status: 400 });

  const headers = { apikey: serviceRoleKey, Authorization: `Bearer ${serviceRoleKey}`, "Content-Type": "application/json" };
  const targetResponse = await fetch(`${url}/rest/v1/profiles?select=id,company_id&id=eq.${body.userId}&company_id=eq.${admin.profile.profile.company_id}`, { headers, cache: "no-store" });
  const targets = targetResponse.ok ? (await targetResponse.json()) as Array<{ id: string }> : [];
  if (!targetResponse.ok || !targets[0]) return NextResponse.json({ error: "Usuário não pertence à sua empresa." }, { status: 404 });

  const response = await fetch(`${url}/rest/v1/profiles?id=eq.${body.userId}&company_id=eq.${admin.profile.profile.company_id}`, {
    method: "PATCH",
    headers: { ...headers, Prefer: "return=representation" },
    body: JSON.stringify({ role: body.role, ...(body.fullName?.trim() ? { full_name: body.fullName.trim() } : {}) }),
  });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível atualizar o usuário." }, { status: response.status });
  return NextResponse.json({ user: (await response.json())[0] });
}
