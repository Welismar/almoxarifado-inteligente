"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { enqueueOfflineRequest } from "@/lib/offline-queue";

type Project = { id: string; name: string };
type Warehouse = { id: string; name: string; project_id: string };
type Location = { id: string; name: string; code: string; warehouse_id: string };
type Material = { id: string; code: string; name: string; unit: string };
type PendingInventoryItem = {
  id: string;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
  notes: string | null;
  materials?: { code?: string; name?: string; unit?: string } | null;
  locations?: { code?: string; name?: string } | null;
  inventories?: {
    id?: string;
    status?: string;
    projects?: { name?: string } | null;
    warehouses?: { name?: string } | null;
  } | null;
};

const initialForm = {
  projectId: "",
  warehouseId: "",
  locationId: "",
  materialId: "",
  physicalQuantity: "",
  type: "partial",
  notes: "",
};

export default function InventoryPage() {
  const [options, setOptions] = useState<{ projects: Project[]; warehouses: Warehouse[]; locations: Location[]; materials: Material[] }>({
    projects: [],
    warehouses: [],
    locations: [],
    materials: [],
  });
  const [form, setForm] = useState(initialForm);
  const [pendingItems, setPendingItems] = useState<PendingInventoryItem[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  async function loadPendingItems() {
    const response = await fetch("/api/inventory", { cache: "no-store" });
    const result = (await response.json()) as { items?: PendingInventoryItem[]; error?: string };
    if (!response.ok) {
      setError(result.error ?? "Não foi possível carregar as divergências.");
      return;
    }
    setPendingItems(result.items ?? []);
  }

  useEffect(() => {
    fetch("/api/movement-options", { cache: "no-store" })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar as opções.");
        setOptions(result);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));

    void loadPendingItems();
  }, []);

  const warehouses = useMemo(
    () => options.warehouses.filter((item) => item.project_id === form.projectId),
    [options.warehouses, form.projectId],
  );
  const locations = useMemo(
    () => options.locations.filter((item) => item.warehouse_id === form.warehouseId),
    [options.locations, form.warehouseId],
  );

  function update(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "projectId" ? { warehouseId: "", locationId: "" } : {}),
      ...(field === "warehouseId" ? { locationId: "" } : {}),
    }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    const body = { ...form, physicalQuantity: Number(form.physicalQuantity) };

    try {
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = (await response.json()) as { error?: string };
      if (!response.ok) setError(result.error ?? "Contagem recusada.");
      else {
        setMessage("Contagem registrada para revisão.");
        setForm(initialForm);
        await loadPendingItems();
      }
    } catch {
      await enqueueOfflineRequest("/api/inventory", body);
      setMessage("Sem conexão. Contagem salva e será sincronizada quando a internet voltar.");
      setForm(initialForm);
    }

    setSaving(false);
  }

  async function approve(itemId: string) {
    setApprovingId(itemId);
    setError("");
    setMessage("");

    const response = await fetch("/api/inventory", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) setError(result.error ?? "Aprovação recusada.");
    else {
      setMessage("Divergência aprovada e ajuste do estoque registrado.");
      await loadPendingItems();
    }

    setApprovingId(null);
  }

  return (
    <main className="materials-page">
      <header className="materials-header">
        <div>
          <a className="back-link" href="/">← Voltar ao resumo</a>
          <p className="eyebrow">CONFERÊNCIA FÍSICA</p>
          <h1>Inventário</h1>
          <p className="subtitle">Compare a quantidade física com o saldo do sistema.</p>
        </div>
        <div className="top-avatar">MC</div>
      </header>

      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <h2>Nova contagem</h2>
            <p>A diferença será registrada para revisão, sem ajuste automático.</p>
          </div>
        </div>

        <form className="material-form request-form" onSubmit={submit}>
          <div className="form-row">
            <label>
              Obra
              <select value={form.projectId} onChange={(event) => update("projectId", event.target.value)} required>
                <option value="">Selecione uma obra</option>
                {options.projects.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Almoxarifado
              <select value={form.warehouseId} onChange={(event) => update("warehouseId", event.target.value)} required>
                <option value="">Selecione o almoxarifado</option>
                {warehouses.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Local
              <select value={form.locationId} onChange={(event) => update("locationId", event.target.value)} required>
                <option value="">Selecione o local</option>
                {locations.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Material
              <select value={form.materialId} onChange={(event) => update("materialId", event.target.value)} required>
                <option value="">Selecione o material</option>
                {options.materials.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.code} · {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="form-row">
            <label>
              Quantidade física
              <input type="number" min="0" step="0.001" value={form.physicalQuantity} onChange={(event) => update("physicalQuantity", event.target.value)} required />
            </label>
            <label>
              Tipo
              <select value={form.type} onChange={(event) => update("type", event.target.value)}>
                <option value="partial">Parcial</option>
                <option value="general">Geral</option>
                <option value="cyclic">Cíclica</option>
                <option value="abc">ABC</option>
              </select>
            </label>
          </div>

          <label>
            Justificativa / observação
            <textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={3} placeholder="Explique divergências, avarias ou contagem" />
          </label>

          {error && <p className="login-error" role="alert">{error}</p>}
          {message && <p className="success-message" role="status">{message}</p>}

          <button className="primary-button" type="submit" disabled={saving}>
            {saving ? "Registrando..." : "Registrar contagem"}
          </button>
        </form>
      </section>

      <section className="panel request-panel" style={{ marginTop: "1.5rem" }}>
        <div className="panel-heading">
          <div>
            <h2>Divergências pendentes</h2>
            <p>Ajuste o estoque apenas após a revisão da contagem física.</p>
          </div>
        </div>

        {loading ? (
          <p className="empty-state">Carregando divergências...</p>
        ) : pendingItems.length === 0 ? (
          <div className="panel empty-panel">
            <p className="empty-state">Nenhuma divergência pendente.</p>
          </div>
        ) : (
          <div className="approval-list">
            {pendingItems.map((item) => (
              <article className="panel request-card" key={item.id}>
                <div className="request-card-top">
                  <div>
                    <h2>{item.materials?.name ?? "Material"}</h2>
                    <p>
                      {item.materials?.code ?? "Código não informado"} · {item.physical_quantity} {item.materials?.unit ?? "un"} físicos · {item.system_quantity} {item.materials?.unit ?? "un"} no sistema
                    </p>
                    <p>
                      {item.inventories?.projects?.name ?? "Obra"} · {item.inventories?.warehouses?.name ?? "Almoxarifado"} · {item.locations?.code ?? "Local"}
                    </p>
                  </div>
                  <button
                    className="primary-button"
                    type="button"
                    disabled={approvingId === item.id}
                    onClick={() => void approve(item.id)}
                  >
                    {approvingId === item.id ? "Aprovando..." : `Aprovar ${item.difference > 0 ? "+" : ""}${item.difference}`}
                  </button>
                </div>

                <div className="request-meta">
                  <span>
                    Diferença <strong>{item.difference > 0 ? "+" : ""}{item.difference}</strong>
                  </span>
                  <span>
                    Local <strong>{item.locations?.name ?? "Não informado"}</strong>
                  </span>
                  <span>
                    Observação <strong>{item.notes || "Sem observação"}</strong>
                  </span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
