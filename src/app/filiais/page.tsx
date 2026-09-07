"use client";

import { useEffect, useState } from "react";

type Site = {
  id: string;
  name: string;
  code: string;
  status: string;
  warehouses: number;
  locations: number;
  totalQuantity: number;
  totalReserved: number;
  available: number;
};

export default function FiliaisPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/filiais", { cache: "no-store" });
      const result = (await response.json()) as { sites?: Site[]; error?: string };

      if (!response.ok) {
        setError(result.error ?? "Não foi possível carregar as filiais.");
        setSites([]);
        return;
      }

      setSites(result.sites ?? []);
    } catch {
      setError("Não foi possível conectar à visão de filiais.");
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
          <p className="eyebrow">MULTI-OBRA / MULTI-FILIAL</p>
          <h1>Visão por filiais e obras</h1>
          <p className="subtitle">Monitore capacidade, estoques e disponibilidade por unidade operacional.</p>
        </div>
        <div className="top-avatar">MC</div>
      </header>

      {error && <p className="login-error" role="alert">{error}</p>}

      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <h2>Unidades operacionais</h2>
            <p>{sites.length} obras ou filiais</p>
          </div>
          <button className="select-button" type="button" onClick={() => void load()}>Atualizar ↻</button>
        </div>

        {loading ? (
          <p className="empty-state">Carregando visão por filiais...</p>
        ) : sites.length === 0 ? (
          <p className="empty-state">Nenhuma filial ou obra encontrada.</p>
        ) : (
          <div className="materials-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>FILIAL / OBRA</th>
                  <th>CÓDIGO</th>
                  <th>STATUS</th>
                  <th>ALMOX.</th>
                  <th>LOCAIS</th>
                  <th>ESTOQUE</th>
                  <th>RESERVADO</th>
                  <th>DISPONÍVEL</th>
                </tr>
              </thead>
              <tbody>
                {sites.map((site) => (
                  <tr key={site.id}>
                    <td><strong>{site.name}</strong></td>
                    <td>{site.code}</td>
                    <td><span className="status-tag">{site.status === "active" ? "Ativa" : site.status}</span></td>
                    <td>{site.warehouses}</td>
                    <td>{site.locations}</td>
                    <td>{site.totalQuantity}</td>
                    <td>{site.totalReserved}</td>
                    <td>{site.available}</td>
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
