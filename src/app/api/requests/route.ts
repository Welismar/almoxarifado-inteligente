import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const priorities = new Set(["urgent", "normal", "scheduled"]);

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!accessToken) return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  if (!url || !anonKey) return NextResponse.json({ error: "Supabase não configurado." }, { status: 500 });

  const body = (await request.json()) as Record<string, unknown>;
  const rawItems = Array.isArray(body.items) ? body.items : [{ materialId: body.materialId, quantity: body.quantity, unit: body.unit }];
  const priority = typeof body.priority === "string" ? body.priority : "normal";

  if (typeof body.projectId !== "string" || !body.projectId) {
    return NextResponse.json({ error: "Obra é obrigatória." }, { status: 400 });
  }
  if (rawItems.length < 1 || rawItems.length > 20) return NextResponse.json({ error: "A requisição deve ter entre 1 e 20 itens." }, { status: 400 });
  if (!priorities.has(priority)) return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });
  const items = rawItems.map((rawItem) => {
    const item = rawItem as Record<string, unknown>;
    return { materialId: item.materialId, quantity: Number(item.quantity), unit: typeof item.unit === "string" ? item.unit.trim().toUpperCase() : "UN" };
  });
  if (items.some((item) => typeof item.materialId !== "string" || !item.materialId || !Number.isFinite(item.quantity) || item.quantity <= 0 || !item.unit)) {
    return NextResponse.json({ error: "Cada item precisa de material, unidade e quantidade válida." }, { status: 400 });
  }

  const response = await fetch(`${url}/rest/v1/rpc/create_material_request_multi`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_project_id: body.projectId,
      p_items: items,
      p_priority: priority,
      p_needed_at: body.neededAt || null,
      p_front: body.front || null,
      p_service: body.service || null,
      p_cost_center: body.costCenter || null,
      p_notes: body.notes || null,
    }),
  });

  if (!response.ok) return NextResponse.json({ error: "Não foi possível criar a requisição." }, { status: response.status });
  return NextResponse.json({ request: await response.json() }, { status: 201 });
}
