# Stockwise

Sistema de almoxarifado inteligente para operação de obra e estoque. O projeto acompanha materiais desde a necessidade da obra até a movimentação, requisição, aprovação, consumo e inventário.

## Estado atual

### Implementado e validado

- Login funcional com autenticação real no Supabase.
- Dashboard com visão geral do almoxarifado.
- Cadastro e listagem de materiais.
- Movimentação de estoque com lançamento de entrada e saída.
- Requisição de material com status pendente.
- Aprovação de requisições.
- Inventário com contagem física e aprovação de diferença.
- Integração com Supabase em produção.
- Deploy em Vercel com ambiente configurado.
- Documentação de estudo e organização do projeto.

### Status do projeto

O sistema já foi validado em produção para os ciclos principais do negócio e está preparado como base funcional para estudo e evolução.

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript
- **Backend / dados / auth:** Supabase, PostgreSQL, Auth
- **Deploy:** Vercel

## Estrutura principal

- [src/app](src/app): páginas e rotas do app
- [src/app/api](src/app/api): APIs internas do sistema
- [src/lib](src/lib): utilitários e integrações
- [supabase/migrations](supabase/migrations): migrações SQL do banco
- [docs](docs): documentação e materiais de estudo

## Rodar localmente

```bash
npm install
npm run dev
```

Abra:

```text
http://localhost:3000
```

## Validação de build

```bash
npm run lint
npm run build
```

## Documentação de estudo

- [docs/README-ESTUDO.md](docs/README-ESTUDO.md): resumo do projeto, arquitetura e fluxos
- [docs/SETUP.md](docs/SETUP.md): guia de setup com GitHub, Supabase e Vercel

## Observações importantes

- Segredos e chaves não devem ser enviados ao GitHub.
- As variáveis de ambiente devem ser configuradas localmente e também no painel do Vercel.
- O projeto foi validado como base funcional de gestão de almoxarifado.

## Próximo passo sugerido

Continuar a evolução com refinamento de UX, relatórios, filtros, compras, fornecedores e cotações.
