export const permissions = [
  "purchases:create",
  "purchases:approve",
  "materials:write",
  "integration:write",
  "approvals:review",
  "inventory:write",
] as const;

export type Permission = (typeof permissions)[number];
export type UserRole = "admin" | "almoxarife" | "encarregado" | "mestre" | "engenheiro" | "compras" | "qualidade" | "financeiro" | "gerente" | "diretoria" | "manutencao";

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [...permissions],
  almoxarife: ["materials:write", "inventory:write"],
  encarregado: ["purchases:create", "inventory:write"],
  mestre: ["purchases:create", "inventory:write"],
  engenheiro: ["purchases:create", "approvals:review", "inventory:write"],
  compras: ["purchases:create", "purchases:approve", "materials:write", "integration:write"],
  qualidade: [],
  financeiro: ["approvals:review"],
  gerente: ["purchases:create", "purchases:approve", "approvals:review"],
  diretoria: ["purchases:create", "purchases:approve", "approvals:review"],
  manutencao: ["inventory:write"],
};

export function getPermissions(role: string | null | undefined) {
  return role && role in rolePermissions ? rolePermissions[role as UserRole] : [];
}

export function hasPermission(role: string | null | undefined, permission: Permission) {
  return getPermissions(role).includes(permission);
}

export async function getProfile(url: string, anonKey: string, accessToken: string) {
  const userResponse = await fetch(`${url}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!userResponse.ok) return null;
  const user = (await userResponse.json()) as { id?: string; email?: string; user_metadata?: { full_name?: string } };
  if (!user.id) return null;

  const profileResponse = await fetch(`${url}/rest/v1/profiles?select=id,company_id,full_name,role&id=eq.${user.id}`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}` },
    cache: "no-store",
  });

  if (!profileResponse.ok) return null;
  const profiles = (await profileResponse.json()) as Array<{ id: string; company_id: string; full_name: string; role: UserRole }>;
  const profile = profiles[0];
  if (!profile) return null;

  return {
    user,
    profile,
    permissions: getPermissions(profile.role),
  };
}
