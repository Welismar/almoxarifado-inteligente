import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getProfile, hasPermission } from "@/lib/permissions";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });
  const profile = await getProfile(url, anonKey, accessToken);
  if (!profile) return NextResponse.json({ error: "Usuário sem perfil vinculado." }, { status: 403 });
  if (!hasPermission(profile.profile.role, "purchases:create")) return NextResponse.json({ error: "Seu perfil não pode criar solicitações de compra." }, { status: 403 });
  const body = (await request.json()) as Record<string, unknown>;
  const quantity = Number(body.quantity);
  if (!["projectId", "materialId"].every((field) => typeof body[field] === "string" && body[field])) return NextResponse.json({ error: "Obra e material são obrigatórios." }, { status: 400 });
  if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: "Quantidade inválida." }, { status: 400 });
  const response = await fetch(`${url}/rest/v1/rpc/create_purchase_request`, { method: "POST", headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ p_project_id: body.projectId, p_material_id: body.materialId, p_requested_quantity: quantity, p_priority: body.priority || "normal", p_needed_at: body.neededAt || null, p_estimated_unit_cost: Number(body.estimatedUnitCost || 0), p_notes: body.notes || null }) });
  if (!response.ok) return NextResponse.json({ error: "Não foi possível criar a solicitação de compra." }, { status: response.status });
  return NextResponse.json({ purchase: await response.json() }, { status: 201 });
}
