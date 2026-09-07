"use client";

import { useEffect, useState } from "react";

type ExecutiveMetrics = {
  total_items: number;
  active_items: number;
  blocked_items: number;
  critical_items: number;
  open_requests: number;
  reserved_stock: number;
  stock_value: number;
  issue_volume_7d: number;
};

type ForecastCandidate = {
  material: string;
  code: string;
  quantity: number;
  minimum: number;
  warehouse: string;
  status: string;
};

export default function ExecutiveDashboardPage() {
  const [metrics, setMetrics] = useState<ExecutiveMetrics | null>(null);
  const [forecastCandidates, setForecastCandidates] = useState<ForecastCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/dashboard/executive", { cache: "no-store" });
      const result = (await response.json()) as {
        metrics?: ExecutiveMetrics;
        forecastCandidates?: ForecastCandidate[];
        error?: string;
      };

      if (!response.ok) {
        setError(result.error ?? "Não foi possível carregar o dashboard executivo.");
        return;
      }

      setMetrics(result.metrics ?? null);
      setForecastCandidates(result.forecastCandidates ?? []);
    } catch {
      setError("Não foi possível conectar ao dashboard executivo.");
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
          <p className="eyebrow">GESTÃO EXECUTIVA</p>
          <h1>Dashboard estratégico</h1>
          <p className="subtitle">Indicadores chave para decisões de compra, risco e operação.</p>
        </div>
        <div className="top-avatar">MC</div>
      </header>

      {error && <p className="login-error" role="alert">{error}</p>}

      {loading ? (
        <p className="empty-state">Carregando dashboard executivo...</p>
      ) : metrics ? (
        <>
          <section className="metrics" aria-label="Indicadores executivos">
            <article className="metric-card"><div className="metric-icon teal">▦</div><div><span>Itens ativos</span><strong>{metrics.active_items}</strong><small className="positive">Total do cadastro: {metrics.total_items}</small></div></article>
            <article className="metric-card"><div className="metric-icon coral">!</div><div><span>Críticos</span><strong>{metrics.critical_items}</strong><small className="negative">Itens abaixo do mínimo</small></div></article>
            <article className="metric-card"><div className="metric-icon gold">↕</div><div><span>Requisições abertas</span><strong>{metrics.open_requests}</strong><small className="positive">Fluxo operacional em curso</small></div></article>
            <article className="metric-card"><div className="metric-icon blue">R$</div><div><span>Valor em estoque</span><strong>{new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(metrics.stock_value)}</strong><small className="positive">Reservado: {metrics.reserved_stock}</small></div></article>
          </section>

          <section className="content-grid">
            <article className="panel chart-panel">
              <div className="panel-heading">
                <div>
                  <h2>Previsão de risco</h2>
                  <p>Materiais com atenção prioritária</p>
                </div>
              </div>
              <div className="alert-list">
                {forecastCandidates.length === 0 ? (
                  <p className="empty-state">Nenhum item crítico na previsão de risco.</p>
                ) : (
                  forecastCandidates.map((item) => (
                    <div className="alert-row" key={`${item.code}-${item.warehouse}`}>
                      <div className="item-symbol critical">{item.code.slice(0, 1)}</div>
                      <div className="item-info">
                        <strong>{item.material}</strong>
                        <span>{item.warehouse}</span>
                      </div>
                      <div className="stock-amount">
                        <strong>{item.quantity} un</strong>
                        <small>Mín. {item.minimum} · {item.status}</small>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="panel alerts-panel">
              <div className="panel-heading">
                <div>
                  <h2>Resumo operacional</h2>
                  <p>Indicadores de gestão</p>
                </div>
              </div>
              <div className="alert-list">
                <div className="alert-row">
                  <div className="item-symbol teal">B</div>
                  <div className="item-info"><strong>Bloqueados</strong><span>Materiais inativos/com restrição</span></div>
                  <div className="stock-amount"><strong>{metrics.blocked_items}</strong></div>
                </div>
                <div className="alert-row">
                  <div className="item-symbol gold">S</div>
                  <div className="item-info"><strong>Saídas 7 dias</strong><span>Volume movimentado</span></div>
                  <div className="stock-amount"><strong>{metrics.issue_volume_7d}</strong></div>
                </div>
                <div className="alert-row">
                  <div className="item-symbol blue">R</div>
                  <div className="item-info"><strong>Reservado</strong><span>Quantidade em espera</span></div>
                  <div className="stock-amount"><strong>{metrics.reserved_stock}</strong></div>
                </div>
              </div>
            </article>
          </section>
        </>
      ) : null}
    </main>
  );
}
