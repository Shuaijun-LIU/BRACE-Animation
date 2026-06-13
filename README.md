# BRACE Animation

Design and implementation workspace for a GitHub Pages friendly interactive animation explaining:

> When Replanning Becomes the Bottleneck: Budgeted Replanning for Embodied Agents

Current status: guided interactive explainer implemented with Vite, React, TypeScript, CSS-driven visuals, and static paper metrics.

The current interface is intentionally step-based. A viewer can keep pressing **Next** to move through context pressure, BRACE gating, budget selection, E-RECAP compression, audit accounting, and cross-platform evidence. It does not expose manual controls such as keep-ratio sliders.

## Files

- `DESIGN.md`: animation concept, story structure, interaction design, data plan, and implementation constraints.
- `app/src/`: interactive explainer source.
- `app/index.html`: Vite development/build entry.

No paper figures are required for the page. The explainer uses code-generated visual elements so it can be deployed as a lightweight GitHub Pages site.

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
