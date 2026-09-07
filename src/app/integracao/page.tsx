"use client";

import { ChangeEvent, useState } from "react";

export default function IntegrationPage() {
  const [csv, setCsv] = useState("code,name,unit,minimum_stock,average_cost\nMAT-001,Cimento CP II 50kg,KG,50,35\nMAT-002,Areia lavada,KG,100,18");
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ imported?: number; total?: number; errors?: string[] } | null>(null);
  const [error, setError] = useState("");

  async function handleImport() {
    setImporting(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("/api/integracao", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });

      const payload = (await response.json()) as { imported?: number; total?: number; errors?: string[]; error?: string };

      if (!response.ok) {
        setError(payload.error ?? "Não foi possível importar os dados.");
        return;
      }

      setResult(payload);
    } catch {
      setError("Não foi possível enviar a importação.");
    } finally {
      setImporting(false);
    }
  }

  function handleFileUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === "string" ? reader.result : "";
      setCsv(text);
    };
    reader.readAsText(file);
  }

  return (
    <main className="materials-page">
      <header className="materials-header">
        <div>
          <a className="back-link" href="/">← Voltar ao resumo</a>
          <p className="eyebrow">ERP E INTEGRAÇÃO</p>
          <h1>Importação de dados</h1>
          <p className="subtitle">Carregue materiais em lote e sincronize o cadastro com o almoxarifado.</p>
        </div>
        <div className="top-avatar">MC</div>
      </header>

      <section className="panel request-panel">
        <div className="panel-heading">
          <div>
            <h2>CSV de materiais</h2>
            <p>Estrutura esperada: code,name,unit,minimum_stock,average_cost</p>
          </div>
          <label className="select-button" style={{ display: "inline-flex", alignItems: "center", cursor: "pointer" }}>
            Importar arquivo
            <input type="file" accept=".csv,.txt" onChange={handleFileUpload} style={{ display: "none" }} />
          </label>
        </div>

        <textarea
          value={csv}
          onChange={(event) => setCsv(event.target.value)}
          rows={12}
          style={{ width: "100%", marginTop: 16, padding: 16, borderRadius: 12, border: "1px solid #dfe7ee", fontFamily: "monospace" }}
        />

        {error && <p className="login-error" role="alert">{error}</p>}

        <div style={{ marginTop: 16, display: "flex", gap: 12, alignItems: "center" }}>
          <button className="primary-button" type="button" onClick={() => void handleImport()} disabled={importing}>
            {importing ? "Importando..." : "Importar dados"}
          </button>
        </div>

        {result && (
          <div className="panel" style={{ marginTop: 16, padding: 16 }}>
            <strong>Resultado:</strong>
            <p>Importados: {result.imported ?? 0} / {result.total ?? 0}</p>
            {result.errors?.length ? (
              <ul>
                {result.errors.map((item) => <li key={item}>{item}</li>)}
              </ul>
            ) : (
              <p>Sem erros na importação.</p>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
