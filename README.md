# Stockwise

Sistema de almoxarifado inteligente para construção civil. O produto acompanha o material desde a necessidade da obra até a entrada, armazenamento, retirada, consumo, custo e auditoria.

## Estado atual

### Implementado

- Dashboard responsivo com visão de estoque, alertas e movimentações de demonstração.
- Identidade visual Stockwise para operação de almoxarifado.
- Primeira migration PostgreSQL/Supabase com empresas, obras, almoxarifados, materiais, fornecedores, saldos, movimentações, requisições e auditoria.
- Cliente REST tipado para consultas server-side ao Supabase, sem expor a service role.
- Documentação de setup, arquitetura inicial e roadmap.

### Ainda não implementado

- Login e RBAC reais.
- Persistência do dashboard nos dados do Supabase.
- CRUDs de materiais, obras, fornecedores e requisições.
- Fluxos de compra, recebimento, qualidade, ferramentas, EPI, inventário e relatórios.
- PWA/offline, QR Code, anexos e sincronização.

O dashboard atual é uma base visual e usa dados estáticos de demonstração. Essa distinção é importante: a interface não deve ser confundida com um fluxo operacional já conectado ao banco.

## Stack planejada

- **Frontend:** Next.js 16, React 19, TypeScript e CSS.
- **Dados e autenticação:** Supabase (PostgreSQL, Auth e Storage).
- **Deploy:** GitHub como repositório e Vercel como hospedagem do Next.js.
- **Evolução:** PWA com IndexedDB, API server-side, auditoria, filas de sincronização e integração com QR Code.

## Rodar localmente

```bash
npm install
npm run dev
```

Abra `http://localhost:3000`.

Comandos de validação:

```bash
npm run lint
npm run build
```

## Documentação para estudo

- [Guia de configuração](docs/SETUP.md): GitHub, Supabase, Vercel e variáveis locais.
- [Arquitetura e roadmap](docs/ROADMAP.md): como os requisitos do documento mestre serão entregues em etapas.
- [Migration inicial](supabase/migrations/001_initial_schema.sql): modelo relacional e políticas iniciais.

## Regra de publicação

Segredos nunca entram no GitHub. Use `.env.local` localmente e configure as mesmas variáveis no painel da Vercel. O arquivo `.env.example` contém somente nomes de variáveis e pode ser versionado.
