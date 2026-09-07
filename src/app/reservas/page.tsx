"use client";

import { useEffect, useState } from "react";

type StockEntry = {
  material_id: string;
  warehouse_id: string;
  location_id: string | null;
  quantity: number;
  reserved_quantity: number;
  available: number;
  material: { code: string; name: string; unit: string; status: string };
  warehouse: string;
  location: string;
};

export default function ReservationsPage() {
  const [entries, setEntries] = useState<StockEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [workingId, setWorkingId] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/stock-control", { cache: "no-store" });
      const result = (await response.json()) as { entries?: StockEntry[]; error?: string };

      if (!response.ok) {
        setError(result.error ?? "Não foi possível carregar stock e reservas.");
        setEntries([]);
        return;
      }

      setEntries(result.entries ?? []);
    } catch {
      setError("Não foi possível conectar ao servidor de reservas.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function adjustReservation(entry: StockEntry, delta: number) {
    setWorkingId(`${entry.material_id}-${entry.warehouse_id}-${entry.location_id ?? "none"}`);

    const nextReserved = Math.max(0, Number(entry.reserved_quantity) + delta);
    const response = await fetch("/api/stock-control", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        material_id: entry.material_id,
        warehouse_id: entry.warehouse_id,
        location_id: entry.location_id,
        reservedQuantity: nextReserved,
      }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Não foi possível ajustar a reserva.");
    } else {
      setError("");
      await load();
    }

    setWorkingId("");
  }

  async function toggleBlock(entry: StockEntry) {
    const nextStatus = entry.material.status === "blocked" ? "active" : "blocked";
    setWorkingId(`${entry.material_id}-block`);

    const response = await fetch("/api/stock-control", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ material_id: entry.material_id, status: nextStatus }),
    });

    const result = (await response.json()) as { error?: string };

    if (!response.ok) {
      setError(result.error ?? "Não foi possível alterar o bloqueio do material.");
    } else {
      setError("");
      await load();
    }

    setWorkingId("");
  }

  return (
    <main className="materials-page">
      <header className="materials-header">
        <div>
          <a className="back-link" href="/">← Voltar ao resumo</a>
          <p className="eyebrow">CONTROLE OPERACIONAL</p>
          <h1>Reservas e bloqueios</h1>
          <p className="subtitle">Acompanhe disponibilidade real, reserve itens e bloqueie materiais críticos.</p>
        </div>
        <div className="top-avatar">MC</div>
      </header>

      {error && <p className="login-error" role="alert">{error}</p>}

      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <h2>Disponibilidade por ponto</h2>
            <p>{entries.length} itens em estoque</p>
          </div>
          <button className="select-button" type="button" onClick={() => void load()}>Atualizar ↻</button>
        </div>

        {loading ? (
          <p className="empty-state">Carregando reservas...</p>
        ) : entries.length === 0 ? (
          <p className="empty-state">Nenhum saldo encontrado para reserva ou bloqueio.</p>
        ) : (
          <div className="materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>MATERIAL</th>
                  <th>ALMOXARIFADO</th>
                  <th>LOCAL</th>
                  <th>SALDO</th>
                  <th>RESERVADO</th>
                  <th>DISPONÍVEL</th>
                  <th>STATUS</th>
                  <th>AÇÃO</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => (
                  <tr key={`${entry.material_id}-${entry.warehouse_id}-${entry.location_id ?? "no-location"}`}>
                    <td>
                      <strong>{entry.material.name}</strong>
                      <div className="muted">{entry.material.code}</div>
                    </td>
                    <td>{entry.warehouse}</td>
                    <td>{entry.location}</td>
                    <td>{entry.quantity} {entry.material.unit}</td>
                    <td>{entry.reserved_quantity} {entry.material.unit}</td>
                    <td>{entry.available} {entry.material.unit}</td>
                    <td>
                      <span className={`status-tag ${entry.material.status === "blocked" ? "low" : ""}`}>
                        {entry.material.status === "blocked" ? "Bloqueado" : entry.material.status === "quarantine" ? "Quarentena" : entry.material.status === "inactive" ? "Inativo" : "Ativo"}
                      </span>
                    </td>
                    <td>
                      <div className="inline-actions">
                        <button
                          type="button"
                          className="select-button"
                          disabled={workingId === `${entry.material_id}-${entry.warehouse_id}-${entry.location_id ?? "none"}`}
                          onClick={() => void adjustReservation(entry, 10)}
                        >
                          +10
                        </button>
                        <button
                          type="button"
                          className="select-button"
                          disabled={workingId === `${entry.material_id}-${entry.warehouse_id}-${entry.location_id ?? "none"}`}
                          onClick={() => void adjustReservation(entry, -10)}
                        >
                          -10
                        </button>
                        <button
                          type="button"
                          className="select-button"
                          disabled={workingId === `${entry.material_id}-block`}
                          onClick={() => void toggleBlock(entry)}
                        >
                          {entry.material.status === "blocked" ? "Desbloquear" : "Bloquear"}
                        </button>
                      </div>
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
