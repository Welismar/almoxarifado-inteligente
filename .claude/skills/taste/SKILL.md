---
name: "taste"
description: "Use automatically when building or redesigning a landing page, marketing site, portfolio, product page or other visual web page, so it looks distinctive and not AI-templated. Not for dashboards or admin UI."
---

# Taste (bootstrap)

Anti-slop design rules for landing pages, portfolios and redesigns: brief inference, three design dials, design-system choice, layout discipline, AI-tell bans and a strict pre-flight check. The full rules (about 1,200 lines) live in the upstream repo, pinned to a reviewed version.

## When to use it

- Landing pages, marketing sites, product pages, portfolios, editorial pages, and redesigns of those.
- Not for dashboards, admin panels, data tables, multi-step forms or app screens: use the built-in `frontend-design` skill for those.
- If the user gave a screenshot or mockup to copy, the image-to-code skill leads and this skill supplies the quality rules.

## Step 1 - Load the pinned rules

```bash
SRC="$HOME/.cache/claude-skill-sources/taste-skill"
SHA=ce26fc25c0e5e8cab638f883de62d9a86ee5e45b
if [ "$(git -C "$SRC" rev-parse HEAD 2>/dev/null)" != "$SHA" ]; then
  rm -rf "$SRC" && git init -q "$SRC" && git -C "$SRC" remote add origin https://github.com/leonxlnx/taste-skill.git
  git -C "$SRC" fetch -q --depth 1 origin "$SHA" && git -C "$SRC" checkout -q FETCH_HEAD
fi
echo "$SRC/skills/taste-skill/SKILL.md"
```

Read that file in full (it is long; read it in pages) and follow it as if it were this skill. Do not update the pinned commit on your own: a newer upstream version has not been reviewed.

## Step 2 - Adjustments for this user

- Write visible copy in the user's language (usually Brazilian Portuguese) and apply the humanizer skill to it. The em-dash ban in the rules matches the humanizer.
- Images: there is usually no image-generation tool here. Use the user's own assets first, then `https://picsum.photos/seed/<descriptive-seed>/<w>/<h>` placeholders, and list at the end which real images the page still needs.
- Logo walls: use real logos only for brands that actually are the user's customers or partners; never invent "trusted by" claims with real company logos.
- When the page runs locally, check it in a real browser with the playwright-cli skill (desktop and mobile widths, light and dark mode) before calling it done, then run the web-design-guidelines review.
- If a design-md reference was chosen, it sets the visual direction; these rules still apply on top.

Source: leonxlnx/taste-skill (MIT), pinned at ce26fc2.