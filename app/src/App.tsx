import { useMemo, useState } from "react";
import { makeTokens, platforms, type PlatformId, type TokenSegment } from "./data";

type FocusArea = "context" | "gate" | "budget" | "compression" | "audit" | "evidence";

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
    title: "Embodied agents carry the full recent world state into replanning.",
    narrative:
      "A task prompt, observation history, peer messages, and the latest simulator state all compete for the same context window before the next planner call.",
    takeaway: "The bottleneck is not only whether the task succeeds, but whether replanning stays inside the deadline.",
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
    title: "Reactive replanning keeps firing as coordination pressure grows.",
    narrative:
      "In multi-agent scenes, every new message or state change can trigger another planner call, so success can hide excessive churn and repeated deadline misses.",
    takeaway: "The paper treats replanning frequency and context size as first-class runtime costs.",
    focus: "context",
    platformId: "airsim",
    pressure: 0.86,
    keepTarget: 52,
    gate: "open",
    activePhases: ["retrieval", "planner", "update"],
  },
  {
    id: "gate",
    label: "Gate",
    title: "BRACE admits replanning through a stability-aware gate.",
    narrative:
      "The controller checks trigger salience, cooldown spacing, commit stability, and failure-aware overrides before spending another planner call.",
    takeaway: "Replanning becomes a budgeted decision instead of a reflex.",
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
    title: "A per-call budget is selected before retrieval and planning run.",
    narrative:
      "BRACE connects the SLO, current context, outstanding uncertainty, and coordination load into one fixed budget for the upcoming call path.",
    takeaway: "Users do not tune keep ratios here; the explanation follows the controller's automatic budget path.",
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
    title: "E-RECAP compresses the middle context while protecting anchors.",
    narrative:
      "The head task tokens and latest tail state remain protected, while lower-utility middle tokens are progressively thinned before the planner sees the prompt.",
    takeaway: "The compression policy is illustrated as a fixed controller step, not a manual slider.",
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
    title: "Every call is audited by phase, token load, and deadline status.",
    narrative:
      "Compression, retrieval, planning, and update phases are measured separately so overhead can be attributed instead of hidden inside one latency number.",
    takeaway: "The audit view explains why BRACE can improve SLO behavior without changing task success alone.",
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
    title: "The same story appears across navigation, manipulation, and traffic.",
    narrative:
      "Static metrics from the paper are converted into comparable bars: baseline calls often succeed but exceed latency budgets, while BRACE+E-RECAP cuts token load and SLO violations.",
    takeaway: "The final page should teach the mechanism first, then use metrics as evidence.",
    focus: "evidence",
    platformId: "airsim",
    pressure: 0.64,
    keepTarget: 26,
    gate: "open",
    activePhases: ["compression", "retrieval", "planner", "update"],
  },
];

