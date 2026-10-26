---
name: "ponytail-review"
description: "Use to review a diff or a whole repo for over-engineering (what to delete or simplify), or to list deferred 'ponytail:' shortcuts. Triggers: 'is this over-engineered', 'what can we delete', 'find bloat', 'ponytail debt'."
---

# Ponytail review, audit and debt

Three one-shot reports about complexity. None of them applies fixes; they list findings. Scope is over-engineering only: correctness bugs, security holes and performance go to a normal review (code-review, superpowers:requesting-code-review). Explain in Portuguese, keep the finding lines as below.

## Tags (all modes)

- `delete:` dead code, unused flexibility, speculative feature. Replacement: nothing.
- `stdlib:` hand-rolled thing the standard library ships. Name the function.
- `native:` dependency or code doing what the platform already does. Name the feature.
- `reuse:` equivalent helper, util, or pattern already in this repo. Name the path.
- `yagni:` abstraction with one implementation, config nobody sets, layer with one caller.
- `shrink:` same logic, fewer lines. Show the shorter form.

## Mode 1 - Review a diff

Use for a pull request, the current changes, or "is this over-engineered". One line per finding: `L<line>: <tag> <what>. <replacement>.` (or `<file>:L<line>: ...` for multi-file diffs).

Examples:
- `L12-38: stdlib: 27-line validator class. "@" in email, 1 line, real validation is the confirmation mail.`
- `L4: native: moment.js imported for one format call. Intl.DateTimeFormat, 0 deps.`
- `L18-29: reuse: slugify helper duplicates src/lib/slug.ts slugify. Delete it, import the existing one.`

End with `net: -<N> lines possible.` Nothing to cut: `Lean already. Ship.`

## Mode 2 - Audit the whole repo

Use for "audit this codebase", "find bloat", "what can I delete from this repo". Hunt: deps the stdlib or platform already ships, single-implementation interfaces, factories with one product, wrappers that only delegate, files exporting one thing, dead flags and config, hand-rolled stdlib, duplicated helpers. Before emitting `delete:`, grep the whole tree for the symbol, including tests, fixtures and string or dynamic references.

One line per finding, ranked biggest cut first: `<tag> <what to cut>. <replacement>. [path]`. End with `net: -<N> lines, -<M> deps possible.`

For a full correctness and security audit of a large repo, cartographer is the right tool; this mode only hunts complexity.

## Mode 3 - Debt ledger

Use for "ponytail debt", "what did we defer", "list the shortcuts". Grep for markers, skipping dependencies and build output:

```bash
grep -rnE --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=build --exclude-dir=.next '(#|//|/[*]|--) ?ponytail:' .
```

One row per marker, grouped by file: `<file>:<line>, <what was simplified>. ceiling: <limit>. upgrade: <trigger>.` Tag any marker with no upgrade path or trigger as `no-trigger`. End with `<N> markers, <M> with no trigger.` Nothing found: `No ponytail: debt. Clean ledger.` Write it to `PONYTAIL-DEBT.md` only if the user asks.

## Boundaries

A single smoke test or assert-based self-check is the ponytail minimum, never flag it for deletion.

Source: DietrichGebert/ponytail (ponytail-review, ponytail-audit, ponytail-debt; MIT).