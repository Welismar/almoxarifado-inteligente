---
name: "grill-me"
description: "Use automatically when the user shares a non-code plan, project, idea, strategy or decision still open (business, career, content, life) to stress-test it with rounds of questions. Also on 'grill me'."
---

Use this skill on your own initiative, without waiting for the user to say "grill me", whenever the user presents a plan, project, idea, strategy or decision that is still open and is not a software feature or code change. Skip it when the user only wants a quick fact, asks you to carry out something already decided, or says they don't want questions.

For a software feature or code change, `superpowers:brainstorming` leads instead (see the dev-workflow skill). Use grill-me for code only when the user explicitly says "grill me".

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled: the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round: number each question and give your recommended answer. Then wait for the user's answers before the next round.

Format a round like so:

```
❓ **Q1** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>

---

❓ **Q2** - **<question title>**: <question body, might be multiple paragraphs, including multiple choices>

➡️ <your recommended answer>
```

Each round the user answers reshapes the tree: settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it; don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report; ask the rest of the frontier now. The _decisions_ are the user's: put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

Source: adapted from mattpocock/skills (grill-me + grilling).