import { useMemo, useState, type CSSProperties } from "react";
import { makeTokens, platforms, type PlatformId, type TokenSegment } from "./data";

type FocusArea = "context" | "pressure" | "gate" | "budget" | "compression" | "audit" | "evidence";
type LoopNode = "observe" | "trigger" | "gate" | "budget" | "compress" | "planner" | "execute" | "audit";

type GuidedStep = {
  id: string;
  label: string;
  title: string;
  narrative: string;
  takeaway: string;
  focus: FocusArea;
  node: LoopNode;
  platformId: PlatformId;
  pressure: number;
  keepTarget: number;
  gate: "open" | "cooldown" | "commit" | "override";
  activePhases: string[];
};

const loopNodes: { id: LoopNode; label: string; detail: string }[] = [
  { id: "observe", label: "Observe", detail: "C_t grows" },
  { id: "trigger", label: "Trigger", detail: "u_t fires" },
  { id: "gate", label: "Gate", detail: "stability" },
  { id: "budget", label: "Budget", detail: "B_t" },
  { id: "compress", label: "E-RECAP", detail: "prune" },
  { id: "planner", label: "Planner", detail: "call" },
  { id: "execute", label: "Execute", detail: "act" },
  { id: "audit", label: "Audit", detail: "l_t vs SLO" },
];

const guidedSteps: GuidedStep[] = [
  {
    id: "context",
    label: "Context",
    title: "The loop starts by collecting a live replanning context.",
    narrative:
      "The buffer contains task anchors, plan history, peer messages, observations, and the newest state. The same tokens will keep flowing through the loop below.",
    takeaway: "Context is part of the control system. The animation keeps it visible through every stage.",
    focus: "context",
    node: "observe",
    platformId: "habitat",
    pressure: 0.42,
    keepTarget: 52,
    gate: "open",
    activePhases: ["planner"],
  },
  {
    id: "pressure",
    label: "Pressure",
    title: "Triggers arrive as the context grows and agents coordinate.",
    narrative:
      "The pulse moves from observation to trigger. Without control, every salient change can request another planner call.",
    takeaway: "The bottleneck is repeated replanning under live deadlines, not task failure alone.",
    focus: "pressure",
    node: "trigger",
    platformId: "airsim",
    pressure: 0.86,
    keepTarget: 52,
    gate: "open",
    activePhases: ["retrieval", "planner", "update"],
  },
  {
    id: "gate",
    label: "Gate",
    title: "The stability gate decides whether this trigger deserves a call.",
    narrative:
      "Cooldown, commit stability, and failure-aware override are all visible in the controller. The active rule changes the gate state.",
    takeaway: "This is the anti-churn part of the method: not every trigger becomes replanning.",
    focus: "gate",
    node: "gate",
    platformId: "robofactory",
    pressure: 0.72,
    keepTarget: 52,
    gate: "commit",
    activePhases: ["retrieval", "planner"],
  },
  {
    id: "budget",
    label: "Budget",
    title: "An admitted call receives a budget for the entire path.",
    narrative:
      "The loop now links SLO, context pressure, and call phases. The budget is method behavior, not a slider for the viewer.",
    takeaway: "Budgeting applies to retrieval, compression, planning, update, and audit together.",
    focus: "budget",
    node: "budget",
    platformId: "habitat",
    pressure: 0.62,
    keepTarget: 44,
    gate: "cooldown",
    activePhases: ["retrieval", "planner", "update"],
  },
  {
    id: "compression",
    label: "E-RECAP",
    title: "E-RECAP progressively prunes the middle context.",
    narrative:
      "The head and tail anchors stay pinned while low-utility middle tokens fade across layers. The surviving vector chips become the planner input.",
    takeaway: "This step should feel like token processing, not a static metric card.",
    focus: "compression",
    node: "compress",
    platformId: "airsim",
    pressure: 0.7,
    keepTarget: 27,
    gate: "open",
    activePhases: ["compression", "retrieval", "planner"],
  },
  {
    id: "audit",
    label: "Audit",
    title: "The planner call returns to execution with phase-level accounting.",
    narrative:
      "The packet flows through planner, update, and audit. Compression is shown as real overhead, while the audit compares total latency to the deadline.",
    takeaway: "The loop view makes the systems claim visible: time is measured around the whole call path.",
    focus: "audit",
    node: "audit",
    platformId: "habitat",
    pressure: 0.58,
    keepTarget: 22,
    gate: "override",
    activePhases: ["compression", "retrieval", "planner", "update"],
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "The same loop explains the cross-platform results.",
    narrative:
      "The workbench stays visible while the evidence strip expands: baseline replanning often succeeds but violates timing budgets; BRACE+E-RECAP reduces pressure.",
    takeaway: "The metrics are evidence for the loop, not a replacement for explaining the mechanism.",
    focus: "evidence",
    node: "execute",
    platformId: "airsim",
    pressure: 0.64,
    keepTarget: 26,
    gate: "open",
    activePhases: ["compression", "retrieval", "planner", "update"],
  },
];

