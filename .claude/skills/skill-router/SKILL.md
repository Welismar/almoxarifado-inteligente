---
name: skill-router
description: Use automatically at the start of every conversation or new task, in any app (claude.ai, desktop, mobile, Claude Code), to pick which installed skill fits each moment and to flag missing plugins.
---

# Skill router: the right skill at each moment

The user installed many skills and wants each one used on its own, at the right moment, in every place they log in. This skill is the map. It is a quick check, not a ceremony: decide silently, load only what the moment needs, never announce which skill you picked unless asked. Talk to the user in Portuguese.

(This skill replaces the earlier `autopilot`, renamed because `autopilot` collides with a built-in Claude Code command that some environments disable.)

## Routing map

| Moment | Skill |
|---|---|
| Any programming task (code, bug, Supabase, Vercel, UI, tests, review) | `dev-workflow`, which routes every coding stage (ponytail, vercel-react, superpowers, taste, image-to-code, playwright-cli, web-design-guidelines, cartographer, code-review...) |
| Starting or bringing a new project of any kind | `find-skills` (project scan, once per project) |
| A plan, idea, strategy or decision that is still open and is not code | `grill-me` |
| "Seja sincero", "critica", "roast", feedback on an idea, text, page or offer | `roast` |
| Writing prose the user will send or publish (email, post, message, doc, README, PR text) | `humanizer` (embedded mode: deliver only the clean text) |
| A huge log, document, JSON or CSV | `headroom:headroom` |
| A folder of documents, papers or images to map | `graphify` |
| A site in the style of a known product, or a DESIGN.md | `design-md` |
| Tasks, to-dos, daily planning (only if the user asks) | `productivity` skills |

One skill per job. If two seem to fit, use the more specific one. Simple questions and casual chat need no skill at all: answer directly.

## Where the user is

The user's skills and plugins live in their claude.ai account. They load in the claude.ai app, the desktop app and mobile, and they sync into Claude Code terminal sessions where the user is signed in with that account (Claude Code v2.1.273 or later; synced plugins show as `<name>@synced`).

When this conversation runs in Claude Code and a skill the map calls for is missing (for example any `superpowers:`, `supabase:`, `code-review:`, `cartographer:`, `headroom:` or `claude-code-setup:` skill):

1. Do the task anyway with what is available; never block on it.
2. Tell the user once per conversation, in one or two lines, the likely cause and fix: update Claude Code (`claude update`), sign in with the claude.ai account (`/login`), then run `/reload-plugins`. If that does not bring them back on this surface, install them once on this computer: `/plugin`, Discover tab, install at user scope (the terminal, desktop Code tab and VS Code share those settings).
3. Do not repeat the reminder after the user has seen it.

If a skill call fails because the skill is disabled in this environment's settings, continue without it and mention it once.

Cloud sessions at claude.ai/code and the Claude GitHub app read the repository rather than the user's computer. The user's repositories carry a copy of the skills in `.claude/skills/`; if the user changes a skill in their account, offer once to sync that copy.

## Guardrails that apply everywhere

- Never install anything without the user's approval on an install card or their explicit request.
- Before any change to real Supabase data, production schema, Vercel environment variables or deploys, show what will change and wait for confirmation.
- Never print secrets (keys, tokens, passwords) in the chat.
- Ruflo AI Team is installed but optional: use it only when the user explicitly asks for an AI team. For parallel work, superpowers already covers it.
