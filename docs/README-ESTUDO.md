# Stockwise — documentação de estudo

## Objetivo do projeto

Stockwise é uma aplicação para gestão de almoxarifado em obras e operações de campo. O sistema cobre os principais ciclos da operação de materiais: cadastro, movimentação, requisição, aprovação, consumo e inventário.

---

## Stack principal

- Next.js
- React
- TypeScript
- Supabase
- PostgreSQL
- Vercel

---

## Estrutura da aplicação

- src/app
  - páginas e rotas da aplicação
- src/app/api
  - APIs internas para autenticação, materiais, movimentações, requisições e inventário
- src/lib
  - utilitários compartilhados, como conexões e fila offline
- supabase/migrations
  - scripts SQL de criação do banco e regras de negócio
- public
  - arquivos públicos

---

## Fluxos implementados e validados

### 1. Autenticação
- login com e-mail e senha
- criação de sessão com cookies HTTP-only
- acesso restrito por token

### 2. Dashboard
- visão geral do estoque
- KPIs do almoxarifado
- alertas de materiais com atenção
- movimentações recentes

### 3. Materiais
- listagem e cadastro de materiais
- vinculação com empresa e obra
- controle de mínimos e custo médio

### 4. Movimentação
- entrada
- saída
- devolução
- perda
- atualização de saldos

### 5. Requisição
- criação de solicitação de material
- prioridade, obra, centro de custo e observações
- status pendente

### 6. Aprovação
- aprovação da requisição
- mudança de status para aprovado

### 7. Inventário
- contagem física
- comparação com sistema
- divergência e aprovação

---

## Fluxo prático validado

Foi validado com sucesso em produção o ciclo:

1. login
2. listagem de opções do estoque
3. movimentação de entrada
4. requisição de material
5. aprovação da requisição
6. saída/consumo do material
7. contagem de inventário
8. aprovação da diferença em inventário

---

## Arquitetura de dados

### Entidades principais
- companies
- profiles
- projects
- warehouses
- locations
- materials
- stock_balances
- stock_movements
- material_requests
- material_request_items
- inventory_count
- inventory_items

### Regras importantes
- cada usuário deve estar ligado a um perfil e empresa
- cada material está vinculado ao contexto da companhia
- obras e almoxarifados devem respeitar vinculação correta
- movimentações e inventários devem ser audíveis
- o saldo deve ser atualizado pela regra de negócio e não apenas no frontend

---

## Observações de implementação

### Auth e sessão
A autenticação usa Supabase Auth e grava tokens em cookies do lado do servidor. Isso é importante por segurança e também por permitir acesso às rotas protegidas no ambiente do Next.js.

### Banco e regras de negócio
As regras de operação mais sensíveis ficam no banco, por meio de SQL e RPCs. Isso reduz risco de inconsistência e mantém o comportamento consistente em qualquer cliente.

### Produção
Para funcionar em produção, é necessário configurar corretamente as variáveis de ambiente no Vercel e no ambiente local.

---

## Ambiente local

```bash
npm install
npm run dev
```

Acesse:

```text
http://localhost:3000
```

---

## Validação de build

```bash
npm run lint
npm run build
```

---

## Ponto de atenção para estudo futuro

O projeto ficou em uma boa base funcional, mas ainda existem áreas para evolução:

- UX refinada dos módulos
- relatórios mais completos
- filtros por data, projeto e material
- compras, fornecedores e cotações
- sincronização offline
- QR Code e anexos
- auditoria mais robusta

---

## Conclusão

Stockwise é um projeto completo como base de estudo para aplicações de gestão de almoxarifado com Next.js e Supabase. Ele demonstra o uso de autenticação real, dados transacionais, regras de negócio, integração com banco e validação em produção.
