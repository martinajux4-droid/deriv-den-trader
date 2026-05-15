import { Brain, Activity, Gauge, Target, TrendingUp, TrendingDown } from "lucide-react";
import type { Analysis } from "@/lib/ai-analysis";

export type AiPhase = "idle" | "analyzing" | "scanning" | "waiting" | "ready" | "executing" | "cooldown";

const PHASE_TEXT: Record<AiPhase, string> = {
  idle: "AI standby",
  analyzing: "Analyzing market…",
  scanning: "Scanning tick pressure…",
  waiting: "Waiting for confirmation…",
  ready: "Confirmation reached — entering",
  executing: "Trade opened · AI entry confirmed",
  cooldown: "Cooling down after loss streak…",
};

export function AIAnalysisPanel({
  phase, analysis, evenPct, oddPct, lastDigit, streak, decision, lastResult,
}: {
  phase: AiPhase;
  analysis: Analysis | null;
  evenPct: number;
  oddPct: number;
  lastDigit: number;
  streak: { kind: "EVEN" | "ODD" | "—"; len: number };
  decision: "EVEN" | "ODD" | "WAIT";
  lastResult: "win" | "loss" | "even" | null;
}) {
  const conf = analysis?.confidence ?? 0;
  const trend = analysis?.trendStrength ?? 0;
  const vol = analysis?.volatility ?? 0;
  const bias = evenPct >= oddPct ? "EVEN" : "ODD";
  const pressure = Math.max(evenPct, oddPct);
  const live = phase !== "idle";

  return (
    <div className="glass-card p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`grid h-7 w-7 place-items-center rounded-lg ${live ? "bg-[var(--meter-ai)]/15 text-[var(--meter-ai)]" : "bg-white/[0.04] text-muted-foreground"}`}>
            <Brain className={`h-3.5 w-3.5 ${live ? "animate-pulse" : ""}`} />
          </span>
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">AI Engine</div>
            <div className="truncate text-sm font-semibold">{PHASE_TEXT[phase]}</div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
          decision === "WAIT" ? "border-white/10 bg-white/[0.02] text-muted-foreground"
          : decision === "EVEN" ? "border-bull/40 bg-bull/10 text-bull"
          : "border-bear/40 bg-bear/10 text-bear"
        }`}>
          {decision === "EVEN" ? <TrendingUp className="inline h-3 w-3 mr-0.5" /> : decision === "ODD" ? <TrendingDown className="inline h-3 w-3 mr-0.5" /> : null}
          {decision}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat icon={<Activity className="h-3 w-3" />} label="Bias" value={bias} accent={bias === "EVEN" ? "bull" : "bear"} />
        <Stat icon={<Gauge className="h-3 w-3" />} label="Confidence" value={`${conf}%`} bar={conf} />
        <Stat icon={<Target className="h-3 w-3" />} label="Pressure" value={`${pressure}%`} bar={pressure} />
        <Stat icon={<Activity className="h-3 w-3" />} label="Volatility" value={`${vol.toFixed(0)}%`} bar={vol} accent={vol >= 70 ? "bear" : vol >= 40 ? "warn" : "bull"} />
      </div>

      <div className="mt-2 grid grid-cols-3 gap-2 text-center">
        <Mini label="EVEN" value={`${evenPct}%`} highlight={bias === "EVEN"} tone="bull" />
        <Mini label="LAST DIGIT" value={String(lastDigit)} highlight tone="primary" />
        <Mini label="ODD" value={`${oddPct}%`} highlight={bias === "ODD"} tone="bear" />
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px]">
        <span className="text-muted-foreground">
          Streak: <span className="num font-semibold text-foreground">{streak.len}× {streak.kind}</span> · Trend strength <span className="num font-semibold text-foreground">{trend.toFixed(0)}%</span>
        </span>
        {lastResult && (
          <span className={`rounded-full px-2 py-0.5 font-bold uppercase tracking-wider ${
            lastResult === "win" ? "bg-bull/15 text-bull" : lastResult === "loss" ? "bg-bear/15 text-bear" : "bg-muted text-muted-foreground"
          }`}>Last: {lastResult}</span>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, bar, accent }: { icon: React.ReactNode; label: string; value: string; bar?: number; accent?: "bull" | "bear" | "warn" | "primary" }) {
  const tone = accent === "bull" ? "text-bull" : accent === "bear" ? "text-bear" : accent === "warn" ? "text-warning" : "text-foreground";
  const barBg = accent === "bull" ? "bg-bull" : accent === "bear" ? "bg-bear" : accent === "warn" ? "bg-warning" : "bg-[var(--meter-ai)]";
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-wider text-muted-foreground">{icon}{label}</div>
      <div className={`num text-sm font-bold ${tone}`}>{value}</div>
      {bar != null && (
        <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/5">
          <div className={`h-full ${barBg} transition-all duration-500`} style={{ width: `${Math.min(100, bar)}%` }} />
        </div>
      )}
    </div>
  );
}

function Mini({ label, value, highlight, tone }: { label: string; value: string; highlight?: boolean; tone: "bull" | "bear" | "primary" }) {
  const c = tone === "bull" ? "text-bull border-bull/40 bg-bull/10" : tone === "bear" ? "text-bear border-bear/40 bg-bear/10" : "text-[var(--meter-ai)] border-[var(--meter-ai)]/40 bg-[var(--meter-ai)]/10";
  return (
    <div className={`rounded-lg border px-2 py-1.5 ${highlight ? c : "border-white/10 bg-white/[0.02] text-muted-foreground"}`}>
      <div className="text-[9px] uppercase tracking-wider opacity-80">{label}</div>
      <div className="num text-base font-bold">{value}</div>
    </div>
  );
}
