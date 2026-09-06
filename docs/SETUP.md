# Setup e publicação

Este guia registra o que foi configurado e o que ainda depende de credenciais ou decisões do projeto.

## 1. GitHub

O diretório local começou sem commits e sem remote configurado. Para publicar:

```bash
git init
git add .
git commit -m "chore: inicializa base do Stockwise"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git
git push -u origin main
```

Crie o repositório vazio no GitHub antes do `git remote add`. Não adicione `.env.local`, tokens ou chaves ao commit.

## 2. Supabase

1. Crie um projeto em [supabase.com](https://supabase.com).
2. Abra o SQL Editor.
3. Execute `supabase/migrations/001_initial_schema.sql`.
4. Em **Project Settings > API**, copie a URL e a chave `anon` para `.env.local`.
5. Mantenha a `service_role` apenas em ambiente server-side, se ela for necessária no futuro.

Para aplicar migrations com a CLI do Supabase, depois de instalar e autenticar a CLI:

```bash
supabase link --project-ref SEU_PROJECT_REF
supabase db push
```

## 3. Desenvolvimento local

```bash
copy .env.example .env.local
npm install
npm run dev
```

No PowerShell, `copy` é o alias de `Copy-Item`. Preencha `.env.local` antes de tentar qualquer chamada ao banco.

## 4. Vercel

1. Importe o repositório do GitHub em [vercel.com/new](https://vercel.com/new).
2. Mantenha o framework como Next.js e os comandos padrão.
3. Em **Settings > Environment Variables**, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` para Preview e Production.
4. Faça um novo deploy após salvar as variáveis.
5. Não configure `SUPABASE_SERVICE_ROLE_KEY` enquanto não houver uma rota server-side que realmente precise dela.

## 5. Contrato de autenticação

As rotas server-side usam a chave pública do Supabase e mantêm os tokens em cookies `httpOnly`:

```text
POST /api/auth/login
body: { "email": "usuario@empresa.com", "password": "..." }

GET /api/auth/me
POST /api/auth/logout
```

O usuário precisa existir no Supabase Auth e ter um registro correspondente em `public.profiles` para acessar os dados protegidos pela RLS. A tela de login e o refresh automático da sessão ainda são etapas seguintes.

## 6. Checklist antes de dizer “publicado”

- [ ] `git remote -v` mostra o repositório correto.
- [ ] O primeiro commit está no GitHub.
- [ ] A migration executou sem erro no Supabase.
- [ ] As variáveis da Vercel estão configuradas sem segredos no código.
- [ ] `npm run lint` e `npm run build` passam localmente.
- [ ] A URL de produção abre e não mostra erro no console.

## Estado das integrações nesta data

GitHub e Vercel ainda não estão conectados neste ambiente. O Supabase ainda não tem credenciais nem execução confirmada. A migration e este guia deixam a integração reproduzível, mas não simulam uma publicação que não ocorreu.
