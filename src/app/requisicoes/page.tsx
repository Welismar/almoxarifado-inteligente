"use client";

import { FormEvent, useEffect, useState } from "react";
import { enqueueOfflineRequest } from "@/lib/offline-queue";

type Option = { id: string; name: string; code?: string; unit?: string };
type RequestItem = { materialId: string; quantity: string; unit: string };

const units = ["UN", "CX", "PC", "JG", "KIT", "PAR", "KG", "G", "T", "M", "CM", "MM", "M2", "M3", "L", "ML", "SC", "FD", "RL", "GL", "TON", "HR", "DIA", "MES"];
const initialForm = { projectId: "", priority: "normal", neededAt: "", front: "", service: "", costCenter: "", notes: "" };
const newItem = (): RequestItem => ({ materialId: "", quantity: "", unit: "UN" });

export default function RequestsPage() {
  const [projects, setProjects] = useState<Option[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [form, setForm] = useState(initialForm);
  const [items, setItems] = useState<RequestItem[]>([newItem()]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch("/api/movement-options", { cache: "no-store" }).then(async (response) => {
      const result = (await response.json()) as { projects?: Option[]; materials?: Option[]; error?: string };
      if (!response.ok) throw new Error(result.error ?? "Não foi possível carregar as opções.");
      setProjects(result.projects ?? []);
      setMaterials(result.materials ?? []);
    }).catch((reason: Error) => setError(reason.message)).finally(() => setIsLoading(false));
  }, []);

  function updateItem(index: number, field: keyof RequestItem, value: string) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, [field]: value } : item));
  }

  function selectMaterial(index: number, materialId: string) {
    const material = materials.find((option) => option.id === materialId);
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, materialId, unit: material?.unit ?? item.unit } : item));
  }

  function reset() { setForm(initialForm); setItems([newItem()]); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    const body = { ...form, items: items.map((item) => ({ ...item, quantity: Number(item.quantity) })) };
    try {
      const response = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) setError(result.error ?? "Não foi possível enviar a requisição.");
      else { setMessage(`Requisição com ${items.length} ${items.length === 1 ? "item enviada" : "itens enviada"} para aprovação.`); reset(); }
    } catch {
      await enqueueOfflineRequest("/api/requests", body);
      setMessage("Sem conexão. Requisição salva e será sincronizada quando a internet voltar.");
      reset();
    }
    setIsSaving(false);
  }

  return <main className="materials-page"><header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">SOLICITAÇÃO DE MATERIAL</p><h1>Nova requisição</h1><p className="subtitle">Peça até 20 materiais em uma única requisição.</p></div><div className="top-avatar">MC</div></header><section className="panel request-panel"><div className="panel-heading"><div><h2>Detalhes da requisição</h2><p>Após o envio, o responsável poderá aprovar ou rejeitar os itens.</p></div></div><form className="material-form request-form" onSubmit={handleSubmit}><div className="form-row"><label>Obra<select value={form.projectId} onChange={(event) => setForm({ ...form, projectId: event.target.value })} required><option value="">Selecione uma obra</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Prioridade<select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })}><option value="urgent">Urgente</option><option value="normal">Normal</option><option value="scheduled">Programada</option></select></label></div><div className="panel-heading"><div><h2>Materiais ({items.length}/20)</h2><p>Selecione o material, confira a unidade e informe a quantidade.</p></div><button className="select-button" type="button" onClick={() => items.length < 20 && setItems([...items, newItem()])} disabled={items.length >= 20}>＋ Adicionar item</button></div>{items.map((item, index) => <div className="form-row" key={`request-item-${index}`}><label>Material<select value={item.materialId} onChange={(event) => selectMaterial(index, event.target.value)} required disabled={isLoading}><option value="">Selecione um material</option>{materials.map((material) => <option key={material.id} value={material.id}>{material.code} · {material.name}</option>)}</select></label><label>Unidade<select value={item.unit} onChange={(event) => updateItem(index, "unit", event.target.value)}>{units.map((unit) => <option key={unit} value={unit}>{unit}</option>)}</select></label><label>Quantidade<input type="number" min="0.001" step="0.001" value={item.quantity} onChange={(event) => updateItem(index, "quantity", event.target.value)} required /></label>{items.length > 1 && <button className="select-button" type="button" onClick={() => setItems(items.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Remover item ${index + 1}`}>Remover</button>}</div>)}<div className="form-row"><label>Frente de serviço<input value={form.front} onChange={(event) => setForm({ ...form, front: event.target.value })} placeholder="Ex.: Estrutura" /></label><label>Serviço<input value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} placeholder="Ex.: Concretagem" /></label></div><div className="form-row"><label>Centro de custo<input value={form.costCenter} onChange={(event) => setForm({ ...form, costCenter: event.target.value })} placeholder="Opcional" /></label><label>Necessário em<input type="date" value={form.neededAt} onChange={(event) => setForm({ ...form, neededAt: event.target.value })} /></label></div><label>Observação<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} rows={3} placeholder="Explique a necessidade dos materiais" /></label>{error && <p className="login-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<button className="primary-button" type="submit" disabled={isSaving || isLoading}>{isSaving ? "Enviando..." : "Enviar requisição"}</button></form></section></main>;
}
