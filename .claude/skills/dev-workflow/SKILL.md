---
name: dev-workflow
description: Use automatically at the start of any programming task (writing, fixing, debugging, reviewing or planning code, Supabase or Vercel work) to pick which installed skill handles each stage, so skills don't compete.
---

# Programming workflow: which skill for which stage

The user has several plugins that overlap. This skill decides which one leads at each stage of a programming task. Use exactly one skill per stage; do not run two skills for the same job. Talk to the user in Portuguese, briefly, and do not narrate which skill you loaded unless asked.

## First, the project's own rules

- If the repository has a `CLAUDE.md`, read it first: its commands (test, lint, build, run) and rules take precedence over generic defaults.
- If it has none, do the task, then offer once to write a short `CLAUDE.md` (stack, commands, project rules, files to never touch) from what you learned, delivered as a commit or pull request the user approves.

## Always on while coding

- `ponytail` (level full): the simplest solution that works, reuse before writing, no speculative abstractions. It shapes every stage below; it never skips understanding the problem, tests, validation, security or accessibility.
- `vercel-react` whenever the code is React, Next.js or React Native/Expo.
- `find-skills` once at the start of a new project, to suggest skills for its stack.

## Stage map

| Stage | Use | Do not use |
|---|---|---|
| A feature or change that is not yet defined | `superpowers:brainstorming`, then `superpowers:writing-plans` | grill-me (it is for non-code plans) |
| Carrying out an agreed plan | `superpowers:executing-plans` (one track) or `superpowers:subagent-driven-development` (independent parts) | |
| Writing a feature or a bug fix | `superpowers:test-driven-development`, with `ponytail` keeping the code and the test set minimal. When the project's tooling cannot test the change directly (for example a React component in a project without a component test setup), the failing-then-passing check can be the linter, type checker or build; do not add a test framework just for one change | |
| A bug, error or unexpected behavior | `superpowers:systematic-debugging`; if the evidence is a large log or data file, read it with `headroom:headroom` first; for UI bugs reproduce them in a browser with `playwright-cli` | guessing a fix before finding the cause |
| Landing page, marketing site, portfolio, product page or redesign of one | `taste`; if the user wants the look of a known product, load `design-md` first for the reference | |
| Building from a screenshot, mockup, sketch or Figma export | `image-to-code` (with `taste` for anything the image leaves undefined) | |
| App screens, dashboards, admin panels, forms | built-in `frontend-design` | taste (it is for marketing pages) |
| React or Next.js performance, data fetching, bundle size, component APIs, view transitions, React lint warnings | `vercel-react` | |
| Anything touching Supabase | `supabase:supabase`; before any schema, migration, RLS or SQL change also load `supabase:supabase-postgres-best-practices` | |
| Deploy or runtime problems on Vercel | read the deployment build output and runtime logs with the Vercel tools before changing configuration | |
| Understanding how a codebase is structured | `cartographer:map` | graphify (it is for documents and mixed folders) |
| Full audit of a whole repository (bugs, security, consistency) | `cartographer:cartographer` (it asks for opt-in first because it is expensive) | |
| "Is this over-engineered", "what can we delete", bloat audit, deferred shortcuts | `ponytail-review` (diff, repo audit or debt ledger) | |
| Reviewing a pull request | `code-review:code-review` for correctness; add `ponytail-review` for complexity only if asked | |
| Checking your own finished changes before calling them done | `superpowers:requesting-code-review` | |
| Setting up Claude Code for a project | `claude-code-setup:claude-automation-recommender` | |
| End-to-end browser tests | `playwright-cli` | |
| Before saying the work is done or fixed | `superpowers:verification-before-completion`: run the tests or commands and show the result. For UI work also open the page with `playwright-cli` (desktop and mobile, light and dark) and run `web-design-guidelines` on the changed files. If the browser check is impossible here (it needs a camera, real hardware, a login you must not use, or a backend you cannot start), say so plainly and give the user a short manual check to do before merging | claiming success without evidence |
| Commit messages, PR descriptions, README text | write them in embedded mode of the humanizer skill | |

## Safety rules

- Supabase and Vercel tools act on the user's real projects. Before any change that deletes or rewrites data, alters a production schema, changes environment variables or redeploys, show what will change and wait for the user's confirmation.
- Prefer a Supabase development branch or local testing over changing the production database directly.
- Never print secret values (keys, tokens, passwords) in the chat.
- Never type real passwords, card numbers or personal data into a page during browser tests; use test accounts or mocks.
- Deliver code changes to the user's repositories as a branch and pull request, never by pushing to the main branch.
- Skills that fetch from GitHub (taste, playwright-cli, design-md, vercel-react) are pinned to reviewed commits; never move them to a newer commit without the user's approval.

## Conversations without programming

When the conversation has no programming task (writing, research, everyday questions), do not load superpowers, ponytail or vercel-react skills, including `superpowers:using-superpowers`. They are meant for coding sessions and only add cost elsewhere.