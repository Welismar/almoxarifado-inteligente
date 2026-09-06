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
  const quantity = Number(body.quantity);
  const priority = typeof body.priority === "string" ? body.priority : "normal";

  if (!["projectId", "materialId"].every((field) => typeof body[field] === "string" && body[field])) {
    return NextResponse.json({ error: "Obra e material são obrigatórios." }, { status: 400 });
  }
  if (!Number.isFinite(quantity) || quantity <= 0) return NextResponse.json({ error: "A quantidade deve ser maior que zero." }, { status: 400 });
  if (!priorities.has(priority)) return NextResponse.json({ error: "Prioridade inválida." }, { status: 400 });

  const response = await fetch(`${url}/rest/v1/rpc/create_material_request`, {
    method: "POST",
    headers: { apikey: anonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_project_id: body.projectId,
      p_material_id: body.materialId,
      p_requested_quantity: quantity,
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
