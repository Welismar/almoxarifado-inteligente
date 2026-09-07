import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseRest } from "@/lib/supabase";

type BalanceRow = {
  quantity: number;
  materials: {
    name: string;
    unit: string;
    minimum_stock: number;
    status: "active" | "blocked" | "quarantine" | "inactive";
  };
};

const demoStockItems = [
  { name: "Luva nitrílica", category: "EPI", quantity: 18, minimum: 30, status: "critical" },
  { name: "Papel A4 75g", category: "Escritório", quantity: 124, minimum: 80, status: "healthy" },
  { name: "Detergente neutro", category: "Limpeza", quantity: 42, minimum: 35, status: "attention" },
  { name: "Cabo HDMI 2m", category: "Informática", quantity: 9, minimum: 12, status: "critical" },
];

const movements = [
  { item: "Papel A4 75g", action: "Entrada", amount: "+ 50 un", person: "Mariana Costa", time: "Hoje, 09:42", tone: "in" },
  { item: "Luva nitrílica", action: "Saída", amount: "- 12 un", person: "Rafael Lima", time: "Hoje, 08:15", tone: "out" },
  { item: "Detergente neutro", action: "Entrada", amount: "+ 20 un", person: "Mariana Costa", time: "Ontem, 16:30", tone: "in" },
];

