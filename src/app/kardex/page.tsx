"use client";

import { useEffect, useMemo, useState } from "react";

type Material = { id: string; code: string; name: string; unit: string; average_cost: number };
type Project = { id: string; name: string };
type Movement = { id: string; type: string; quantity: number; unit_cost: number; lot: string | null; created_at: string; responsible_id: string | null; balance?: number };
const labels: Record<string, string> = { receipt: "Entrada", issue: "Saída", return: "Devolução", transfer: "Transferência", adjustment: "Ajuste", loss: "Perda", inventory: "Inventário" };

export default function KardexPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [materialId, setMaterialId] = useState("");
  const [movements, setMovements] = useState<Movement[]>([]);
  const [material, setMaterial] = useState<Material | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ projectId: "", from: "", to: "", lot: "", type: "" });

  useEffect(() => { fetch("/api/movement-options", { cache: "no-store" }).then((response) => response.json()).then((result: { materials?: Material[]; projects?: Project[] }) => { setMaterials(result.materials ?? []); setProjects(result.projects ?? []); }).catch(() => setError("Não foi possível carregar os materiais.")); }, []);

  async function loadKardex(id = materialId) {
    setMaterialId(id);
    setError("");
    if (!id) { setMovements([]); setMaterial(null); return; }
    setLoading(true);
    const query = new URLSearchParams({ materialId: id });
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    const response = await fetch(`/api/kardex?${query}`, { cache: "no-store" });
    const result = (await response.json()) as { material?: Material; movements?: Movement[]; error?: string };
    if (!response.ok) setError(result.error ?? "Não foi possível carregar o Kardex.");
    else { setMaterial(result.material ?? null); setMovements(result.movements ?? []); }
    setLoading(false);
  }

  function exportCsv() {
    const header = ["Data", "Movimento", "Entrada", "Saída", "Saldo", "Custo", "Lote"];
    const lines = rows.map((movement) => { const incoming = movement.type === "receipt" || movement.type === "return" || movement.type === "adjustment" || movement.type === "inventory"; return [new Date(movement.created_at).toISOString(), labels[movement.type] ?? movement.type, incoming ? movement.quantity : "", incoming ? "" : movement.quantity, movement.balance, movement.unit_cost, movement.lot ?? ""].join(","); });
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `kardex-${material?.code ?? "material"}.csv`; link.click(); URL.revokeObjectURL(link.href);
  }

  const rows = useMemo(() => {
    let balance = 0;
    return movements.map((movement) => {
      const incoming = movement.type === "receipt" || movement.type === "return" || movement.type === "adjustment" || movement.type === "inventory";
      balance += incoming ? Number(movement.quantity) : -Number(movement.quantity);
      return { ...movement, balance };
    }).reverse();
  }, [movements]);

  return <main className="materials-page"><header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">RASTREABILIDADE</p><h1>Kardex do estoque</h1><p className="subtitle">Histórico completo de movimentações por material.</p></div><div className="top-avatar">MC</div></header><section className="panel kardex-selector"><label>Material<select value={materialId} onChange={(event) => void loadKardex(event.target.value)}><option value="">Selecione um material</option>{materials.map((item) => <option key={item.id} value={item.id}>{item.code} · {item.name}</option>)}</select></label><div className="kardex-filters"><label>Obra<select value={filters.projectId} onChange={(event) => setFilters({ ...filters, projectId: event.target.value })}><option value="">Todas as obras</option>{projects.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label><label>De<input type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label><label>Até<input type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label><label>Lote<input value={filters.lot} onChange={(event) => setFilters({ ...filters, lot: event.target.value })} placeholder="Todos" /></label><label>Tipo<select value={filters.type} onChange={(event) => setFilters({ ...filters, type: event.target.value })}><option value="">Todos</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><button className="select-button" type="button" onClick={() => void loadKardex()}>Filtrar</button></div></section>{error && <p className="login-error kardex-message" role="alert">{error}</p>}{material && <section className="kardex-summary"><div><span>Material</span><strong>{material.name}</strong><small>{material.code} · {material.unit}</small></div><div><span>Saldo calculado</span><strong>{rows[0]?.balance ?? 0} {material.unit}</strong><small>Baseado no histórico filtrado</small></div><div><span>Movimentações</span><strong>{movements.length}</strong><small>Registros imutáveis</small></div></section>}{loading ? <p className="empty-state">Carregando histórico...</p> : material && <section className="panel kardex-panel"><div className="panel-heading"><div><h2>Histórico de movimentações</h2><p>Do registro mais recente ao mais antigo</p></div><button className="select-button" type="button" onClick={exportCsv}>Exportar CSV ↓</button></div><div className="materials-table-wrap"><table><thead><tr><th>DATA</th><th>MOVIMENTO</th><th>ENTRADA</th><th>SAÍDA</th><th>SALDO</th><th>CUSTO</th><th>LOTE</th></tr></thead><tbody>{rows.length === 0 ? <tr><td colSpan={7} className="muted">Nenhuma movimentação registrada.</td></tr> : rows.map((movement) => { const incoming = movement.type === "receipt" || movement.type === "return" || movement.type === "adjustment" || movement.type === "inventory"; return <tr key={movement.id}><td className="muted">{new Date(movement.created_at).toLocaleString("pt-BR")}</td><td><span className={`movement-tag ${incoming ? "in" : "out"}`}>{labels[movement.type] ?? movement.type}</span></td><td className="amount in">{incoming ? `+ ${movement.quantity}` : "-"}</td><td className="amount out">{incoming ? "-" : `- ${movement.quantity}`}</td><td><strong>{movement.balance}</strong></td><td>R$ {Number(movement.unit_cost).toFixed(2)}</td><td className="muted">{movement.lot || "-"}</td></tr>; })}</tbody></table></div></section>}</main>;
}
