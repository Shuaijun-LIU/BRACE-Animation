# BRACE Animation

Design and implementation workspace for a GitHub Pages friendly interactive animation explaining:

> When Replanning Becomes the Bottleneck: Budgeted Replanning for Embodied Agents

Current status: v1 interactive explainer implemented with Vite, React, TypeScript, SVG/CSS-style UI, and static paper metrics.

## Files

- `DESIGN.md`: animation concept, story structure, interaction design, data plan, and implementation constraints.
- `src/`: interactive explainer source.
- `public/assets/`: selected lightweight paper figures used by the qualitative evidence section.

## Local Development

```bash
npm install
npm run dev
```

## Production Build

```bash
npm run build
```

The app uses `base: "./"` in `vite.config.ts`, so the generated `dist/` is suitable for GitHub Pages subpath hosting.

## GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds the app and deploys `dist/` to GitHub Pages when changes are pushed to `main`.

## Remote

```text
git@github.com:NEBULIS-Lab/brace-animation.git
```