const phaseBudgets = {
  compression: 18,
  retrieval: 42,
  planner: 148,
  update: 26,
};

function tokenSelection(tokens: TokenSegment[], keepTarget: number) {
  if (keepTarget >= tokens.length) {
    return new Set(tokens.map((token) => token.id));
  }

  const protectedTokens = tokens.filter((token) => token.protectedSlot);
  const middleTokens = tokens
    .filter((token) => !token.protectedSlot)
    .sort((left, right) => right.utility - left.utility);
  const remaining = Math.max(0, keepTarget - protectedTokens.length);
  return new Set([...protectedTokens, ...middleTokens.slice(0, remaining)].map((token) => token.id));
}

function metricWidth(value: number, max: number) {
  return `${Math.max(4, Math.min(100, (value / max) * 100))}%`;
}

function tokenClass(token: TokenSegment, keptTokens: Set<string>) {
  if (!keptTokens.has(token.id)) {
    return "token-chip pruned";
  }
  if (token.protectedSlot === "head") {
    return "token-chip head";
  }
  if (token.protectedSlot === "tail") {
    return "token-chip tail";
  }
  return token.utility > 0.68 ? "token-chip middle selected" : "token-chip middle";
}

function utilityBars(token: TokenSegment) {
  return [0, 1, 2, 3].map((index) => {
    const wave = Math.sin((index + 1) * (token.utility + 0.7)) * 0.5 + 0.5;
    return Math.max(18, Math.round((0.35 + wave * 0.65) * 100));
  });
}

function loopIndex(node: LoopNode) {
  return Math.max(
    0,
    loopNodes.findIndex((item) => item.id === node),
  );
}

function App() {
  const [stepIndex, setStepIndex] = useState(0);
  const step = guidedSteps[stepIndex];
  const platform = platforms.find((item) => item.id === step.platformId) ?? platforms[0];
  const tokens = useMemo(() => makeTokens(52, stepIndex + 3), [stepIndex]);
  const keptTokens = useMemo(() => tokenSelection(tokens, step.keepTarget), [tokens, step.keepTarget]);
  const isFinalStep = stepIndex === guidedSteps.length - 1;

  const advance = () => {
    setStepIndex((current) => (current === guidedSteps.length - 1 ? 0 : current + 1));
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Interactive method explainer</p>
          <h1>Budgeted Replanning for Embodied Agents</h1>
          <p className="lede">
            A loop-based walkthrough of how a replanning controller gates triggers, budgets context,
            compresses tokens with E-RECAP, and audits latency against real-time deadlines.
          </p>
        </div>
        <div className="paper-card">
          <span>Paper focus</span>
          <strong>When Replanning Becomes the Bottleneck</strong>
          <p>Budgeted controller, context compression, and SLO-aware audit signals.</p>
        </div>
      </header>

      <section className="guide-bar" aria-label="Guided steps">
        <div className="progress-cluster">
          <span>{`Step ${stepIndex + 1} of ${guidedSteps.length}`}</span>
          <strong>{step.label}</strong>
          <div className="step-dots">
            {guidedSteps.map((item, index) => (
              <button
                className={index === stepIndex ? "active" : index < stepIndex ? "visited" : ""}
                key={item.id}
                onClick={() => setStepIndex(index)}
                type="button"
                aria-label={`Go to ${item.label}`}
              />
            ))}
          </div>
        </div>
        <div className="guide-actions">
          <button
            className="secondary"
            disabled={stepIndex === 0}
            onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
            type="button"
          >
            Back
          </button>
          <button className="primary" onClick={advance} type="button">
            {isFinalStep ? "Restart" : "Next"}
          </button>
        </div>
      </section>

      <section className="story-layout" aria-label="Budgeted replanning walkthrough">
        <article className="story-card">
          <span className="section-label">{step.label}</span>
          <h2>{step.title}</h2>
          <p>{step.narrative}</p>
          <div className="takeaway">
            <strong>Takeaway</strong>
            <p>{step.takeaway}</p>
          </div>
        </article>

        <LoopWorkbench keptTokens={keptTokens} platform={platform} step={step} tokens={tokens} />

        <aside className="context-card">
          <span className="section-label">Current scene</span>
          <h2>{platform.label}</h2>
          <p>{platform.scenario}</p>
          <MetricRow
            label="P95 latency"
            base={platform.baseline.latencyP95Ms}
            brace={platform.braceErecap.latencyP95Ms}
            max={Math.max(platform.baseline.latencyP95Ms, platform.braceErecap.latencyP95Ms, platform.sloMs)}
            suffix=" ms"
          />
          <MetricRow
            label="Token load"
            base={platform.baseline.tokens}
            brace={platform.braceErecap.tokens}
            max={Math.max(platform.baseline.tokens, platform.braceErecap.tokens)}
            suffix=""
          />
          <div className="slo-note">
            <span>SLO</span>
            <strong>{platform.sloMs} ms</strong>
          </div>
        </aside>
      </section>

      {step.focus === "evidence" ? <EvidenceBoard /> : null}
    </main>
  );
}

