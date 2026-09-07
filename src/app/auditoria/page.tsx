"use client";

import { useEffect, useState } from "react";

type AuditEntry = {
  id: string;
  entity_type: string;
  action: string;
  created_at: string;
  actor?: { full_name?: string; role?: string } | null;
  reason?: string | null;
  old_values?: Record<string, unknown> | null;
  new_values?: Record<string, unknown> | null;
};

export default function AuditPage() {
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/audit", { cache: "no-store" });
      const result = (await response.json()) as { entries?: AuditEntry[]; error?: string };

      if (!response.ok) {
        setError(result.error ?? "Não foi possível carregar a auditoria.");
        setEntries([]);
        return;
      }

      setEntries(result.entries ?? []);
    } catch {
      setError("Não foi possível conectar ao servidor de auditoria.");
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
          <p className="eyebrow">GOVERNANÇA E CONTROLE</p>
          <h1>Auditoria do almoxarifado</h1>
          <p className="subtitle">Acompanhe ações, aprovações, ajustes e eventos críticos do sistema.</p>
        </div>
        <div className="top-avatar">MC</div>
      </header>

      {error && <p className="login-error" role="alert">{error}</p>}

      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <h2>Registro de eventos</h2>
            <p>{entries.length} ocorrências</p>
          </div>
          <button className="select-button" type="button" onClick={() => void load()}>Atualizar ↻</button>
        </div>

        {loading ? (
          <p className="empty-state">Carregando auditoria...</p>
        ) : entries.length === 0 ? (
          <p className="empty-state">Nenhum evento de auditoria registrado no momento.</p>
        ) : (
          <div className="materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>DATA</th>
                  <th>ENTIDADE</th>
                  <th>AÇÃO</th>
                  <th>RESPONSÁVEL</th>
                  <th>OBSERVAÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={entry.id}>
                    <td>{new Date(entry.created_at).toLocaleString("pt-BR")}</td>
                    <td><strong>{entry.entity_type}</strong></td>
                    <td>{entry.action}</td>
                    <td>{entry.actor?.full_name ?? "Sistema"} {entry.actor?.role ? `(${entry.actor.role})` : ""}</td>
                    <td>{entry.reason ?? (entry.new_values ? JSON.stringify(entry.new_values).slice(0, 120) : "-")}</td>
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
