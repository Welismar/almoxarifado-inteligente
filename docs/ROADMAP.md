# Arquitetura e roadmap

## Limite da entrega atual

A tela existente é um dashboard de demonstração. A migration inicial é a primeira camada persistente. Não há API ou autenticação conectada ainda.

## Ordem de construção

### Fase 1: fundação

- [x] Dashboard responsivo e identidade visual.
- [x] Modelo inicial multiempresa/multiobra.
- [x] Saldos e movimentações imutáveis no banco.
- [x] Auditoria de eventos.
- [x] Cliente REST Supabase no Next.js, com variáveis de ambiente e token opcional.
- [x] Rotas base de login, sessão atual e logout com Supabase Auth.
- [x] Tela de login responsiva integrada às rotas de autenticação.
- [x] Proteção automática do dashboard e endpoint de refresh da sessão.
- [x] Alertas do dashboard alimentados por saldos reais do Supabase, com fallback demo.

### Fase 2: rotina do almoxarife

- [x] CRUD inicial de materiais com leitura e cadastro protegidos por sessão/RLS.
- [x] API transacional de movimentações com saldo não negativo e auditoria.
- [x] Tela de entrada/saída com seleção de obra, almoxarifado, local e material.
- [x] Criação de requisição com prioridade, frente, serviço e centro de custo.
- [x] Aprovação de requisição com controle de perfil e auditoria.
- [x] Separação/picking e baixa vinculada à requisição.
- [x] Kardex por material com saldo acumulado e histórico imutável.
- [x] Filtros de Kardex por obra, período, lote e tipo.
- [x] Exportação CSV do Kardex.
- [ ] Exportação PDF e relatórios avançados.
- [x] Relatório de posição de estoque com impressão para PDF.
- [x] Relatório de consumo e perdas por material, obra e período.
- [ ] CRUD de obras, locais, categorias e fornecedores.
- [x] Cadastro e listagem de fornecedores com isolamento por empresa.
- [x] Solicitação de compra vinculada à obra e ao material.
- [x] Cotação vinculada à solicitação e ao fornecedor.
- [x] Comparação e seleção de cotação com criação automática do pedido.
- [ ] Aprovação financeira, envio e recebimento do pedido.
- [x] Aprovação financeira, envio e recebimento do pedido com entrada transacional no estoque.
- [ ] Entrada com nota fiscal, lote, validade e quarentena.
- [ ] Requisição, aprovação, separação e saída.
- [ ] Devolução, perda, avaria e transferência.
- [ ] Kardex por material.

### Fase 3: controle da obra

- [ ] Frentes, serviços e centros de custo.
- [ ] Orçado x realizado e consumo por obra.
- [ ] Inventário geral, parcial e cíclico.
- [ ] Curvas ABC/XYZ e materiais parados.
- [ ] Relatórios CSV/PDF.

### Fase 4: ativos e qualidade

- [ ] Ferramentas, kits, equipamentos e locações.
- [ ] Manutenção e calibração com bloqueios de uso.
- [ ] EPI, CA, entrega e substituição.
- [ ] Certificados, documentos e não conformidades.
- [ ] QR Code por item, localização e kit.

### Fase 5: operação resiliente

- [x] Manifest e service worker para instalação PWA e fallback básico.
- [x] IndexedDB e sincronização automática para movimentações offline.
- [x] Fila offline para movimentações e requisições.
- [ ] Fila offline para inventário, fotos e anexos.
- [x] Inventário por contagem física com cálculo de diferença e fila offline.
- [ ] Aprovação de divergência e ajuste de estoque.
- [ ] Fila idempotente de sincronização.
- [ ] Fotos e documentos no Supabase Storage.
- [ ] Notificações e assistente de IA com escopo por permissão.

## Decisões de domínio

1. Movimentação de estoque não deve ser apagada; correções geram novo evento e auditoria.
2. O saldo atual é uma projeção das movimentações, não o histórico.
3. Toda saída precisa de obra, responsável e contexto de consumo quando aplicável.
4. Material bloqueado ou em quarentena não pode ser separado.
5. A empresa é o limite de isolamento dos dados; a obra organiza o contexto operacional.

## Fluxo que deve ser implementado primeiro

`material -> entrada -> saldo -> requisição -> aprovação -> saída -> kardex`

Esse fluxo entrega valor real ao almoxarife antes de expandir para ferramentas, EPI e IA.
