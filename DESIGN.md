# BRACE Interactive Animation Design

Date: 2026-06-12

This document designs a GitHub Pages deployable interactive explainer for the BRACE paper:

> When Replanning Becomes the Bottleneck: Budgeted Replanning for Embodied Agents

Implementation status: v1 is now implemented as a focused interactive explainer following this plan. The remaining sections keep the original design rationale and future build phasing for later refinement.

## 1. Paper Understanding

### Core Message

BRACE argues that replanning in embodied agents should be treated as a budgeted systems primitive. Success alone can hide a dangerous failure mode: the agent can still finish tasks while many replanning calls miss real-time latency deadlines because the accumulated prompt/context grows over time.

The animation should help a visitor understand four ideas quickly:

1. Replanning context grows during closed-loop execution.
2. Context growth creates tail latency and SLO violations, even when task success is high.
3. BRACE decides whether to replan and how much compute/token budget to spend.
4. E-RECAP compresses the replanning context by progressive token pruning while preserving critical head/tail tokens and selected utility tokens.

### Mechanism To Explain

The paper's loop is:

```text
observe -> trigger check -> stability gate -> budget selection
        -> optional context compression / retrieval
        -> planner call -> plan update -> execute -> audit logs
```

The visual system should make the following quantities visible:

- `C_t`: accumulated replanning context buffer.
- `N_t`: raw token length before compression.
- `B_t`: token budget after BRACE/E-RECAP.
- `SLO_t`: latency deadline for the replanning call.
- `u_t`: BRACE decision to admit or suppress replanning.
- `l_t`: measured end-to-end replanning latency.
- SLO violation: whether `l_t > SLO_t`.

### Evidence To Surface

Use exact values from the camera-ready paper as static data in the explainer:

| Platform | Baseline issue | BRACE + E-RECAP effect |
|---|---|---|
| Meta Habitat | No BRACE: 235 tokens, P95 2677 ms, SLO 2500 ms, 85.5% violations | 20 tokens, P95 2500 ms, 4.7% violations |
| RoboFactory | No BRACE: 1566 tokens, P95 1604 ms, SLO 250 ms, 100% violations | 319 tokens, P95 1213 ms, 50.0% violations |
| AirSim K=8 | No BRACE: 2934 tokens, P95 8520 ms, SLO 2500 ms, 100% violations | 1114 tokens, P95 1640 ms, 4.7% violations |
| Habitat K sweep | E-RECAP removes 71-76% tokens and gives 2.1-2.6x speedup | Shows context-growth scaling story |
| Real robot | PickFruit and PushT show improved success and fewer SLO misses | Good optional closing scene |

## 2. References Studied And Reuse Plan

Local reference library:

```text
/data/private/user2/guide/project-website-animations/
```

Most relevant references:

| Reference | Local path | What to reuse |
|---|---|---|
| ViT-Explainer | `examples/source-code/upstream-repos/vit-explainer-deployed/` | Token-chip visuals, horizontal module pipeline, active-stage opacity, hoverable blocks, class/output card metaphor. |
| Transformer Explainer | `examples/source-code/upstream-repos/transformer-explainer/` | Stepwise model internals, explanatory popovers, animated arrows, compact computation blocks. |
| AttentionViz | `examples/source-code/upstream-repos/attention-viz/` | Head/layer filtering, matrix/embedding interaction logic. |
| TransforLearn | `examples/source-code/upstream-repos/transforlearn/` | Tutorial sequence and progressive disclosure of formulas. |
| OpenVLA / VP-VLA pages | `examples/source-code/upstream-repos/openvla-project-page/`, `vp-vla/` | Robotics project-page sections, rollout demos, architecture-to-evidence flow. |
| React Bits | `examples/source-code/react-bits/` | Reusable cursor/background/text animation patterns if they remain lightweight and not distracting. |
| LLM 3D Viz | `examples/source-code/upstream-repos/llm-viz/` | Optional later idea for spatial token-flow view; not necessary for v1. |