function LoopWorkbench({
  keptTokens,
  platform,
  step,
  tokens,
}: {
  keptTokens: Set<string>;
  platform: (typeof platforms)[number];
  step: GuidedStep;
  tokens: TokenSegment[];
}) {
  const keptCount = keptTokens.size;
  const prunedCount = tokens.length - keptCount;

  return (
    <section className={`stage-card focus-${step.focus}`} aria-label="Replanning loop workbench">
      <div className="workbench-header">
        <div>
          <span>Live loop</span>
          <strong>{loopNodes[loopIndex(step.node)].label}</strong>
        </div>
        <div>
          <span>Raw context</span>
          <strong>{tokens.length} tokens</strong>
        </div>
        <div>
          <span>Planner input</span>
          <strong>{keptCount} kept</strong>
        </div>
        <div>
          <span>Pruned</span>
          <strong>{prunedCount}</strong>
        </div>
      </div>

      <LoopRail activeNode={step.node} />

      <div className="workbench-grid">
        <TokenBuffer focus={step.focus} keptTokens={keptTokens} pressure={step.pressure} tokens={tokens} />
        <ControllerCard focus={step.focus} gate={step.gate} />
        <ErecapCard focus={step.focus} keptCount={keptCount} totalCount={tokens.length} />
        <PlannerAuditCard activePhases={step.activePhases} focus={step.focus} platform={platform} />
      </div>

      <EvidenceRibbon focus={step.focus} />
    </section>
  );
}

function LoopRail({ activeNode }: { activeNode: LoopNode }) {
  const activeIndex = loopIndex(activeNode);

  return (
    <div className="loop-rail" style={{ "--pulse-index": activeIndex } as CSSProperties}>
      <span className="loop-pulse" />
      {loopNodes.map((node, index) => (
        <div className={index === activeIndex ? "active" : index < activeIndex ? "visited" : ""} key={node.id}>
          <strong>{node.label}</strong>
          <span>{node.detail}</span>
        </div>
      ))}
    </div>
  );
}

