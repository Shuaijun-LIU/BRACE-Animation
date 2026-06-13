import { useMemo, useState } from "react";
import { makeTokens, Mode, PlatformId, platforms, sceneLabels, TokenSegment } from "./data";

const modeLabels: Record<Mode, string> = {
  baseline: "No BRACE",
  brace: "BRACE",
  braceErecap: "BRACE + E-RECAP",
};

const modeCopy: Record<Mode, string> = {
  baseline: "Every trigger calls the planner with the accumulated context.",
  brace: "The controller admits replanning only when the gate allows it and selects a budget.",
  braceErecap: "BRACE admits the call, then E-RECAP prunes the context before planning.",
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function App() {
  const [mode, setMode] = useState<Mode>("braceErecap");
  const [platformId, setPlatformId] = useState<PlatformId>("habitat");
  const [scene, setScene] = useState(0);
  const [agents, setAgents] = useState(4);
  const [keepRatio, setKeepRatio] = useState(0.7);
  const [sloScale, setSloScale] = useState(1);

  const platform = platforms.find((item) => item.id === platformId) ?? platforms[0];
  const activeMetric = mode === "baseline" ? platform.baseline : mode === "brace" ? platform.baseline : platform.braceErecap;
  const budgetTokens =
    mode === "baseline"
      ? platform.baseline.tokens
      : mode === "brace"
        ? Math.round(platform.baseline.tokens * 0.9)
        : platform.braceErecap.tokens;
  const adjustedSlo = Math.round(platform.sloMs * sloScale);
  const latency = mode === "baseline" ? platform.baseline.latencyP95Ms : mode === "brace" ? Math.round(platform.baseline.latencyP95Ms * 0.92) : platform.braceErecap.latencyP95Ms;
  const violation = mode === "baseline" ? platform.baseline.sloViolationPct : mode === "brace" ? Math.max(platform.braceErecap.sloViolationPct, Math.round(platform.baseline.sloViolationPct * 0.58)) : platform.braceErecap.sloViolationPct;
  const tokenCount = Math.max(36, Math.min(92, Math.round(36 + agents * 5 + platform.baseline.tokens / 95)));

  const tokens = useMemo(() => makeTokens(tokenCount, agents + scene * 3 + platform.id.length), [agents, scene, platform.id, tokenCount]);
  const selectedTokenIds = useMemo(() => selectTokens(tokens, mode, keepRatio), [tokens, mode, keepRatio]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Interactive Method Explainer</p>
          <h1>BRACE turns replanning into a budgeted control loop.</h1>
          <p className="lede">
            Watch context growth create tail latency, then inspect how the BRACE gate and E-RECAP pruning keep replanning within a token and latency budget.
          </p>
        </div>
        <div className="paper-card" aria-label="Paper summary">
          <span>Camera-ready focus</span>
          <strong>Tail latency and SLO violations, not success alone</strong>
        </div>
      </header>

      <section className="control-strip" aria-label="Explainer controls">
        <fieldset>
          <legend>Mode</legend>
          <div className="segmented">
            {(Object.keys(modeLabels) as Mode[]).map((item) => (
              <button
                key={item}
                className={item === mode ? "active" : ""}
                type="button"
                onClick={() => setMode(item)}
              >
                {modeLabels[item]}
              </button>
            ))}
          </div>
        </fieldset>

        <label>
          Platform
          <select value={platformId} onChange={(event) => setPlatformId(event.target.value as PlatformId)}>
            {platforms.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          Agents K
          <input min="1" max="8" step="1" type="range" value={agents} onChange={(event) => setAgents(Number(event.target.value))} />
          <span>{agents}</span>
        </label>

        <label>
          Keep ratio r
          <input min="0.45" max="1" step="0.05" type="range" value={keepRatio} onChange={(event) => setKeepRatio(Number(event.target.value))} />
          <span>{keepRatio.toFixed(2)}</span>
        </label>

        <label>
          SLO scale
          <input min="0.6" max="1.4" step="0.1" type="range" value={sloScale} onChange={(event) => setSloScale(Number(event.target.value))} />
          <span>{sloScale.toFixed(1)}x</span>
        </label>
      </section>

      <nav className="scene-nav" aria-label="Explainer scenes">
        {sceneLabels.map((label, index) => (
          <button key={label} className={index === scene ? "active" : ""} type="button" onClick={() => setScene(index)}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            {label}
          </button>
        ))}
      </nav>

      <section className="explainer-grid">
        <article className="stage-panel context-panel">
          <PanelHeader kicker="Context growth" title="A replanning call is no longer a small query." />
          <ContextGrowth tokens={tokens} selectedTokenIds={selectedTokenIds} mode={mode} agents={agents} scene={scene} />
        </article>

        <article className="stage-panel controller-panel">
          <PanelHeader kicker="BRACE controller" title="Triggers become budgeted decisions." />
          <ControllerFlow mode={mode} activeScene={scene} budgetTokens={budgetTokens} slo={adjustedSlo} />
        </article>

        <article className="stage-panel pruning-panel">
          <PanelHeader kicker="E-RECAP" title="Progressive pruning preserves head, tail, and high-utility tokens." />
          <PruningFlow tokens={tokens} selectedTokenIds={selectedTokenIds} mode={mode} keepRatio={keepRatio} />
        </article>

        <aside className="metric-panel">
          <PanelHeader kicker={platform.label} title={platform.scenario} />
          <MetricStack
            baseline={platform.baseline}
            method={platform.braceErecap}
            activeTokens={budgetTokens}
            activeLatency={latency}
            activeSlo={adjustedSlo}
            activeViolation={violation}
            mode={mode}
          />
        </aside>
      </section>

      <section className="evidence-band" aria-label="Cross-platform evidence">
        <div className="evidence-copy">
          <p className="eyebrow">Cross-platform evidence</p>
          <h2>Success can saturate while replanning misses deadlines.</h2>
          <p>
            The animation uses the paper's call-level numbers: tokens after compression, P95 replanning latency, and SLO violation rates. The goal is to make tail behavior visible before the reader reaches the tables.
          </p>
        </div>
        <div className="platform-cards">
          {platforms.map((item) => (
            <PlatformCard key={item.id} platform={item} active={item.id === platform.id} />
          ))}
        </div>
      </section>

      <section className="rollout-band" aria-label="Qualitative rollout">
        <div>
          <p className="eyebrow">Qualitative grounding</p>
          <h2>From metrics to recovery behavior.</h2>
          <p>
            Later versions can replace these static paper panels with frame-by-frame animation. For v1, the pair anchors the explainer in the RoboFactory visual setting.
          </p>
        </div>
        <div className="rollout-pair">
          <figure>
            <img src="./assets/robofactory_example_baseline.jpg" alt="Baseline RoboFactory rollout frame" />
            <figcaption>No BRACE baseline</figcaption>
          </figure>
          <figure>
            <img src="./assets/robofactory_example_method.jpg" alt="BRACE RoboFactory rollout frame" />
            <figcaption>BRACE rollout</figcaption>
          </figure>
        </div>
      </section>
    </main>
  );
}

function PanelHeader({ kicker, title }: { kicker: string; title: string }) {
  return (
    <div className="panel-header">
      <span>{kicker}</span>
      <h2>{title}</h2>
    </div>
  );
}

function selectTokens(tokens: TokenSegment[], mode: Mode, keepRatio: number) {
  if (mode !== "braceErecap") {
    return new Set(tokens.map((token) => token.id));
  }
  const protectedTokens = tokens.filter((token) => token.protectedSlot);
  const middle = tokens.filter((token) => !token.protectedSlot);
  const keepMiddle = Math.max(4, Math.round(middle.length * keepRatio * 0.45));
  const selected = middle
    .slice()
    .sort((a, b) => b.utility - a.utility)
    .slice(0, keepMiddle);
  return new Set([...protectedTokens, ...selected].map((token) => token.id));
}

function ContextGrowth({
  tokens,
  selectedTokenIds,
  mode,
  agents,
  scene,
}: {
  tokens: TokenSegment[];
  selectedTokenIds: Set<string>;
  mode: Mode;
  agents: number;
  scene: number;
}) {
  const visible = scene === 0 ? tokens.slice(0, Math.round(tokens.length * 0.68)) : tokens;
  return (
    <div className="context-wrap">
      <div className="context-timeline">
        {Array.from({ length: 9 }, (_, index) => (
          <span key={index} className={index < agents ? "agent-mark active" : "agent-mark"} />
        ))}
      </div>
      <div className="token-field" aria-label="Synthetic replanning context tokens">
        {visible.map((token) => (
          <span
            key={token.id}
            className={`token token-${token.kind} ${selectedTokenIds.has(token.id) ? "kept" : "pruned"} ${mode === "baseline" ? "unbudgeted" : ""}`}
            style={{ "--utility": token.utility } as React.CSSProperties}
            title={`${token.kind} token, utility ${token.utility.toFixed(2)}`}
          />
        ))}
      </div>
      <div className="legend-row">
        <span><i className="swatch task" />Task/head</span>
        <span><i className="swatch history" />History</span>
        <span><i className="swatch observation" />Recent/tail</span>
        <span><i className="swatch selected" />Selected</span>
      </div>
      <p className="mode-note">{modeCopy[mode]}</p>
    </div>
  );
}

function ControllerFlow({ mode, activeScene, budgetTokens, slo }: { mode: Mode; activeScene: number; budgetTokens: number; slo: number }) {
  const admitted = mode !== "baseline";
  return (
    <div className="controller-flow">
      <FlowNode label="Trigger check" detail="failure / hazard / periodic" active={activeScene >= 0} />
      <Connector active={activeScene >= 1} />
      <FlowNode label="Stability gate" detail="cooldown + commit + override" active={activeScene >= 1} locked={!admitted} />
      <Connector active={activeScene >= 1 && admitted} />
      <FlowNode label={admitted ? "Admit replan" : "Always replan"} detail={admitted ? "gate allowed" : "no gate"} active />
      <Connector active={activeScene >= 1} />
      <FlowNode label="Budget select" detail={`B=${budgetTokens}, SLO=${slo}ms`} active={mode !== "baseline"} />
    </div>
  );
}

function FlowNode({ label, detail, active, locked }: { label: string; detail: string; active: boolean; locked?: boolean }) {
  return (
    <div className={`flow-node ${active ? "active" : ""} ${locked ? "locked" : ""}`}>
      <strong>{label}</strong>
      <span>{detail}</span>
    </div>
  );
}

function Connector({ active }: { active: boolean }) {
  return <span className={`connector ${active ? "active" : ""}`} />;
}

function PruningFlow({
  tokens,
  selectedTokenIds,
  mode,
  keepRatio,
}: {
  tokens: TokenSegment[];
  selectedTokenIds: Set<string>;
  mode: Mode;
  keepRatio: number;
}) {
  const rows = [0, 1, 2].map((layer) => {
    const slice = tokens.slice(layer * 18, layer * 18 + 28);
    return layer === 0 || mode !== "braceErecap" ? slice : slice.filter((token) => selectedTokenIds.has(token.id) || token.utility > 0.48 + layer * 0.08);
  });

  return (
    <div className="pruning-flow">
      {rows.map((row, index) => (
        <div className="prune-layer" key={index}>
          <div className="layer-label">
            <span>Layer {index + 1}</span>
            {index > 0 && <em>tokens reduced</em>}
          </div>
          <div className="mini-token-row">
            {row.map((token) => (
              <span
                key={`${index}-${token.id}`}
                className={`mini-token token-${token.kind} ${selectedTokenIds.has(token.id) ? "kept" : "pruned"}`}
                style={{ "--utility": token.utility } as React.CSSProperties}
              />
            ))}
          </div>
        </div>
      ))}
      <div className="prune-summary">
        <span>Protected head/tail tokens</span>
        <strong>{mode === "braceErecap" ? `keep ratio ${keepRatio.toFixed(2)}` : "no pruning"}</strong>
        <span>High-utility middle tokens survive</span>
      </div>
    </div>
  );
}

function MetricStack({
  baseline,
  method,
  activeTokens,
  activeLatency,
  activeSlo,
  activeViolation,
  mode,
}: {
  baseline: { tokens: number; latencyP95Ms: number; sloViolationPct: number; successPct: number };
  method: { tokens: number; latencyP95Ms: number; sloViolationPct: number; successPct: number };
  activeTokens: number;
  activeLatency: number;
  activeSlo: number;
  activeViolation: number;
  mode: Mode;
}) {
  return (
    <div className="metric-stack">
      <div className={`slo-meter ${activeLatency > activeSlo ? "violate" : "ok"}`}>
        <span>P95 replanning latency</span>
        <strong>{formatNumber(activeLatency)} ms</strong>
        <div className="meter-track">
          <i style={{ width: `${Math.min(100, (activeLatency / Math.max(activeSlo * 1.4, activeLatency)) * 100)}%` }} />
          <b style={{ left: `${Math.min(92, (activeSlo / Math.max(activeSlo * 1.4, activeLatency)) * 100)}%` }} />
        </div>
        <small>SLO {formatNumber(activeSlo)} ms</small>
      </div>
      <MetricRow label="Planner tokens" value={formatNumber(activeTokens)} max={baseline.tokens} />
      <MetricRow label="SLO violation" value={`${formatNumber(activeViolation)}%`} max={100} numeric={activeViolation} danger />
      <MetricRow label="Task success" value={`${formatNumber(mode === "baseline" ? baseline.successPct : method.successPct)}%`} max={100} numeric={mode === "baseline" ? baseline.successPct : method.successPct} />
      <div className="call-path">
        {["compress", "retrieve", "plan", "update"].map((phase, index) => (
          <span key={phase} className={mode === "baseline" && index === 0 ? "muted" : ""}>
            {phase}
          </span>
        ))}
      </div>
    </div>
  );
}

function MetricRow({ label, value, max, numeric, danger }: { label: string; value: string; max: number; numeric?: number; danger?: boolean }) {
  const width = Math.min(100, ((numeric ?? Number(value.replace(/,/g, ""))) / max) * 100);
  return (
    <div className="metric-row">
      <span>{label}</span>
      <strong>{value}</strong>
      <div className={`bar ${danger ? "danger" : ""}`}>
        <i style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function PlatformCard({ platform, active }: { platform: (typeof platforms)[number]; active: boolean }) {
  return (
    <button className={`platform-card ${active ? "active" : ""}`} type="button" aria-label={`${platform.label} metrics`}>
      <span>{platform.label}</span>
      <strong>{platform.baseline.tokens} {"->"} {platform.braceErecap.tokens} tokens</strong>
      <div className="mini-bars">
        <i style={{ height: `${platform.baseline.sloViolationPct}%` }} />
        <b style={{ height: `${platform.braceErecap.sloViolationPct}%` }} />
      </div>
      <small>SLO violation {platform.baseline.sloViolationPct}% {"->"} {platform.braceErecap.sloViolationPct}%</small>
    </button>
  );
}

export default App;
