"use client";

import { useEffect, useState } from "react";

type AlertItem = {
  material: string;
  code: string;
  unit: string;
  quantity: number;
  available: number;
  minimum: number;
  warehouse: string;
  location: string;
  status: "critical" | "attention";
};

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const response = await fetch("/api/alerts", { cache: "no-store" });
    const result = (await response.json()) as { alerts?: AlertItem[]; error?: string };
    setAlerts(result.alerts ?? []);
    if (!response.ok) setError(result.error ?? "Não foi possível carregar os alertas.");
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <main className="materials-page">
      <header className="materials-header">
        <div>
          <a className="back-link" href="/">← Voltar ao resumo</a>
          <p className="eyebrow">GESTÃO DE RISCO</p>
          <h1>Alertas do almoxarifado</h1>
          <p className="subtitle">Itens com situação crítica ou próxima do limite mínimo.</p>
        </div>
        <div className="top-avatar">MC</div>
      </header>

      {error && <p className="login-error" role="alert">{error}</p>}

      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <h2>Itens monitorados</h2>
            <p>{alerts.length} alertas ativos</p>
          </div>
          <button className="select-button" type="button" onClick={() => void load()}>Atualizar ↻</button>
        </div>

        {loading ? (
          <p className="empty-state">Carregando alertas...</p>
        ) : alerts.length === 0 ? (
          <p className="empty-state">Nenhum alerta no momento.</p>
        ) : (
          <div className="materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>CÓDIGO</th>
                  <th>MATERIAL</th>
                  <th>ALMOXARIFADO</th>
                  <th>LOCAL</th>
                  <th>SALDO</th>
                  <th>MÍNIMO</th>
                  <th>DISPONÍVEL</th>
                  <th>STATUS</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={`${alert.code}-${alert.warehouse}-${alert.location}`}>
                    <td><strong>{alert.code}</strong></td>
                    <td>{alert.material}</td>
                    <td>{alert.warehouse}</td>
                    <td>{alert.location}</td>
                    <td>{alert.quantity} {alert.unit}</td>
                    <td>{alert.minimum} {alert.unit}</td>
                    <td>{alert.available} {alert.unit}</td>
                    <td>
                      <span className={`status-tag ${alert.status === "critical" ? "low" : ""}`}>
                        {alert.status === "critical" ? "Crítico" : "Atenção"}
                      </span>
                    </td>
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
