"use client";

import { useEffect, useState } from "react";

type ReplenishmentItem = {
  material: string;
  code: string;
  unit: string;
  minimum: number;
  quantity: number;
  reserved: number;
  available: number;
  deficit: number;
  warehouse: string;
  location: string;
  suggestedQty: number;
  priority: string;
};

export default function ReplenishmentPage() {
  const [items, setItems] = useState<ReplenishmentItem[]>([]);
  const [summary, setSummary] = useState({ totalDeficit: 0, totalSuggested: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/replenishment", { cache: "no-store" });
      const result = (await response.json()) as { suggestions?: ReplenishmentItem[]; summary?: { totalDeficit: number; totalSuggested: number }; error?: string };

      if (!response.ok) {
        setError(result.error ?? "Não foi possível carregar a reposição.");
        setItems([]);
        setSummary({ totalDeficit: 0, totalSuggested: 0 });
        return;
      }

      setItems(result.suggestions ?? []);
      setSummary(result.summary ?? { totalDeficit: 0, totalSuggested: 0 });
    } catch {
      setError("Não foi possível carregar a reposição.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="materials-page">
      <header className="materials-header">
        <div>
          <a className="back-link" href="/">← Voltar ao resumo</a>
          <p className="eyebrow">AUTO-REPOSIÇÃO</p>
          <h1>Reposição automática</h1>
          <p className="subtitle">Itens com déficit de estoque e quantidade sugerida para compra ou reposição.</p>
        </div>
        <div className="top-avatar">MC</div>
      </header>

      {error && <p className="login-error" role="alert">{error}</p>}

      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <h2>Resumo de reposição</h2>
            <p>Falta total: {summary.totalDeficit} · Sugestão total: {summary.totalSuggested}</p>
          </div>
          <button className="select-button" type="button" onClick={() => void load()}>Atualizar ↻</button>
        </div>

        {loading ? (
          <p className="empty-state">Carregando reposição...</p>
        ) : items.length === 0 ? (
          <p className="empty-state">Nenhuma sugestão de reposição no momento.</p>
        ) : (
          <div className="materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>MATERIAL</th>
                  <th>ALMOXARIFADO</th>
                  <th>LOCAL</th>
                  <th>DISPONÍVEL</th>
                  <th>MIN.</th>
                  <th>FALTA</th>
                  <th>SUGESTÃO</th>
                  <th>PRIORIDADE</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={`${item.code}-${item.warehouse}-${item.location}`}>
                    <td><strong>{item.code}</strong></td>
                    <td>{item.material}</td>
                    <td>{item.warehouse}</td>
                    <td>{item.location}</td>
                    <td>{item.available} {item.unit}</td>
                    <td>{item.minimum} {item.unit}</td>
                    <td>{item.deficit} {item.unit}</td>
                    <td>{item.suggestedQty} {item.unit}</td>
                    <td><span className={`status-tag ${item.priority === "Crítica" ? "low" : ""}`}>{item.priority}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
