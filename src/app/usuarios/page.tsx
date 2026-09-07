"use client";

import { useEffect, useState } from "react";

type User = { id: string; full_name: string; email: string; role: string; confirmed: boolean; lastSignInAt: string | null };
const labels: Record<string, string> = { admin: "Administrador", almoxarife: "Almoxarife", encarregado: "Encarregado", mestre: "Mestre de obras", engenheiro: "Engenheiro", compras: "Compras", qualidade: "Qualidade", financeiro: "Financeiro", gerente: "Gerente", diretoria: "Diretoria", manutencao: "Manutenção" };

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    setError("");
    const response = await fetch("/api/admin/users", { cache: "no-store" });
    const result = (await response.json()) as { users?: User[]; roles?: string[]; error?: string };
    if (!response.ok) setError(result.error ?? "Não foi possível carregar os usuários.");
    setUsers(result.users ?? []);
    setRoles(result.roles ?? []);
    setLoading(false);
  }

  useEffect(() => { void load(); }, []);

  async function updateRole(userId: string, role: string) {
    setError("");
    setMessage("");
    const response = await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, role }) });
    const result = (await response.json()) as { error?: string };
    if (!response.ok) setError(result.error ?? "Não foi possível atualizar o perfil.");
    else { setMessage("Perfil atualizado com sucesso."); await load(); }
  }

  return <main className="materials-page"><header className="materials-header"><div><a className="back-link" href="/">← Voltar ao resumo</a><p className="eyebrow">GOVERNANÇA</p><h1>Usuários e permissões</h1><p className="subtitle">Controle os perfis que podem operar sua empresa.</p></div><div className="top-avatar">MC</div></header>{error && <p className="login-error" role="alert">{error}</p>}{message && <p className="success-message" role="status">{message}</p>}<section className="panel request-panel"><div className="panel-heading"><div><h2>Usuários da empresa</h2><p>{users.length} perfis cadastrados. Alterações são aplicadas no servidor.</p></div><button className="select-button" type="button" onClick={() => void load()}>Atualizar ↻</button></div>{loading ? <p className="empty-state">Carregando usuários...</p> : users.length === 0 ? <p className="empty-state">Nenhum usuário encontrado ou acesso insuficiente.</p> : <div className="materials-table-wrap"><table><thead><tr><th>USUÁRIO</th><th>E-MAIL</th><th>PERFIL</th><th>STATUS</th><th>ÚLTIMO ACESSO</th></tr></thead><tbody>{users.map((user) => <tr key={user.id}><td><strong>{user.full_name}</strong></td><td>{user.email}</td><td><select value={user.role} onChange={(event) => void updateRole(user.id, event.target.value)} aria-label={`Perfil de ${user.full_name}`}>{roles.map((role) => <option key={role} value={role}>{labels[role] ?? role}</option>)}</select></td><td><span className="status-tag">{user.confirmed ? "Confirmado" : "Pendente"}</span></td><td>{user.lastSignInAt ? new Date(user.lastSignInAt).toLocaleString("pt-BR") : "Nunca acessou"}</td></tr>)}</tbody></table></div>}</section></main>;
}
