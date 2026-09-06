"use client";

import { useEffect, useState } from "react";

type RequestItem = { requested_quantity: number; materials: { code: string; name: string; unit: string } };
type MaterialRequest = { id: string; priority: string; needed_at: string | null; front: string | null; service: string | null; cost_center: string | null; material_request_items: RequestItem[] };

export default function ApprovalsPage() {
  const [requests, setRequests] = useState<MaterialRequest[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState("");

  async function loadRequests() {
    setLoading(true);
    const response = await fetch("/api/requests/pending", { cache: "no-store" });
    const result = (await response.json()) as { requests?: MaterialRequest[]; error?: string };
    setRequests(result.requests ?? []);
    if (!response.ok) setError(result.error ?? "Não foi possível carregar as requisições.");
    setLoading(false);
  }

  useEffect(() => { void loadRequests(); }, []);

  async function approve(requestId: string, quantity: number) {
    setApproving(requestId);
    setError("");
    setMessage("");
    const response = await fetch("/api/requests/pending", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ requestId, approvedQuantity: quantity }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setError(result.error ?? "Aprovação recusada.");
    else { setMessage("Requisição aprovada."); await loadRequests(); }
    setApproving("");
  }

  return <main className="materials-page"><header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">CONTROLE DE APROVAÇÕES</p><h1>Requisições pendentes</h1><p className="subtitle">Revise as solicitações antes da separação.</p></div><div className="top-avatar">MC</div></header><section className="approval-list">{error && <p className="login-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}{loading ? <p className="empty-state">Carregando requisições...</p> : requests.length === 0 ? <div className="panel empty-panel"><p className="empty-state">Nenhuma requisição pendente.</p></div> : requests.map((request) => { const item = request.material_request_items[0]; return <article className="panel request-card" key={request.id}><div className="request-card-top"><div><span className={`priority-tag ${request.priority}`}>{request.priority === "urgent" ? "Urgente" : request.priority === "scheduled" ? "Programada" : "Normal"}</span><h2>{item?.materials.name ?? "Material"}</h2><p>{item?.materials.code} · {item?.requested_quantity} {item?.materials.unit} · {request.front || "Sem frente"}</p></div><button className="primary-button" type="button" disabled={approving === request.id} onClick={() => item && void approve(request.id, Number(item.requested_quantity))}>{approving === request.id ? "Aprovando..." : "Aprovar"}</button></div><div className="request-meta"><span>Serviço <strong>{request.service || "Não informado"}</strong></span><span>Centro de custo <strong>{request.cost_center || "Não informado"}</strong></span><span>Necessário em <strong>{request.needed_at ? new Date(request.needed_at).toLocaleDateString("pt-BR") : "Sem data"}</strong></span></div></article>; })}</section></main>;
}