Reuse boundary:

- Reuse interaction patterns and small component ideas.
- Do not copy entire third-party projects into this repo.
- Check licenses before copying any component code.
- Favor original BRACE-specific SVG/CSS/Canvas visuals over screenshots of other explainers.

## 3. Target Experience

### Page Type

A single-page interactive explainer, not a marketing landing page. The first viewport should immediately show the BRACE mechanism in motion:

- left: growing context and trigger events,
- center: BRACE controller and E-RECAP pruning,
- right: planner output and execution state,
- bottom: live metrics strip with tokens, latency, P95/SLO, and violation indicator.

### Intended Visitor Flow

1. Visitor sees an embodied agent loop where context grows over time.
2. A trigger fires; without BRACE, replanning calls stack up and latency crosses the SLO.
3. Visitor toggles BRACE on.
4. The stability gate suppresses churn unless failure-aware override is needed.
5. E-RECAP prunes tokens progressively; head/tail/selected tokens remain visible.
6. The planner receives a budgeted context and returns a plan.
7. Metrics update, showing lower tokens and fewer deadline misses.
8. Visitor can inspect platform summaries and qualitative rollouts.

## 4. Animation Narrative

### Scene 1: The Bottleneck

Purpose: show why replanning becomes a systems problem.

Visual:

- A timeline of controller steps.
- A context buffer grows with colored token segments:
  - task specification,
  - previous plans,
  - observations,
  - execution feedback,
  - multi-agent messages.
- Latency curve rises and occasionally spikes.
- A horizontal SLO line turns red when crossed.

Interaction:

- Toggle: `No BRACE` vs `BRACE`.
- Slider: number of agents `K = 1, 4, 8`.
- Slider: episode time / context length.

Reference influence:

- ViT-Explainer's token chips become BRACE context chips.
- Instead of image patches, the chips represent replanning text units.

### Scene 2: BRACE Controller

Purpose: explain when BRACE replans and when it refuses churn.

Visual:

```text
Trigger Check -> Stability Gate -> Replan? -> Budget Selection
```

The gate has three visible subrules:

- cooldown,
- commit window,
- failure-aware override.

Animation:

- A trigger pulse arrives from the context timeline.
- If cooldown/commit blocks it, the pulse is absorbed and the current plan continues.
- If failure persists, failure-aware override opens the gate.
- When admitted, the budget selector emits `B_t` and `SLO_t`.

Interaction:

- Hover over each gate subrule for one-sentence explanation.
- Stepper: trigger type = periodic / failure / hazard / coordination.
- Optional later: show a suppressed-trigger audit outcome.

### Scene 3: E-RECAP Progressive Pruning

Purpose: make E-RECAP concrete.

Visual:

- Transformer layers as stacked horizontal bands.
- Token rows enter each pruning layer.
- Head tokens are pinned on the left.
- Tail tokens are pinned on the right.
- Utility-selected tokens glow and survive.
- Low-utility tokens fade, shrink, and disappear.
- A counter updates:

```text
N_t raw tokens -> B_t planner tokens
```

Animation states:

1. Full context enters layer 1.
2. Importance scorer produces per-token intensity.
3. First pruning layer removes low-utility middle tokens.
4. Later pruning layers repeat progressively.
5. Final budgeted context enters planner.

Reference influence:

- ViT-Explainer's module-by-module horizontal network, active opacity, and vector/token chips.
- BertViz/AttentionViz style selector controls for layer focus.

### Scene 4: Budgeted Replanning Call Path

Purpose: connect modules to end-to-end latency accounting.

Visual:

```text
context_compress -> retrieve/cache -> planner -> plan_update -> execute
```

Below it, an audit log strip fills with phase timings:

```text
compression ms | retrieval ms | planner ms | update ms | total l_t
```

Animation:

- A stopwatch follows the call path.
- Each phase adds a small segment to total latency.
- If total crosses `SLO_t`, the strip flashes red.
- Under BRACE + E-RECAP, total remains below or closer to the SLO in key cases.

