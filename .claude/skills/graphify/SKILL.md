---
name: "graphify"
description: "Use when the user wants a knowledge graph of a folder of documents, papers, images or video, or of a mixed folder of code plus docs, or asks about a project where graphify-out/ exists. Also on /graphify."
---

# graphify (bootstrap)

This skill turns a folder of docs, papers, images, video or mixed content into a queryable knowledge graph (interactive HTML, graph.json and a plain-language GRAPH_REPORT.md). The full, always up-to-date instructions ship inside the `graphifyy` Python package, so this file only installs the package and loads them.

## When to use it on your own

Use it without waiting for "/graphify" when the user:
- wants a map or overview of a set of documents, papers, notes, images or video, or of a folder that mixes code with such material;
- attaches or points to such a folder and asks questions about its content as a whole;
- asks anything about a project where `graphify-out/graph.json` already exists (then go straight to the query flow).

Do not use it for a codebase that is only code: `cartographer:map` maps code structure without downloading anything, and `cartographer:cartographer` handles full audits. For a one-off question about a single small file, just read the file.

## Step 1 - Install and locate the instructions

Run:

```bash
python3 -c "import graphify" 2>/dev/null || python3 -m pip install -q graphifyy 2>/dev/null || python3 -m pip install -q --break-system-packages graphifyy
GRAPHIFY_DIR=$(python3 -c "import graphify, os; print(os.path.dirname(graphify.__file__))")
echo "$GRAPHIFY_DIR"
```

Note the printed path. Call it GRAPHIFY_DIR below.

## Step 2 - Load and follow the full skill

Read `GRAPHIFY_DIR/skill.md` in full and follow it exactly as if it were this skill, with these adjustments:
- Wherever it says `references/<file>.md`, read `GRAPHIFY_DIR/skills/claude/references/<file>.md` instead. The extraction spec path (SPEC_PATH) is `GRAPHIFY_DIR/skills/claude/references/extraction-spec.md`.
- Its Step 1 interpreter detection can be replaced by `python3`, since the package is already installed for that interpreter.
- Network access may be limited to package registries and GitHub. If a step needs another site (for example `graphify add <url>`), say so and ask the user to attach the file instead.
- The user is in a chat app, not a terminal. When the graph is built, send the generated `graphify-out/graph.html` and `GRAPH_REPORT.md` to the user as files, and summarize the main findings in plain language in the user's language.

Source: adapted from safishamsi/graphify (Graphify Labs, MIT license).