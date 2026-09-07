"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { enqueueOfflineRequest } from "@/lib/offline-queue";
import { formatUnit } from "@/lib/units";

type Project = { id: string; name: string };
type Warehouse = { id: string; name: string; project_id: string };
type Location = { id: string; name: string; code: string; warehouse_id: string };
type Material = { id: string; code: string; name: string; unit: string; average_cost: number };

type Options = { projects: Project[]; warehouses: Warehouse[]; locations: Location[]; materials: Material[] };
const initialForm = { projectId: "", warehouseId: "", locationId: "", materialId: "", type: "receipt", quantity: "", serviceFront: "", equipmentType: "", collaboratorName: "", unitCost: "", lot: "", expiryDate: "", notes: "" };

export default function MovementsPage() {
  const [options, setOptions] = useState<Options>({ projects: [], warehouses: [], locations: [], materials: [] });
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/movement-options", { cache: "no-store" })
      .then(async (response) => {
        const result = (await response.json()) as Options & { error?: string };
        if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar as opções.");
        setOptions(result);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setIsLoading(false));
  }, []);

  const warehouses = useMemo(() => options.warehouses.filter((item) => item.project_id === form.projectId), [options.warehouses, form.projectId]);
  const locations = useMemo(() => options.locations.filter((item) => item.warehouse_id === form.warehouseId), [options.locations, form.warehouseId]);
  const selectedMaterial = options.materials.find((item) => item.id === form.materialId);

  function updateField(field: keyof typeof initialForm, value: string) {
    setForm((current) => ({ ...current, [field]: value, ...(field === "projectId" ? { warehouseId: "", locationId: "" } : {}), ...(field === "warehouseId" ? { locationId: "" } : {}) }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    const body = { ...form, quantity: Number(form.quantity), unitCost: Number(form.unitCost || selectedMaterial?.average_cost || 0) };
    try {
      const response = await fetch("/api/movements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) setError(result.error ?? "Movimentação recusada.");
      else { setMessage("Movimentação registrada e saldo atualizado."); setForm(initialForm); }
    } catch {
      await enqueueOfflineRequest("/api/movements", body);
      setMessage("Sem conexão. Movimentação salva e será sincronizada quando a internet voltar.");
      setForm(initialForm);
    }
    setIsSaving(false);
  }

  return (
    <main className="materials-page">
      <header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">ROTINA DO ALMOXARIFE</p><h1>Nova movimentação</h1><p className="subtitle">Registre entradas e saídas com rastreabilidade.</p></div><div className="top-avatar">MC</div></header>
      <section className="movement-layout">
        <article className="panel movement-form-panel"><div className="panel-heading"><div><h2>Dados da movimentação</h2><p>O saldo será atualizado de forma transacional.</p></div></div><form className="material-form" onSubmit={handleSubmit}><div className="form-row"><label>Tipo<select value={form.type} onChange={(event) => updateField("type", event.target.value)}><option value="receipt">Entrada</option><option value="issue">Saída</option><option value="return">Devolução</option><option value="loss">Perda</option></select></label><label>Quantidade<input type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => updateField("quantity", event.target.value)} required /></label></div><label>Obra<select value={form.projectId} onChange={(event) => updateField("projectId", event.target.value)} required><option value="">Selecione uma obra</option>{options.projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Almoxarifado<select value={form.warehouseId} onChange={(event) => updateField("warehouseId", event.target.value)} required><option value="">Selecione o almoxarifado</option>{warehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><div className="form-row"><label>Material<select value={form.materialId} onChange={(event) => updateField("materialId", event.target.value)} required><option value="">Selecione o material</option>{options.materials.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>Local<select value={form.locationId} onChange={(event) => updateField("locationId", event.target.value)} required><option value="">Selecione o local</option>{locations.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label></div><div className="form-row"><label>Custo unitário<input type="number" min="0" step="0.01" value={form.unitCost} onChange={(event) => updateField("unitCost", event.target.value)} placeholder={selectedMaterial ? String(selectedMaterial.average_cost) : "0,00"} /></label><label>Lote<input value={form.lot} onChange={(event) => updateField("lot", event.target.value)} placeholder="Opcional" /></label></div><label>Observação<textarea value={form.notes} onChange={(event) => updateField("notes", event.target.value)} placeholder="Contexto, NF ou motivo da movimentação" rows={3} /></label>{error && <p className="login-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<button className="primary-button" type="submit" disabled={isSaving || isLoading}>{isSaving ? "Registrando..." : "Registrar movimentação"}</button></form></article>
        <aside className="panel movement-info"><div className="panel-heading"><div><h2>Regras do estoque</h2><p>Aplicadas pelo banco de dados</p></div></div><ul><li>Saídas não podem deixar o saldo negativo.</li><li>Materiais bloqueados não podem ser movimentados.</li><li>Obra, local e responsável ficam vinculados ao registro.</li><li>Toda operação gera histórico e auditoria.</li></ul></aside>
      </section>
    </main>
  );
}
