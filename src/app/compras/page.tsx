"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { formatUnit } from "@/lib/units";

type Option = { id: string; name: string; code?: string; unit?: string; project_id?: string; warehouse_id?: string };
type Person = { id: string; full_name: string; role: string };
type PurchaseForm = { projectId: string; materialId: string; quantity: string; priority: string; neededAt: string; estimatedUnitCost: string; purchasingResponsibleId: string; destinationWarehouseId: string; destinationLocationId: string; notes: string };
const initialForm: PurchaseForm = { projectId: "", materialId: "", quantity: "", priority: "normal", neededAt: "", estimatedUnitCost: "", purchasingResponsibleId: "", destinationWarehouseId: "", destinationLocationId: "", notes: "" };

function csvCell(value: unknown) { return `"${String(value ?? "").replaceAll('"', '""')}"`; }

export default function PurchasesPage() {
  const [projects, setProjects] = useState<Option[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [warehouses, setWarehouses] = useState<Option[]>([]);
  const [locations, setLocations] = useState<Option[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const selectedMaterial = materials.find((item) => item.id === form.materialId);
  const availableWarehouses = useMemo(() => warehouses.filter((item) => item.project_id === form.projectId), [warehouses, form.projectId]);
  const availableLocations = useMemo(() => locations.filter((item) => item.warehouse_id === form.destinationWarehouseId), [locations, form.destinationWarehouseId]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setForm((current) => ({ ...current, projectId: params.get("projectId") ?? current.projectId, materialId: params.get("materialId") ?? current.materialId, quantity: params.get("quantity") ?? current.quantity }));
    fetch("/api/movement-options", { cache: "no-store" }).then(async (response) => {
      const result = (await response.json()) as { projects?: Option[]; materials?: Option[]; warehouses?: Option[]; locations?: Option[]; people?: Person[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar as opções.");
      setProjects(result.projects ?? []); setMaterials(result.materials ?? []); setWarehouses(result.warehouses ?? []); setLocations(result.locations ?? []); setPeople(result.people ?? []);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setLoading(false));
  }, []);

  function update(field: keyof PurchaseForm, value: string) { setForm((current) => ({ ...current, [field]: value, ...(field === "projectId" ? { destinationWarehouseId: "", destinationLocationId: "" } : {}), ...(field === "destinationWarehouseId" ? { destinationLocationId: "" } : {}) })); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(""); setMessage(""); setSaving(true);
    const response = await fetch("/api/purchases", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, quantity: Number(form.quantity), estimatedUnitCost: Number(form.estimatedUnitCost || 0) }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setError(result.error ?? "Não foi possível criar a solicitação."); else { setMessage("Solicitação criada com solicitante, comprador e destino registrados."); setForm(initialForm); }
    setSaving(false);
  }

  function exportFile(type: "csv" | "xls") {
    const rows = [["Campo", "Valor"], ["Obra", projects.find((item) => item.id === form.projectId)?.name], ["Material", selectedMaterial?.name], ["Unidade", selectedMaterial ? formatUnit(selectedMaterial.unit ?? "UN") : ""], ["Quantidade", form.quantity], ["Custo unitário estimado", form.estimatedUnitCost], ["Comprador", people.find((item) => item.id === form.purchasingResponsibleId)?.full_name], ["Destino", `${availableWarehouses.find((item) => item.id === form.destinationWarehouseId)?.name ?? ""} / ${availableLocations.find((item) => item.id === form.destinationLocationId)?.name ?? ""}`], ["Observações", form.notes]];
    const content = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\ufeff${content}`], { type: type === "xls" ? "application/vnd.ms-excel;charset=utf-8" : "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `solicitacao-compra.${type === "xls" ? "xls" : "csv"}`; link.click(); URL.revokeObjectURL(link.href);
  }

  return <main className="materials-page"><header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">PLANEJAMENTO DE COMPRAS</p><h1>Solicitação de compra</h1><p className="subtitle">Registre quem solicitou, quem compra e para onde o material será entregue.</p></div><div className="top-avatar">MC</div></header><section className="panel request-panel"><div className="panel-heading"><div><h2>Nova solicitação</h2><p>O solicitante é identificado pela sessão atual; o comprador é selecionado para acompanhamento.</p></div></div><form className="material-form request-form" onSubmit={submit}><div className="form-row"><label>Obra<select value={form.projectId} onChange={(event) => update("projectId", event.target.value)} required><option value="">Selecione uma obra</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Material<select value={form.materialId} onChange={(event) => update("materialId", event.target.value)} required><option value="">Selecione um material</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name} ({formatUnit(item.unit ?? "UN")})</option>)}</select></label></div><div className="form-row"><label>Quantidade<input type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required /></label><label>Prioridade<select value={form.priority} onChange={(event) => update("priority", event.target.value)}><option value="urgent">Urgente</option><option value="normal">Normal</option><option value="scheduled">Programada</option></select></label></div><div className="form-row"><label>Custo unitário estimado<input type="number" min="0" step="0.01" value={form.estimatedUnitCost} onChange={(event) => update("estimatedUnitCost", event.target.value)} placeholder="0,00" /></label><label>Necessário em<input type="date" value={form.neededAt} onChange={(event) => update("neededAt", event.target.value)} /></label></div><div className="form-row"><label>Responsável pela compra<select value={form.purchasingResponsibleId} onChange={(event) => update("purchasingResponsibleId", event.target.value)} required><option value="">Selecione uma pessoa</option>{people.map((person) => <option key={person.id} value={person.id}>{person.full_name} · {person.role}</option>)}</select></label><label>Almoxarifado de destino<select value={form.destinationWarehouseId} onChange={(event) => update("destinationWarehouseId", event.target.value)} required><option value="">Selecione o destino</option>{availableWarehouses.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label></div><label>Local de destino<select value={form.destinationLocationId} onChange={(event) => update("destinationLocationId", event.target.value)} required><option value="">Selecione o local</option>{availableLocations.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><label>Observação<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={3} placeholder="Fornecedor preferencial, condição ou aplicação do material" /></label>{error && <p className="login-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<div className="form-actions"><button className="primary-button" type="submit" disabled={saving || loading}>{saving ? "Salvando..." : "Criar solicitação"}</button><button className="select-button" type="button" onClick={() => exportFile("csv")}>CSV</button><button className="select-button" type="button" onClick={() => exportFile("xls")}>Excel</button><button className="select-button" type="button" onClick={() => window.print()}>Imprimir</button></div></form></section></main>;
}