Design requirement:

- Do not imply E-RECAP is free. Show pruning overhead as a visible phase.
- Make clear that BRACE budgets the whole call path, not only the planner forward pass.

### Scene 5: Evidence Dashboard

Purpose: show that the method is cross-platform, not one-off.

Visual:

- Three platform cards: Meta Habitat, RoboFactory, AirSim.
- Each card has two mini lanes:
  - No BRACE,
  - BRACE + E-RECAP.
- Tokens and SLO violation bars animate from baseline to method.

Data:

Use values from `experiments.tex` Table 1:

```text
Habitat: 235 -> 20 tokens, 85.5% -> 4.7% SLO violation
RoboFactory: 1566 -> 319 tokens, 100.0% -> 50.0% SLO violation
AirSim: 2934 -> 1114 tokens, 100.0% -> 4.7% SLO violation
```

Important wording:

- "Success can saturate while deadlines fail."
- "Token reduction helps, but tail-aware budgeting is the actual systems objective."

### Scene 6: Qualitative Recovery

Purpose: connect metrics to visible embodied behavior.

Visual options:

- RoboFactory Pass-Shoe / TakePhoto storyboard.
- Real robot PickFruit rollout.
- AirSim multi-agent trigger window.

Animation:

- Baseline lane accumulates delayed replanning decisions.
- BRACE lane shows fewer admitted calls, budgeted compression, then timely recovery.
- Use original paper figures as optional static panels in v1, then later replace with frame-by-frame animated assets if videos are available.

## 5. Proposed Interaction Controls

Keep controls compact and technical:

| Control | Values | Effect |
|---|---|---|
| Mode | No BRACE / BRACE / BRACE + E-RECAP | Changes gate behavior and pruning visualization. |
| Platform | Habitat / RoboFactory / AirSim | Loads platform-specific tokens, SLO, and result metrics. |
| Agents `K` | 1 / 4 / 8 | Grows context faster and changes latency profile. |
| Keep ratio `r` | 0.5-1.0 | Changes token pruning intensity in E-RECAP scene. |
| SLO | default per platform, adjustable | Moves deadline line and recomputes violation indicators. |
| Step | previous / next / autoplay | Advances the explainer narrative. |

Avoid heavy UI:

- No large generic hero section.
- No decorative animated background that competes with the explainer.
- Use motion only to explain state changes.

## 6. Visual Language

### Palette

Avoid one-note purple/blue. Use a restrained systems palette:

- Ink: near black / slate for labels.
- Baseline: muted red or rose for deadline misses.
- BRACE controller: blue.
- E-RECAP pruning: green.
- Budget/SLO: amber.
- Execution environment: neutral gray with platform accent.

### Token Semantics

Use fixed token color categories:

| Token type | Color role |
|---|---|
| Task spec / head tokens | lavender |
| Previous plans and observations | green |
| Current observation / tail tokens | blue |
| Utility-selected tokens | bright blue |
| Pruned tokens | gray with fade-out |
| Deadline violation | red |

### Motion Rules

- Token flow: translate + opacity, not layout jumps.
- Pruning: fade/shrink removed tokens, then close gaps smoothly.
- SLO violation: short red pulse only on crossing.
- Gate decisions: one pulse in, one pulse out or absorbed.
- Respect `prefers-reduced-motion`.

## 7. Technical Direction

Recommended stack for v1:

```text
Vite + React + TypeScript
SVG for architecture and token flow
Canvas only if token counts become visually dense
CSS transitions / requestAnimationFrame for deterministic animation
Static JSON data files for paper metrics
GitHub Pages static deployment
```

Why React for this repo:

- The local React Bits library provides reusable patterns if needed.
- State-driven animation suits mode/platform/slider controls.
- Vite static export is straightforward for GitHub Pages.

Why not start with Three.js:

- BRACE's core concept is budgeted call-path accounting, not a spatial 3D model.
- 3D can be explored later for an optional "context volume" scene, but v1 should prioritize clarity.