const tokenKindLabels: Record<TokenSegment["kind"], string> = {
  task: "Task",
  history: "History",
  message: "Message",
  observation: "Observation",
  tail: "Latest",
};

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
          <p className="eyebrow">BRACE guided explainer</p>
          <h1>Budgeted replanning, explained one step at a time.</h1>
          <p className="lede">
            A GitHub Pages friendly animation for the BRACE paper. The page now follows a fixed
            narrative: click next, watch the active subsystem change, and connect the mechanism to
            the paper metrics.
          </p>
        </div>
        <div className="paper-card">
          <span>Paper focus</span>
          <strong>When Replanning Becomes the Bottleneck</strong>
          <p>Budgeted controller, E-RECAP compression, and SLO-aware auditing for embodied agents.</p>
        </div>
      </header>

      <section className="guide-bar" aria-label="Guided steps">
        <div className="step-dots">
          {guidedSteps.map((item, index) => (
            <button
              className={index === stepIndex ? "active" : index < stepIndex ? "visited" : ""}
              key={item.id}
              onClick={() => setStepIndex(index)}
              type="button"
              aria-label={`Go to ${item.label}`}
            >
              <span>{index + 1}</span>
              <strong>{item.label}</strong>
            </button>
          ))}
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

      <section className="current-step">
        <div>
          <span>{`Step ${stepIndex + 1} / ${guidedSteps.length}`}</span>
          <h2>{step.title}</h2>
          <p>{step.narrative}</p>
        </div>
        <aside>
          <strong>Takeaway</strong>
          <p>{step.takeaway}</p>
        </aside>
      </section>

      <section className="explainer-grid" aria-label="BRACE explainer">
        <ContextPanel focus={step.focus} keptTokens={keptTokens} pressure={step.pressure} tokens={tokens} />
        <ControllerPanel focus={step.focus} gate={step.gate} platformId={step.platformId} />
        <CompressionPanel focus={step.focus} keptCount={keptTokens.size} totalCount={tokens.length} />
        <MetricsPanel activePhases={step.activePhases} focus={step.focus} platform={platform} />
      </section>

      <section className="evidence-board">
        <div className="panel-header">
          <span>Paper metrics, re-framed for the walkthrough</span>
          <h2>Baseline success can hide missed deadlines.</h2>
        </div>
        <div className="platform-grid">
          {platforms.map((item) => (
            <article className={item.id === step.platformId ? "platform-card active" : "platform-card"} key={item.id}>
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
    </main>
  );
}

function ContextPanel({
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
  return (
    <article className={focus === "context" ? "panel focus" : "panel"}>
      <div className="panel-header">
        <span>Context buffer</span>
        <h2>Prompt pressure</h2>
      </div>
      <div className="pressure-meter">
        <div style={{ width: `${pressure * 100}%` }} />
      </div>
      <div className="token-grid" aria-label="Token utility map">
        {tokens.map((token) => (
          <span
            className={keptTokens.has(token.id) ? `token ${token.kind}` : `token ${token.kind} removed`}
            key={token.id}
            title={`${tokenKindLabels[token.kind]} utility ${token.utility.toFixed(2)}`}
          />
        ))}
      </div>
      <div className="legend">
        <span className="task">Task</span>
        <span className="history">History</span>
        <span className="message">Messages</span>
        <span className="observation">Observations</span>
        <span className="tail">Latest state</span>
      </div>
    </article>
  );
}

function ControllerPanel({
  focus,
  gate,
  platformId,
}: {
  focus: FocusArea;
  gate: GuidedStep["gate"];
  platformId: PlatformId;
}) {
  const gateText = {
    open: "Admit",
    cooldown: "Wait",
    commit: "Hold",
    override: "Override",
  }[gate];

  return (
    <article className={focus === "gate" || focus === "budget" ? "panel focus" : "panel"}>
      <div className="panel-header">
        <span>BRACE controller</span>
        <h2>Trigger to budget</h2>
      </div>
      <div className="flow">
        <div className="flow-node hot">
          <span>u_t</span>
          <strong>Trigger</strong>
        </div>
        <div className="flow-arrow" />
        <div className={`flow-node gate ${gate}`}>
          <span>{gateText}</span>
          <strong>Gate</strong>
        </div>
        <div className="flow-arrow" />
        <div className="flow-node budget">
          <span>B_t</span>
          <strong>Budget</strong>
        </div>
      </div>
      <div className="rule-stack">
        <div className={gate === "cooldown" ? "active" : ""}>Cooldown spacing</div>
        <div className={gate === "commit" ? "active" : ""}>Commit stability</div>
        <div className={gate === "override" ? "active" : ""}>Failure-aware override</div>
        <div className={focus === "budget" ? "active" : ""}>SLO-aware token budget</div>
      </div>
      <p className="microcopy">
        Active scenario: <strong>{platformId}</strong>. The page advances the controller state for
        the viewer instead of exposing low-level knobs.
      </p>
    </article>
  );
}

function CompressionPanel({
  focus,
  keptCount,
  totalCount,
}: {
  focus: FocusArea;
  keptCount: number;
  totalCount: number;
}) {
  const layers = [totalCount, 44, 34, keptCount];

  return (
    <article className={focus === "compression" ? "panel focus" : "panel"}>
      <div className="panel-header">
        <span>E-RECAP</span>
        <h2>Progressive pruning</h2>
      </div>
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
    </article>
  );
}

function MetricsPanel({
  activePhases,
  focus,
  platform,
}: {
  activePhases: string[];
  focus: FocusArea;
  platform: (typeof platforms)[number];
}) {
  const maxLatency = Math.max(platform.baseline.latencyP95Ms, platform.braceErecap.latencyP95Ms, platform.sloMs);

  return (
    <article className={focus === "audit" || focus === "evidence" ? "panel focus" : "panel"}>
      <div className="panel-header">
        <span>Runtime evidence</span>
        <h2>{platform.label}</h2>
      </div>
      <div className="slo-card">
        <span>SLO</span>
        <strong>{platform.sloMs} ms</strong>
        <p>{platform.scenario}</p>
      </div>
      <MetricRow
        label="P95 latency"
        base={platform.baseline.latencyP95Ms}
        brace={platform.braceErecap.latencyP95Ms}
        max={maxLatency}
        suffix=" ms"
      />
      <MetricRow
        label="Token load"
        base={platform.baseline.tokens}
        brace={platform.braceErecap.tokens}
        max={Math.max(platform.baseline.tokens, platform.braceErecap.tokens)}
        suffix=""
      />
      <div className="phase-strip">
        {Object.entries(phaseBudgets).map(([phase, ms]) => (
          <div className={activePhases.includes(phase) ? "active" : ""} key={phase}>
            <span>{phase}</span>
            <strong>{ms} ms</strong>
          </div>
        ))}
      </div>
    </article>
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
