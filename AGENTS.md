<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Instruções para agentes de IA

Stockwise: almoxarifado inteligente para obra e estoque (Next.js + Supabase).

## Regras que valem para qualquer IA (Claude, Codex e outras)
- **Segredos nunca** em código, commit, log ou resposta: tokens, senhas, chaves de API, `.env`. Variável nova vai documentada sem valor (ex.: `.env.example`).
- **Dados reais nunca** no repositório: planilhas de clientes/funcionários, PDFs de obra, exportações de banco. Use dados fictícios nos testes.
- Trabalhe numa **branch** (`claude/...` ou `codex/...`). **Nada de merge na branch principal, deploy ou mudança de configuração em produção sem pedido explícito do dono.**
- Não apague arquivos, tabelas ou dados sem o dono confirmar.
- Antes de começar: leia o `README.md` e a pasta `docs/` e veja os commits recentes e as branches abertas, para não refazer nem desfazer trabalho de outra IA.
- Cada mudança com teste ou verificação. Ao terminar, diga ao dono o que mudou e qual branch está pronta.

## Específico deste projeto
- O bloco do Next.js acima vale: confira a documentação da versão instalada em `node_modules/next/dist/docs/` antes de usar uma API.
- Banco no Supabase: mudanças só por migração em `supabase/`, nunca SQL solto em produção; mantenha o RLS ligado em todas as tabelas.
- Comandos: `npm ci`, `npm run lint`, `npm run build`.