## 8. Data Model Draft

Use static local JSON, for example:

```ts
type PlatformMetric = {
  platform: "habitat" | "robofactory" | "airsim";
  scenario: string;
  sloMs: number;
  baseline: {
    tokens: number;
    latencyP95Ms: number;
    sloViolationPct: number;
    successPct?: number;
  };
  braceErecap: {
    tokens: number;
    latencyP95Ms: number;
    sloViolationPct: number;
    successPct?: number;
  };
};

type TokenSegment = {
  id: string;
  kind: "task" | "history" | "observation" | "message" | "tail";
  utility: number;
  protected: "head" | "tail" | null;
};
```

For v1, token positions can be synthetic but numerically tied to paper metrics. The animation does not need to replay real tokens.

## 9. Source Assets To Prepare Later

From the paper folder:

```text
/data/private/user2/workspace/1.Replanning/BRACE/BRACE-icml2026-camera-ready/fig/
/data/private/user2/workspace/1.Replanning/BRACE/BRACE-icml2026-camera-ready/poster_v1/assets/
```

Candidate assets:

- `poster_v1/assets/overview.png`
- `poster_v1/assets/erecap_method_architecture.png`
- `fig/latency_cdf_meta_habitat.png`
- `fig/slo_violation_bar.png`
- `fig/diagnostics_token_latency_meta_habitat.png`
- `fig/diagnostics_token_latency_robofactory.png`
- `fig/airsimnh_retained_collage_main.jpg`
- `fig/take_fruit_real.pdf` or converted raster frames later
- `fig/robofactory_example_baseline.jpg`
- `fig/robofactory_example_method.jpg`

Do not commit large videos or raw experiment logs to this repo unless they are compressed and needed for the final page.

## 10. Proposed Repository Layout For Implementation

```text
.
├── README.md
├── DESIGN.md
├── package.json
├── index.html
├── vite.config.ts
├── src/
│   ├── App.tsx
│   ├── data/
│   │   ├── metrics.ts
│   │   └── scenes.ts
│   ├── components/
│   │   ├── ContextGrowthScene.tsx
│   │   ├── BraceControllerScene.tsx
│   │   ├── ErecapPruningScene.tsx
│   │   ├── CallPathAuditScene.tsx
│   │   └── EvidenceDashboard.tsx
│   └── styles/
│       └── app.css
└── public/
    └── assets/
```

## 11. Build Phasing

### Phase A: Explainer Skeleton

- Build static single page.
- Add scene navigation.
- Add metric data.
- Implement token growth and SLO line.

### Phase B: BRACE Controller

- Add trigger pulses.
- Add cooldown/commit/failure-aware gate states.
- Add budget selection display.

### Phase C: E-RECAP Interaction

- Add layered token pruning.
- Add keep ratio control.
- Add head/tail/selected token legend.

### Phase D: Evidence And Rollouts

- Add platform comparison cards.
- Add qualitative panels.
- Add citations/links to paper and repository.

### Phase E: Polish And Verification

- Mobile layout.
- Reduced motion.
- GitHub Pages build.
- Browser screenshots and local link checks.

## 12. Open Design Questions

1. Should the final page include the whole project-page structure, or only the animation module intended to be embedded into the existing BRACE website?
2. Should the animation prioritize real robot PickFruit as the closing example, or keep the main closing example on RoboFactory/AirSim for stronger cross-platform alignment?
3. Should the token pruning scene show synthetic token labels, or anonymized real prompt segments from experiments?
4. Should the first implementation use only SVG/CSS, or introduce Canvas for dense token fields?

## 13. Recommended V1 Decision

Build a focused interactive explainer module first:

```text
Context Growth -> BRACE Gate -> E-RECAP Pruning -> SLO Outcome
```

This directly matches the paper's central claim and can later be embedded into a broader project website. It is also the closest BRACE equivalent to ViT-Explainer: the visitor sees structured tokens move through a model/system pipeline, can inspect stages, and watches an output metric change as the method operates.
