"use client";

import { FormEvent, useEffect, useState } from "react";
import { enqueueOfflineRequest } from "@/lib/offline-queue";

type Option = { id: string; name: string; code?: string; unit?: string };
const initialForm = { projectId: "", materialId: "", quantity: "", priority: "normal", neededAt: "", front: "", service: "", costCenter: "", notes: "" };

export default function RequestsPage() {
  const [projects, setProjects] = useState<Option[]>([]);
  const [materials, setMaterials] = useState<Option[]>([]);
  const [form, setForm] = useState(initialForm);
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

  function update(field: keyof typeof initialForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);
    const body = { ...form, quantity: Number(form.quantity) };
    try {
      const response = await fetch("/api/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) setError(result.error ?? "Não foi possível enviar a requisição.");
      else { setMessage("Requisição enviada para aprovação."); setForm(initialForm); }
    } catch {
      await enqueueOfflineRequest("/api/requests", body);
      setMessage("Sem conexão. Requisição salva e será sincronizada quando a internet voltar.");
      setForm(initialForm);
    }
    setIsSaving(false);
  }

  return (
    <main className="materials-page"><header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">SOLICITAÇÃO DE MATERIAL</p><h1>Nova requisição</h1><p className="subtitle">Peça material para uma obra, frente ou serviço.</p></div><div className="top-avatar">MC</div></header><section className="panel request-panel"><div className="panel-heading"><div><h2>Detalhes da requisição</h2><p>Após o envio, o responsável poderá aprovar ou rejeitar.</p></div></div><form className="material-form request-form" onSubmit={handleSubmit}><div className="form-row"><label>Obra<select value={form.projectId} onChange={(event) => update("projectId", event.target.value)} required><option value="">Selecione uma obra</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>Material<select value={form.materialId} onChange={(event) => update("materialId", event.target.value)} required><option value="">Selecione um material</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label></div><div className="form-row"><label>Quantidade<input type="number" min="0.001" step="0.001" value={form.quantity} onChange={(event) => update("quantity", event.target.value)} required /></label><label>Prioridade<select value={form.priority} onChange={(event) => update("priority", event.target.value)}><option value="urgent">Urgente</option><option value="normal">Normal</option><option value="scheduled">Programada</option></select></label></div><div className="form-row"><label>Frente de serviço<input value={form.front} onChange={(event) => update("front", event.target.value)} placeholder="Ex.: Estrutura" /></label><label>Serviço<input value={form.service} onChange={(event) => update("service", event.target.value)} placeholder="Ex.: Concretagem" /></label></div><div className="form-row"><label>Centro de custo<input value={form.costCenter} onChange={(event) => update("costCenter", event.target.value)} placeholder="Opcional" /></label><label>Data necessária<input type="date" value={form.neededAt} onChange={(event) => update("neededAt", event.target.value)} /></label></div><label>Observação<textarea value={form.notes} onChange={(event) => update("notes", event.target.value)} rows={3} placeholder="Explique a necessidade do material" /></label>{error && <p className="login-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<button className="primary-button" type="submit" disabled={isLoading || isSaving}>{isSaving ? "Enviando..." : "Enviar para aprovação"}</button></form></section></main>
  );
}
