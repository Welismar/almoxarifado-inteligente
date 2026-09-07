"use client";

import { FormEvent, useEffect, useState } from "react";
import { formatUnit } from "@/lib/units";

type Material = {
  id: string;
  code: string;
  name: string;
  unit: string;
  minimum_stock: number;
  average_cost: number;
  barcode: string | null;
  technical_description: string | null;
  maximum_stock: number | null;
  reorder_point: number;
  status: string;
};

type MaterialForm = {
  code: string;
  name: string;
  unit: string;
  minimumStock: string;
  averageCost: string;
  barcode: string;
  technicalDescription: string;
  maximumStock: string;
  reorderPoint: string;
};

const emptyForm: MaterialForm = { code: "", name: "", unit: "UN", minimumStock: "0", averageCost: "0", barcode: "", technicalDescription: "", maximumStock: "", reorderPoint: "0" };

export default function MaterialsPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  async function loadMaterials() {
    setIsLoading(true);
    const response = await fetch("/api/materials", { cache: "no-store" });
    const result = (await response.json()) as { materials?: Material[]; error?: string };
    setMaterials(result.materials ?? []);
    if (!response.ok) setError(result.error ?? "Não foi possível carregar os materiais.");
    setIsLoading(false);
  }

  useEffect(() => {
    void loadMaterials();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setIsSaving(true);

    const response = await fetch("/api/materials", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, minimumStock: Number(form.minimumStock), averageCost: Number(form.averageCost), maximumStock: form.maximumStock ? Number(form.maximumStock) : null, reorderPoint: Number(form.reorderPoint) }),
    });
    const result = (await response.json()) as { material?: Material; error?: string };

    if (!response.ok) {
      setError(result.error ?? "Não foi possível cadastrar o material.");
    } else {
      setForm(emptyForm);
      setMessage("Material cadastrado com sucesso.");
      await loadMaterials();
    }

    setIsSaving(false);
  }

  return (
    <main className="materials-page">
      <header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">CADASTRO OPERACIONAL</p><h1>Materiais</h1><p className="subtitle">Cadastre itens que serão usados no estoque e nas obras.</p></div><div className="top-avatar">MC</div></header>
      <section className="materials-grid">
        <article className="panel material-form-panel"><div className="panel-heading"><div><h2>Novo material</h2><p>Identificação, unidade e reposição</p></div></div><form className="material-form" onSubmit={handleSubmit}><label>Código interno<input value={form.code} onChange={(event) => setForm({ ...form, code: event.target.value })} placeholder="MAT-0001" required /></label><label>Descrição<input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} placeholder="Ex.: Cimento CP-II 50kg" required /></label><label>Descrição técnica<input value={form.technicalDescription} onChange={(event) => setForm({ ...form, technicalDescription: event.target.value })} placeholder="Marca, dimensão, especificação..." /></label><div className="form-row"><label>Unidade<select value={form.unit} onChange={(event) => setForm({ ...form, unit: event.target.value })}><option>UN</option><option>CX</option><option>PC</option><option>JG</option><option>KIT</option><option>PAR</option><option>KG</option><option>G</option><option>T</option><option>M</option><option>CM</option><option>MM</option><option>M2</option><option>M3</option><option>L</option><option>ML</option><option>SC</option><option>FD</option><option>RL</option><option>GL</option><option>TON</option><option>HR</option><option>DIA</option><option>MES</option></select></label><label>Código de barras<input value={form.barcode} onChange={(event) => setForm({ ...form, barcode: event.target.value })} /></label></div><div className="form-row"><label>Estoque mínimo<input type="number" min="0" step="0.001" value={form.minimumStock} onChange={(event) => setForm({ ...form, minimumStock: event.target.value })} /></label><label>Ponto de reposição<input type="number" min="0" step="0.001" value={form.reorderPoint} onChange={(event) => setForm({ ...form, reorderPoint: event.target.value })} /></label></div><div className="form-row"><label>Estoque máximo<input type="number" min="0" step="0.001" value={form.maximumStock} onChange={(event) => setForm({ ...form, maximumStock: event.target.value })} /></label><label>Custo médio<input type="number" min="0" step="0.01" value={form.averageCost} onChange={(event) => setForm({ ...form, averageCost: event.target.value })} /></label></div>{error && <p className="login-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "Salvando..." : "Cadastrar material"}</button></form></article>
        <article className="panel materials-list-panel"><div className="panel-heading"><div><h2>Materiais cadastrados</h2><p>{materials.length} itens visíveis para sua empresa</p></div><button className="select-button" type="button" onClick={() => void loadMaterials()}>Atualizar ↻</button></div>{isLoading ? <p className="empty-state">Carregando materiais...</p> : materials.length === 0 ? <p className="empty-state">Nenhum material cadastrado ainda.</p> : <div className="materials-table-wrap"><table><thead><tr><th>CÓDIGO</th><th>DESCRIÇÃO</th><th>UNIDADE</th><th>REPOSIÇÃO</th><th>CUSTO</th><th>STATUS</th></tr></thead><tbody>{materials.map((material) => <tr key={material.id}><td><strong>{material.code}</strong></td><td>{material.name}<small className="table-subtitle">{material.technical_description || material.barcode || "Sem especificação"}</small></td><td>{formatUnit(material.unit)}</td><td>{material.reorder_point} / {material.maximum_stock ?? "-"}</td><td>R$ {Number(material.average_cost).toFixed(2)}</td><td><span className="status-tag">{material.status === "active" ? "Ativo" : material.status}</span></td></tr>)}</tbody></table></div>}</article>
      </section>
    </main>
  );
}
