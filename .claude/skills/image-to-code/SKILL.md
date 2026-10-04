---
name: "image-to-code"
description: "Use automatically when the user shares a screenshot, mockup, Figma export, sketch or photo of a web page or screen and wants it built as code, or asks to make their page look like an image."
---

# Image to code

Turn a reference image into a faithful, working frontend. The image is the design source; the code is the translation. Adapted from leonxlnx/taste-skill (image-to-code, MIT), rewritten for working from the user's own images, because no image-generation tool is usually available here.

## When to use it

- The user attaches or links a screenshot, mockup, wireframe, Figma/Canva export, hand sketch or photo of a UI and wants it implemented.
- The user asks to change an existing page so it looks like an image.
- If an image-generation tool is available and the user wants a new design without a reference, you may generate one reference image per section first, then follow the same steps. Otherwise build directly with the taste skill.

## Whose design it is

Build freely from the user's own designs, sketches and mockups. If the image is a screenshot of another company's real site, use it as layout and style inspiration only: replace their name, logo, wordmark, product photos and copy with the user's own, and do not produce a page that could pass as that company's site.

## Step 1 - Analyze before coding

Treat the image as a specification. For each section, in order, note:

- what the section is and its main focal point;
- all readable text, exactly (headline, subheadline, CTA labels, nav, section titles, prices, footer);
- typography: serif or sans, weight and size relationships, line counts, line height and tracking feel, alignment;
- spacing: gaps between headline, text and buttons, section padding, gutters, card padding and rhythm;
- components: button shape, radius, fill or outline, hierarchy; cards, borders, dividers, shadows, inputs, icons;
- colors: background, surfaces, text hierarchy, accent, borders, gradients, image treatment;
- layout: grid, columns, asymmetry, how it should collapse on mobile.

If part of the image is too small or blurry to read, say which part and ask the user for a closer crop rather than guessing. Do not invent copy that is readable in the image.

## Step 2 - Implement faithfully

- Use the project's existing stack. Without one, default to the taste skill's stack (React or Next.js, Tailwind v4, Motion).
- Match layout, spacing rhythm, type scale, colors and component styles to the image. Do not drift into a generic template or "improve" the design into something else.
- Fill only what the image leaves undefined (hover states, mobile layout, dark mode, empty and error states), following the taste skill's rules.
- Avoid boxes inside boxes and decorative micro-labels that are not in the reference.

## Step 3 - Compare and iterate

Run the page locally and take screenshots with the playwright-cli skill at the image's width (and a mobile width). Compare against the reference section by section, list the visible differences, fix them, and repeat until they match closely. Then run the web-design-guidelines review.

## Deliver

The code, a screenshot of the result, and a short list of anything that differs from the image on purpose or still needs the user's assets (images, fonts, logo).