function TokenBuffer({
  focus,
  keptTokens,
  pressure,
  tokens,
}: {
  focus: FocusArea;
  keptTokens: Set<string>;
  pressure: number;
  tokens: TokenSegment[];
}) {
  const visibleTokens = tokens.slice(0, 32);

  return (
    <article className={focus === "context" || focus === "pressure" ? "work-module active" : "work-module"}>
      <div className="module-title">
        <span>Context buffer</span>
        <strong>{Math.round(pressure * 100)}% pressure</strong>
      </div>
      <div className="pressure-meter">
        <div style={{ width: `${pressure * 100}%` }} />
      </div>
      <div className="token-stream" aria-label="Token processing stream">
        {visibleTokens.map((token, index) => (
          <div
            className={tokenClass(token, keptTokens)}
            key={token.id}
            style={{ "--delay": `${index * 18}ms`, "--utility": token.utility.toFixed(2) } as CSSProperties}
          >
            <div className="chip-bars">
              {utilityBars(token).map((height, barIndex) => (
                <i key={`${token.id}-${barIndex}`} style={{ height: `${height}%` }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="token-legend">
        <span className="head">Head</span>
        <span className="middle">Middle</span>
        <span className="selected">Utility-selected</span>
        <span className="tail">Tail</span>
      </div>
    </article>
  );
}

function ControllerCard({ focus, gate }: { focus: FocusArea; gate: GuidedStep["gate"] }) {
  const gateText = {
    open: "Admit",
    cooldown: "Wait",
    commit: "Hold",
    override: "Override",
  }[gate];

  return (
    <article className={focus === "gate" || focus === "budget" ? "work-module active" : "work-module"}>
      <div className="module-title">
        <span>Controller</span>
        <strong>{gateText}</strong>
      </div>
      <div className="controller-flow">
        <div className="controller-node trigger">u_t</div>
        <div className={`controller-node gate ${gate}`}>{gateText}</div>
        <div className="controller-node budget">B_t</div>
      </div>
      <div className="rule-stack">
        <div className={gate === "cooldown" ? "active" : ""}>Cooldown</div>
        <div className={gate === "commit" ? "active" : ""}>Commit</div>
        <div className={gate === "override" ? "active" : ""}>Override</div>
      </div>
    </article>
  );
}

function ErecapCard({ focus, keptCount, totalCount }: { focus: FocusArea; keptCount: number; totalCount: number }) {
  const layers = [totalCount, Math.max(keptCount, 44), Math.max(keptCount, 34), keptCount];

  return (
    <article className={focus === "compression" || focus === "budget" ? "work-module active" : "work-module"}>
      <div className="module-title">
        <span>E-RECAP layers</span>
        <strong>{`${totalCount} to ${keptCount}`}</strong>
      </div>
      <div className="layer-stack">
        {layers.map((count, index) => (
          <div className={index === layers.length - 1 ? "layer-row final" : "layer-row"} key={`${count}-${index}`}>
            <span>{index === 0 ? "Raw" : `L${index}`}</span>
            <div>
              <i style={{ width: metricWidth(count, totalCount) }} />
            </div>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="anchor-strip">
        <span>head pinned</span>
        <span>utility kept</span>
        <span>tail pinned</span>
      </div>
    </article>
  );
}

function PlannerAuditCard({
  activePhases,
  focus,
  platform,
}: {
  activePhases: string[];
  focus: FocusArea;
  platform: (typeof platforms)[number];
}) {
  const totalMs = Object.entries(phaseBudgets)
    .filter(([phase]) => activePhases.includes(phase))
    .reduce((sum, [, ms]) => sum + ms, 0);

  return (
    <article className={focus === "audit" || focus === "evidence" ? "work-module active" : "work-module"}>
      <div className="module-title">
        <span>Planner + audit</span>
        <strong>{`${totalMs} ms`}</strong>
      </div>
      <div className="phase-mini">
        {Object.entries(phaseBudgets).map(([phase, ms]) => (
          <div className={activePhases.includes(phase) ? "active" : ""} key={phase}>
            <span>{phase}</span>
            <i style={{ height: `${Math.max(24, ms / 2)}px` }} />
          </div>
        ))}
      </div>
      <div className="slo-compare">
        <span>{`SLO ${platform.sloMs} ms`}</span>
        <strong>{platform.braceErecap.latencyP95Ms <= platform.sloMs ? "within budget" : "over budget"}</strong>
      </div>
    </article>
  );
}

function EvidenceRibbon({ focus }: { focus: FocusArea }) {
  return (
    <div className={focus === "evidence" ? "evidence-ribbon active" : "evidence-ribbon"}>
      {platforms.map((item) => (
        <div key={item.id}>
          <span>{item.label}</span>
          <strong>{`${item.baseline.sloViolationPct}% to ${item.braceErecap.sloViolationPct}%`}</strong>
        </div>
      ))}
    </div>
  );
}

function EvidenceBoard() {
  return (
    <section className="evidence-board">
      <div className="panel-header">
        <span>Cross-platform evidence</span>
        <h2>Baseline replanning can succeed while missing deadlines.</h2>
      </div>
      <div className="platform-grid">
        {platforms.map((item) => (
          <article className="platform-card" key={item.id}>
            <div>
              <strong>{item.label}</strong>
              <span>{item.scenario}</span>
            </div>
            <MetricRow
              label="Tokens"
              base={item.baseline.tokens}
              brace={item.braceErecap.tokens}
              max={Math.max(item.baseline.tokens, item.braceErecap.tokens)}
              suffix=""
            />
            <MetricRow
              label="SLO violation"
              base={item.baseline.sloViolationPct}
              brace={item.braceErecap.sloViolationPct}
              max={100}
              suffix="%"
            />
          </article>
        ))}
      </div>
    </section>
  );
}

function MetricRow({
  base,
  brace,
  label,
  max,
  suffix,
}: {
  base: number;
  brace: number;
  label: string;
  max: number;
  suffix: string;
}) {
  return (
    <div className="metric-row">
      <div className="metric-label">
        <span>{label}</span>
        <strong>{`${brace}${suffix}`}</strong>
      </div>
      <div className="bar-pair">
        <div>
          <span style={{ width: metricWidth(base, max) }} />
          <em>{`Baseline ${base}${suffix}`}</em>
        </div>
        <div>
          <span style={{ width: metricWidth(brace, max) }} />
          <em>{`BRACE+E-RECAP ${brace}${suffix}`}</em>
        </div>
      </div>
    </div>
  );
}

export default App;
