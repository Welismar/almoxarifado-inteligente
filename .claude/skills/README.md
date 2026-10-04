# Skills do Claude para este projeto

Esta pasta guarda as skills que o Claude usa automaticamente ao trabalhar neste repositório. Ela existe para que o mesmo comportamento valha também no Claude Code na nuvem (claude.ai/code) e no app do Claude no GitHub, que leem o repositório em vez da sua conta.

- `autopilot`: escolhe a skill certa para cada momento.
- `dev-workflow`: define qual skill cuida de cada etapa da programação.
- `ponytail` e `ponytail-review`: código mínimo e revisão de excesso de complexidade.
- `vercel-react`: regras da Vercel para React, Next.js e React Native.
- `taste`, `image-to-code`, `design-md`, `web-design-guidelines`: design e revisão de interface.
- `playwright-cli`: testes no navegador.
- `find-skills`, `humanizer`, `grill-me`, `roast`, `graphify`: busca de skills, textos, planos, críticas e mapas de documentos.

As skills `taste`, `playwright-cli`, `design-md` e `vercel-react` baixam o conteúdo completo do GitHub numa versão fixa e revisada.

Os plugins (Superpowers, Supabase, code-review, cartographer, Headroom, claude-code-setup) não ficam nesta pasta: eles vêm da sua conta do claude.ai quando você entra no Claude Code com ela.

Para atualizar esta pasta, edite as skills na sua conta e peça ao Claude para sincronizar o kit de novo.
