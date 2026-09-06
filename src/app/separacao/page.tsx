"use client";

import { useEffect, useMemo, useState } from "react";

type Warehouse = { id: string; name: string; project_id: string };
type Location = { id: string; name: string; code: string; warehouse_id: string };
type RequestItem = { approved_quantity: number; issued_quantity: number; materials: { code: string; name: string; unit: string } };
type MaterialRequest = { id: string; priority: string; front: string | null; service: string | null; project_id: string; material_request_items: RequestItem[] };

export default function SeparationPage() {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [warehouseId, setWarehouseId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [issuing, setIssuing] = useState("");

  async function load() {
    setLoading(true);
    const [requestsResponse, optionsResponse] = await Promise.all([fetch("/api/requests/approved", { cache: "no-store" }), fetch("/api/movement-options", { cache: "no-store" })]);
    const requestsResult = (await requestsResponse.json()) as { requests?: MaterialRequest[]; error?: string };
    const optionsResult = (await optionsResponse.json()) as { warehouses?: Warehouse[]; locations?: Location[]; error?: string };
    setRequests(requestsResult.requests ?? []);
    setWarehouses(optionsResult.warehouses ?? []);
    setLocations(optionsResult.locations ?? []);
    if (!requestsResponse.ok || !optionsResponse.ok) setError(requestsResult.error ?? optionsResult.error ?? "Não foi possível carregar a separação.");
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);
  const filteredLocations = useMemo(() => locations.filter((location) => location.warehouse_id === warehouseId), [locations, warehouseId]);

  async function issue(requestId: string) {
    setError("");
    setMessage("");
    setIssuing(requestId);
    const response = await fetch("/api/requests/approved", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, warehouseId, locationId }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setError(result.error ?? "Separação recusada.");
    else { setMessage("Material separado e baixado do estoque."); await load(); }
    setIssuing("");
  }

  return <main className="materials-page"><header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">PICKING E RETIRADA</p><h1>Separação de materiais</h1><p className="subtitle">Escolha o local físico e confirme a retirada aprovada.</p></div><div className="top-avatar">MC</div></header><section className="panel separation-controls"><div className="material-form form-row"><label>Almoxarifado<select value={warehouseId} onChange={(event) => { setWarehouseId(event.target.value); setLocationId(""); }}><option value="">Selecione o almoxarifado</option>{warehouses.map((warehouse) => <option key={warehouse.id} value={warehouse.id}>{warehouse.name}</option>)}</select></label><label>Local de separação<select value={locationId} onChange={(event) => setLocationId(event.target.value)}><option value="">Selecione o local</option>{filteredLocations.map((location) => <option key={location.id} value={location.id}>{location.code} · {location.name}</option>)}</select></label></div></section><section className="approval-list">{error && <p className="login-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}{loading ? <p className="empty-state">Carregando separações...</p> : requests.length === 0 ? <div className="panel empty-panel"><p className="empty-state">Nenhuma requisição aprovada aguardando separação.</p></div> : requests.map((request) => { const item = request.material_request_items[0]; return <article className="panel request-card" key={request.id}><div className="request-card-top"><div><span className="priority-tag normal">Aprovada</span><h2>{item?.materials.name ?? "Material"}</h2><p>{item?.materials.code} · {item?.approved_quantity} {item?.materials.unit} · {request.front || "Sem frente"}</p></div><button className="primary-button" type="button" disabled={!warehouseId || !locationId || issuing === request.id} onClick={() => void issue(request.id)}>{issuing === request.id ? "Separando..." : "Confirmar retirada"}</button></div><div className="request-meta"><span>Serviço <strong>{request.service || "Não informado"}</strong></span><span>Status <strong>Pronta para separação</strong></span></div></article>; })}</section></main>;
}
