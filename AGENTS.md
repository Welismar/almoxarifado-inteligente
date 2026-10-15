<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Codex engineering standards
- Read README, dependencies, tests and CI before changes.
- Preserve behavior and APIs; keep modifications scoped.
- Validate inputs, handle errors, protect secrets and avoid regressions.
- Run available lint, typecheck, tests and build; report actual outcomes.
- Never merge, deploy or alter production data without explicit approval.
- Preserve the Next.js agent rules above and consult installed Next.js documentation.

## Cloud-first workflow

- Use GitHub as the source of truth. Work in Codex Cloud or another remote ephemeral environment; do not require files, secrets, or tools installed on the user's personal computer.
- Save meaningful work as commits on dedicated branches and submit draft pull requests for review. Do not commit credentials or generated private data.
- Use cloud CI for lint, tests, type checks and builds. Report failures accurately; never bypass checks to claim success.
- Keep setup reproducible from versioned dependency manifests and documented environment variables. Put secrets only in approved cloud secret stores.
- Do not merge, deploy, modify production databases, incur paid cloud resources, or change access controls without explicit approval.