export default async function Home() {
  const cookieStore = await cookies();
  const accessToken = cookieStore.get("stockwise-access-token")?.value;

  if (!accessToken) {
    redirect("/login");
  }

  let stockItems = demoStockItems;

  try {
    const balances = await supabaseRest<BalanceRow>("stock_balances", {
      select: "quantity,materials(name,unit,minimum_stock,status)",
      accessToken,
    });

    if (balances.length > 0) {
      stockItems = balances.slice(0, 4).map((balance) => ({
        name: balance.materials.name,
        category: "Material",
        quantity: Number(balance.quantity),
        minimum: Number(balance.materials.minimum_stock),
        status: balance.materials.status === "active" ? "attention" : "critical",
      }));
    }
  } catch {
    // A demo view keeps the dashboard useful before the first database seed.
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">+</span><span>stock<span className="brand-accent">wise</span></span></div>
        <div className="workspace"><span className="workspace-dot" /> Operação central <span className="chevron">⌄</span></div>
        <nav className="nav-list" aria-label="Navegação principal">
          <a className="nav-item active" href="#resumo"><span className="nav-icon">⌂</span> Visão geral</a>
          <a className="nav-item" href="/materiais"><span className="nav-icon">▦</span> Estoque <span className="nav-badge">2</span></a>
          <a className="nav-item" href="/movimentacoes"><span className="nav-icon">↕</span> Movimentações</a>
          <a className="nav-item" href="/requisicoes"><span className="nav-icon">✎</span> Requisições</a>
          <a className="nav-item" href="/aprovacoes"><span className="nav-icon">✓</span> Aprovações</a>
          <a className="nav-item" href="/alertas"><span className="nav-icon">⚠</span> Alertas</a>
          <a className="nav-item" href="/reservas"><span className="nav-icon">◍</span> Reservas</a>
          <a className="nav-item" href="/separacao"><span className="nav-icon">▣</span> Separação</a>
          <a className="nav-item" href="/kardex"><span className="nav-icon">▤</span> Kardex</a>
          <a className="nav-item" href="/inventario"><span className="nav-icon">⊞</span> Inventário</a>
          <a className="nav-item" href="/fornecedores"><span className="nav-icon">♧</span> Fornecedores</a>
          <a className="nav-item" href="/compras"><span className="nav-icon">$</span> Compras</a>
          <a className="nav-item" href="/cotacoes"><span className="nav-icon">≋</span> Cotações</a>
          <a className="nav-item" href="/compras/comparar"><span className="nav-icon">⇄</span> Comparar compras</a>
          <a className="nav-item" href="/pedidos"><span className="nav-icon">▣</span> Pedidos</a>
        </nav>
        <div className="nav-section">GESTÃO</div>
        <nav className="nav-list">
          <a className="nav-item" href="/relatorios/estoque"><span className="nav-icon">▤</span> Relatórios</a>
          <a className="nav-item" href="/relatorios/consumo"><span className="nav-icon">◒</span> Consumo e perdas</a>
          <a className="nav-item" href="/dashboard"><span className="nav-icon">◎</span> Dashboard</a>
          <a className="nav-item" href="/filiais"><span className="nav-icon">▣</span> Filiais</a>
          <a className="nav-item" href="/auditoria"><span className="nav-icon">◌</span> Auditoria</a>
          <a className="nav-item" href="/integracao"><span className="nav-icon">⇄</span> Integração</a>
          <a className="nav-item" href="/reposicao"><span className="nav-icon">⟲</span> Reposição</a>
          <a className="nav-item" href="#configuracoes"><span className="nav-icon">⚙</span> Configurações</a>
        </nav>
        <div className="sidebar-footer"><div className="user-avatar">MC</div><div><strong>Mariana Costa</strong><small>Administrador</small></div><span className="more">•••</span></div>
      </aside>

      <main className="main-content" id="resumo">
        <header className="topbar"><div className="breadcrumb">Operação central <span>/</span> <strong>Visão geral</strong></div><div className="top-actions"><button className="icon-button" aria-label="Notificações">♢<i /></button><div className="top-avatar">MC</div></div></header>
        <section className="page-heading"><div><p className="eyebrow">SEGUNDA-FEIRA, 06 DE MAIO DE 2024</p><h1>Bom dia, Mariana <span>✦</span></h1><p className="subtitle">Aqui está o resumo do seu almoxarifado hoje.</p></div><button className="primary-button"><span>＋</span> Nova movimentação</button></section>

        <section className="metrics" aria-label="Indicadores do estoque">
          <article className="metric-card"><div className="metric-icon teal">▦</div><div><span>Itens em estoque</span><strong>1.284</strong><small className="positive">↗ 8,2% <em>vs. mês anterior</em></small></div></article>
          <article className="metric-card"><div className="metric-icon coral">!</div><div><span>Estoque baixo</span><strong>07</strong><small className="negative">↑ 2 itens <em>precisam de atenção</em></small></div></article>
          <article className="metric-card"><div className="metric-icon gold">↕</div><div><span>Movimentações</span><strong>46</strong><small className="positive">↗ 12,5% <em>nos últimos 7 dias</em></small></div></article>
          <article className="metric-card"><div className="metric-icon blue">R$</div><div><span>Valor em estoque</span><strong>R$ 48,6k</strong><small className="positive">↗ 4,1% <em>vs. mês anterior</em></small></div></article>
        </section>

        <section className="content-grid">
          <article className="panel chart-panel"><div className="panel-heading"><div><h2>Movimentações</h2><p>Entradas e saídas nos últimos 30 dias</p></div><button className="select-button">Últimos 30 dias <span>⌄</span></button></div><div className="chart-legend"><span><i className="legend-in" /> Entradas</span><span><i className="legend-out" /> Saídas</span></div><div className="chart"><div className="y-axis"><span>80</span><span>60</span><span>40</span><span>20</span><span>0</span></div><div className="plot"><div className="grid-line l1" /><div className="grid-line l2" /><div className="grid-line l3" /><div className="grid-line l4" /><div className="bars">{[42, 62, 38, 72, 55, 47, 86, 60, 76, 52, 66, 44, 74, 59, 82, 50, 64, 40, 70, 56].map((height, index) => <div className="bar-group" key={index}><div className="bar in" style={{ height: `${height}%` }} /><div className="bar out" style={{ height: `${Math.max(18, height - 27)}%` }} /></div>)}</div><div className="x-axis"><span>07 abr</span><span>14 abr</span><span>21 abr</span><span>28 abr</span><span>05 mai</span></div></div></div></article>
          <article className="panel alerts-panel" id="estoque"><div className="panel-heading"><div><h2>Alertas de estoque</h2><p>Itens que precisam de atenção</p></div><a className="text-link" href="#estoque">Ver estoque <span>→</span></a></div><div className="alert-list">{stockItems.slice(0, 3).map((item) => <div className="alert-row" key={item.name}><div className={`item-symbol ${item.status}`}>{item.name.slice(0, 1)}</div><div className="item-info"><strong>{item.name}</strong><span>{item.category}</span></div><div className="stock-amount"><strong>{item.quantity} un</strong><div className="progress"><i className={item.status} style={{ width: `${Math.min(100, (item.quantity / item.minimum) * 100)}%` }} /></div><small>Mín. {item.minimum} un</small></div></div>)}</div></article>
        </section>

        <section className="panel movements-panel" id="movimentacoes"><div className="panel-heading"><div><h2>Movimentações recentes</h2><p>Últimas entradas e saídas registradas</p></div><a className="text-link" href="#movimentacoes">Ver todas <span>→</span></a></div><div className="table-wrap"><table><thead><tr><th>ITEM</th><th>TIPO</th><th>QUANTIDADE</th><th>RESPONSÁVEL</th><th>DATA</th></tr></thead><tbody>{movements.map((movement) => <tr key={`${movement.item}-${movement.time}`}><td><strong>{movement.item}</strong></td><td><span className={`movement-tag ${movement.tone}`}>{movement.tone === "in" ? "↑" : "↓"} {movement.action}</span></td><td className={`amount ${movement.tone}`}>{movement.amount}</td><td>{movement.person}</td><td className="muted">{movement.time}</td></tr>)}</tbody></table></div></section>
        <footer className="page-footer"><span>Stockwise v1.0</span><span>Dados atualizados há 2 min <i className="status-dot" /></span></footer>
      </main>
    </div>
  );
}
