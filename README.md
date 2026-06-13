# BRACE Animation

Design and implementation workspace for a GitHub Pages friendly interactive animation explaining:

> When Replanning Becomes the Bottleneck: Budgeted Replanning for Embodied Agents

Current status: v1 interactive explainer implemented with Vite, React, TypeScript, SVG/CSS-style UI, and static paper metrics.

## Files

- `DESIGN.md`: animation concept, story structure, interaction design, data plan, and implementation constraints.
- `app/src/`: interactive explainer source.
- `app/index.html`: Vite development/build entry.
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

GitHub Pages should use **GitHub Actions** as its source. The workflow in `.github/workflows/deploy.yml` builds the app and deploys `dist/` when changes are pushed to `main`.

## Remote

```text
git@github.com:NEBULIS-Lab/brace-animation.git
```
