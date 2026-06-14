import { useMemo, useState } from "react";
import { makeTokens, platforms, type PlatformId, type TokenSegment } from "./data";

type FocusArea = "context" | "pressure" | "gate" | "budget" | "compression" | "audit" | "evidence";

type GuidedStep = {
  id: string;
  label: string;
  title: string;
  narrative: string;
  takeaway: string;
  focus: FocusArea;
  platformId: PlatformId;
  pressure: number;
  keepTarget: number;
  gate: "open" | "cooldown" | "commit" | "override";
  activePhases: string[];
};

const guidedSteps: GuidedStep[] = [
  {
    id: "context",
    label: "Context",
    title: "A replanning call begins with accumulated context.",
    narrative:
      "Task instructions, prior plans, observations, peer messages, and the latest state all enter the prompt before the planner can act.",
    takeaway: "BRACE starts from a systems view: context is a runtime cost, not just model input.",
    focus: "context",
    platformId: "habitat",
    pressure: 0.42,
    keepTarget: 52,
    gate: "open",
    activePhases: ["planner"],
  },
  {
    id: "pressure",
    label: "Pressure",
    title: "More coordination creates more replanning pressure.",
    narrative:
      "Reactive replanning can keep task success high while repeated calls push latency past the deadline.",
    takeaway: "Success alone is not enough when the control loop has real-time constraints.",
    focus: "pressure",
    platformId: "airsim",
    pressure: 0.86,
    keepTarget: 52,
    gate: "open",
    activePhases: ["retrieval", "planner", "update"],
  },
  {
    id: "gate",
    label: "Gate",
    title: "BRACE turns raw triggers into deliberate replanning decisions.",
    narrative:
      "The gate weighs trigger salience, cooldown spacing, commit stability, and failure-aware overrides before admitting a new planner call.",
    takeaway: "Replanning becomes budgeted control rather than reflexive churn.",
    focus: "gate",
    platformId: "robofactory",
    pressure: 0.72,
    keepTarget: 52,
    gate: "commit",
    activePhases: ["retrieval", "planner"],
  },
  {
    id: "budget",
    label: "Budget",
    title: "The controller fixes the call budget before planning.",
    narrative:
      "BRACE connects the deadline, context load, uncertainty, and coordination state into a budget for the whole call path.",
    takeaway: "There is no keep-ratio knob for the viewer; the budget is part of the method.",
    focus: "budget",
    platformId: "habitat",
    pressure: 0.62,
    keepTarget: 44,
    gate: "cooldown",
    activePhases: ["retrieval", "planner", "update"],
  },
  {
    id: "compression",
    label: "E-RECAP",
    title: "E-RECAP prunes the middle while protecting anchors.",
    narrative:
      "Head task tokens and the latest tail state remain protected; lower-utility middle tokens are thinned before the planner sees the prompt.",
    takeaway: "The visual focuses on policy behavior, not a user-adjustable compression slider.",
    focus: "compression",
    platformId: "airsim",
    pressure: 0.7,
    keepTarget: 27,
    gate: "open",
    activePhases: ["compression", "retrieval", "planner"],
  },
  {
    id: "audit",
    label: "Audit",
    title: "The call is audited phase by phase.",
    narrative:
      "Compression, retrieval, planning, and update cost are tracked separately so overhead is visible instead of hidden inside one latency number.",
    takeaway: "BRACE explains where time is spent, not only whether the plan succeeded.",
    focus: "audit",
    platformId: "habitat",
    pressure: 0.58,
    keepTarget: 22,
    gate: "override",
    activePhases: ["compression", "retrieval", "planner", "update"],
  },
  {
    id: "evidence",
    label: "Evidence",
    title: "The mechanism maps to lower token load and fewer deadline misses.",
    narrative:
      "Across navigation, manipulation, and traffic scenes, baseline replanning often succeeds but violates timing budgets; BRACE+E-RECAP reduces that pressure.",
    takeaway: "The project page should teach the mechanism first, then use metrics as evidence.",
    focus: "evidence",
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
    return "token pruned";
  }
  if (token.protectedSlot === "head") {
    return "token head";
  }
  if (token.protectedSlot === "tail") {
    return "token tail";
  }
  return "token middle";
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
          <h1>BRACE: Budgeted Replanning for Embodied Agents</h1>
          <p className="lede">
            A step-by-step walkthrough of how BRACE gates replanning, budgets context, and uses
            E-RECAP to reduce deadline misses in embodied-agent control loops.
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

      <section className="story-layout" aria-label="BRACE walkthrough">
        <article className="story-card">
          <span className="section-label">{step.label}</span>
          <h2>{step.title}</h2>
          <p>{step.narrative}</p>
          <div className="takeaway">
            <strong>Takeaway</strong>
            <p>{step.takeaway}</p>
          </div>
        </article>

        <section className="stage-card">
          <ModuleRail focus={step.focus} />
          <ActiveVisual activePhases={step.activePhases} keptTokens={keptTokens} platform={platform} step={step} tokens={tokens} />
        </section>

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

function ModuleRail({ focus }: { focus: FocusArea }) {
  const modules = [
    { id: "context", label: "Context" },
    { id: "gate", label: "Gate" },
    { id: "budget", label: "Budget" },
    { id: "compression", label: "E-RECAP" },
    { id: "audit", label: "Audit" },
  ];

  return (
    <div className="module-rail" aria-label="BRACE pipeline">
      {modules.map((module) => (
        <div className={focus === module.id || (focus === "pressure" && module.id === "context") ? "active" : ""} key={module.id}>
          <span />
          <strong>{module.label}</strong>
        </div>
      ))}
    </div>
  );
}

function ActiveVisual({
  activePhases,
  keptTokens,
  platform,
  step,
  tokens,
}: {
  activePhases: string[];
  keptTokens: Set<string>;
  platform: (typeof platforms)[number];
  step: GuidedStep;
  tokens: TokenSegment[];
}) {
  if (step.focus === "gate") {
    return <GateVisual gate={step.gate} />;
  }
  if (step.focus === "budget") {
    return <BudgetVisual platform={platform} />;
  }
  if (step.focus === "compression") {
    return <CompressionVisual keptCount={keptTokens.size} totalCount={tokens.length} />;
  }
  if (step.focus === "audit") {
    return <AuditVisual activePhases={activePhases} />;
  }
  if (step.focus === "evidence") {
    return <EvidenceVisual />;
  }
  return <ContextVisual keptTokens={keptTokens} pressure={step.pressure} tokens={tokens} variant={step.focus} />;
}

function ContextVisual({
  keptTokens,
  pressure,
  tokens,
  variant,
}: {
  keptTokens: Set<string>;
  pressure: number;
  tokens: TokenSegment[];
  variant: FocusArea;
}) {
  return (
    <div className="visual-panel">
      <div className="visual-header">
        <span>{variant === "pressure" ? "Coordination pressure" : "Context buffer"}</span>
        <strong>{Math.round(pressure * 100)}%</strong>
      </div>
      <div className="pressure-meter">
        <div style={{ width: `${pressure * 100}%` }} />
      </div>
      <div className="token-grid" aria-label="Token map">
        {tokens.map((token) => (
          <span className={tokenClass(token, keptTokens)} key={token.id} />
        ))}
      </div>
      <div className="legend">
        <span className="head">Head anchor</span>
        <span className="middle">Middle context</span>
        <span className="tail">Latest state</span>
        <span className="pruned">Pruned later</span>
      </div>
    </div>
  );
}

function GateVisual({ gate }: { gate: GuidedStep["gate"] }) {
  const gateText = {
    open: "Admit",
    cooldown: "Wait",
    commit: "Hold",
    override: "Override",
  }[gate];

  return (
    <div className="visual-panel">
      <div className="flow">
        <div className="flow-node trigger">
          <span>u_t</span>
          <strong>Trigger</strong>
        </div>
        <div className="flow-arrow" />
        <div className={`flow-node gate ${gate}`}>
          <span>{gateText}</span>
          <strong>Stability gate</strong>
        </div>
        <div className="flow-arrow" />
        <div className="flow-node budget">
          <span>B_t</span>
          <strong>Budgeted call</strong>
        </div>
      </div>
      <div className="rule-stack">
        <div className={gate === "cooldown" ? "active" : ""}>Cooldown spacing</div>
        <div className={gate === "commit" ? "active" : ""}>Commit stability</div>
        <div className={gate === "override" ? "active" : ""}>Failure-aware override</div>
      </div>
    </div>
  );
}

function BudgetVisual({ platform }: { platform: (typeof platforms)[number] }) {
  return (
    <div className="visual-panel budget-visual">
      <div className="budget-line">
        <div>
          <span>SLO_t</span>
          <strong>{platform.sloMs} ms</strong>
        </div>
        <i />
        <div>
          <span>C_t</span>
          <strong>Context</strong>
        </div>
        <i />
        <div>
          <span>B_t</span>
          <strong>Call budget</strong>
        </div>
      </div>
      <div className="call-path">
        <span>retrieve</span>
        <span>plan</span>
        <span>update</span>
        <span>audit</span>
      </div>
    </div>
  );
}

function CompressionVisual({ keptCount, totalCount }: { keptCount: number; totalCount: number }) {
  const layers = [totalCount, 44, 34, keptCount];

  return (
    <div className="visual-panel">
      <div className="layer-stack">
        {layers.map((count, index) => (
          <div className="layer-row" key={`${count}-${index}`}>
            <span>{index === 0 ? "Input" : `Layer ${index}`}</span>
            <div>
              <i style={{ width: metricWidth(count, totalCount) }} />
            </div>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
      <div className="anchor-strip">
        <span>Head task anchor</span>
        <span>High-utility middle</span>
        <span>Latest tail state</span>
      </div>
    </div>
  );
}

function AuditVisual({ activePhases }: { activePhases: string[] }) {
  return (
    <div className="visual-panel">
      <div className="phase-strip">
        {Object.entries(phaseBudgets).map(([phase, ms]) => (
          <div className={activePhases.includes(phase) ? "active" : ""} key={phase}>
            <span>{phase}</span>
            <strong>{ms} ms</strong>
          </div>
        ))}
      </div>
      <div className="audit-total">
        <span>Observed call path</span>
        <strong>{Object.values(phaseBudgets).reduce((sum, value) => sum + value, 0)} ms</strong>
      </div>
    </div>
  );
}

function EvidenceVisual() {
  return (
    <div className="visual-panel evidence-visual">
      {platforms.map((item) => (
        <article key={item.id}>
          <span>{item.label}</span>
          <strong>{`${item.baseline.sloViolationPct}% to ${item.braceErecap.sloViolationPct}%`}</strong>
          <p>SLO violation</p>
        </article>
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
