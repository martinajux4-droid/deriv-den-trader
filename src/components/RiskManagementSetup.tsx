import { useMemo } from "react";
import { Shield, ShieldCheck, ShieldAlert, Sparkles, Brain, Lock, Gauge, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { RiskMode } from "@/lib/bot-engine";

export type RiskValues = {
  stake: string;
  takeProfit: string;
  stopLoss: string;
  maxTrades: string;
  riskMode: RiskMode;
  minConfidence: string;
  dailyLossLimit: string;
  maxConsecLosses: string;
};

export type RiskAssessment = {
  score: number;          // 0..100 (higher = riskier)
  level: "low" | "moderate" | "high" | "extreme";
  label: string;
  message: string;
  valid: boolean;
  errors: string[];
};

export function assessRisk(v: RiskValues, balance?: number): RiskAssessment {
  const errors: string[] = [];
  const stake = Number(v.stake);
  const tp = Number(v.takeProfit);
  const sl = Number(v.stopLoss);
  const trades = Number(v.maxTrades);
  const conf = Number(v.minConfidence);
  const daily = Number(v.dailyLossLimit);
  const streak = Number(v.maxConsecLosses);

  if (!(stake > 0)) errors.push("Stake amount is required");
  if (!(sl > 0)) errors.push("Stop loss is required");
  if (!(tp > 0)) errors.push("Take profit is required");
  if (!(trades > 0)) errors.push("Max trades is required");
  if (!(daily > 0)) errors.push("Daily loss limit is required");
  if (!(streak > 0)) errors.push("Loss streak protection is required");
  if (!(conf >= 50 && conf <= 95)) errors.push("AI confidence must be 50–95%");

  let score = 0;
  // stake / balance ratio
  if (balance && balance > 0) {
    const r = stake / balance;
    if (r > 0.1) score += 35;
    else if (r > 0.05) score += 20;
    else if (r > 0.02) score += 10;
  } else {
    if (stake > 50) score += 25;
    else if (stake > 10) score += 10;
  }
  // tp:sl ratio (lower TP vs SL = higher risk)
  if (tp > 0 && sl > 0) {
    const ratio = tp / sl;
    if (ratio < 0.7) score += 25;
    else if (ratio < 1) score += 12;
    else if (ratio >= 1.5) score -= 5;
  }
  // risk mode
  if (v.riskMode === "aggressive") score += 25;
  else if (v.riskMode === "normal") score += 10;
  // confidence filter
  if (conf < 60) score += 15;
  else if (conf < 70) score += 8;
  else if (conf >= 80) score -= 5;
  // loss streak guard
  if (streak >= 5) score += 12;
  else if (streak <= 2) score -= 5;
  // daily loss vs sl
  if (daily > 0 && sl > 0 && daily > sl * 4) score += 10;

  score = Math.max(0, Math.min(100, Math.round(score)));

  let level: RiskAssessment["level"] = "low";
  if (score >= 70) level = "extreme";
  else if (score >= 45) level = "high";
  else if (score >= 25) level = "moderate";

  const messages: Record<typeof level, { label: string; message: string }> = {
    low: {
      label: "Low risk configuration",
      message: "Recommended for beginners. Capital protected by tight defenses.",
    },
    moderate: {
      label: "Balanced configuration",
      message: "Healthy risk-to-reward. AI defenses are active.",
    },
    high: {
      label: "Elevated risk detected",
      message: "Consider reducing stake or increasing AI confidence filter.",
    },
    extreme: {
      label: "High risk detected",
      message: "Reduce stake size, raise stop-loss buffer, and lower aggression.",
    },
  } as const;

  return {
    score,
    level,
    label: messages[level].label,
    message: messages[level].message,
    valid: errors.length === 0,
    errors,
  };
}

type Props = {
  values: RiskValues;
  onChange: (patch: Partial<RiskValues>) => void;
  balance?: number;
  currency?: string;
  assessment: RiskAssessment;
  locked?: boolean;
};

export function RiskManagementSetup({ values, onChange, balance, currency = "USD", assessment, locked }: Props) {
  const suggestedStake = useMemo(() => {
    if (!balance || balance <= 0) return null;
    return Math.max(0.35, Number((balance * 0.01).toFixed(2))); // 1% of balance
  }, [balance]);

  const tone =
    assessment.level === "low" ? "bull"
    : assessment.level === "moderate" ? "primary"
    : assessment.level === "high" ? "warning" : "bear";
  const ringByTone =
    tone === "bull" ? "ring-bull/40 shadow-[0_0_60px_-15px_oklch(0.74_0.18_150/0.55)]"
    : tone === "primary" ? "ring-primary/40 shadow-[0_0_60px_-15px_oklch(0.82_0.15_85/0.5)]"
    : tone === "warning" ? "ring-warning/50 shadow-[0_0_60px_-15px_oklch(0.78_0.18_70/0.55)]"
    : "ring-bear/50 shadow-[0_0_60px_-15px_oklch(0.62_0.21_25/0.55)]";

  const Icon = tone === "bull" ? ShieldCheck : tone === "bear" ? ShieldAlert : Shield;

  return (
    <div className={cn(
      "card-premium relative overflow-hidden p-5 sm:p-6 ring-1 transition-all duration-500",
      ringByTone,
    )}>
      <div className="pointer-events-none absolute inset-0 bg-grid-fine opacity-[0.05] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_30%,black,transparent_75%)]" />

      <div className="relative grid gap-5 lg:grid-cols-[1fr_300px] lg:items-start">
        {/* HEADER + FIELDS */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className={cn(
                "grid h-11 w-11 place-items-center rounded-xl border",
                tone === "bull" && "border-bull/40 bg-bull/10 text-bull",
                tone === "primary" && "border-primary/40 bg-primary/10 text-primary",
                tone === "warning" && "border-warning/40 bg-warning/10 text-warning",
                tone === "bear" && "border-bear/40 bg-bear/10 text-bear",
              )}>
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">Risk Management Setup</h2>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                    Required
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  AI validates safety before the bot can start. Your capital is protected at every step.
                </p>
              </div>
            </div>
            {assessment.valid && (
              <span className="hidden items-center gap-1.5 rounded-full border border-bull/40 bg-bull/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-bull sm:inline-flex">
                <CheckCircle2 className="h-3 w-3" /> AI Verified
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Stake amount" hint={suggestedStake ? `AI suggests ${suggestedStake} ${currency} (1% of balance)` : `Suggested: 1–2% of balance`}>
              <Input
                inputMode="decimal" className="num h-11 text-base"
                value={values.stake} disabled={locked}
                onChange={(e) => onChange({ stake: e.target.value })}
                placeholder="1.00"
              />
            </Field>
            <Field label="Take profit" hint="Bot locks profits automatically when target is reached.">
              <Input
                inputMode="decimal" className="num h-11 text-base"
                value={values.takeProfit} disabled={locked}
                onChange={(e) => onChange({ takeProfit: e.target.value })}
                placeholder="10.00"
              />
            </Field>
            <Field label="Stop loss" hint="Bot stops automatically when this loss is reached." tone="warn">
              <Input
                inputMode="decimal" className="num h-11 text-base"
                value={values.stopLoss} disabled={locked}
                onChange={(e) => onChange({ stopLoss: e.target.value })}
                placeholder="10.00"
              />
            </Field>
            <Field label="Daily loss limit" hint="Hard cap to prevent overtrading in a single day." tone="warn">
              <Input
                inputMode="decimal" className="num h-11 text-base"
                value={values.dailyLossLimit} disabled={locked}
                onChange={(e) => onChange({ dailyLossLimit: e.target.value })}
                placeholder="25.00"
              />
            </Field>
            <Field label="Max trades" hint="Total trades the bot can place this session.">
              <Input
                inputMode="numeric" className="num h-11 text-base"
                value={values.maxTrades} disabled={locked}
                onChange={(e) => onChange({ maxTrades: e.target.value })}
                placeholder="20"
              />
            </Field>
            <Field label="Consecutive loss protection" hint="Stops bot after this many losses in a row." tone="warn">
              <Input
                inputMode="numeric" className="num h-11 text-base"
                value={values.maxConsecLosses} disabled={locked}
                onChange={(e) => onChange({ maxConsecLosses: e.target.value })}
                placeholder="3"
              />
            </Field>
            <Field label="Risk level" hint="Sets aggression of AI entry filter.">
              <Select value={values.riskMode} onValueChange={(v) => onChange({ riskMode: v as RiskMode })} disabled={locked}>
                <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="safe">Safe · capital first</SelectItem>
                  <SelectItem value="normal">Normal · balanced</SelectItem>
                  <SelectItem value="aggressive">Aggressive · max ROI</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="AI confidence filter" hint="Only trade when AI confidence is above this %.">
              <div className="relative">
                <Input
                  inputMode="numeric" className="num h-11 pr-10 text-base"
                  value={values.minConfidence} disabled={locked}
                  onChange={(e) => onChange({ minConfidence: e.target.value })}
                  placeholder="70"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
              </div>
            </Field>
          </div>

          {assessment.errors.length > 0 && (
            <div className="rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
              <div className="flex items-center gap-1.5 font-semibold">
                <AlertTriangle className="h-3.5 w-3.5" /> Complete these fields to unlock AI Bot
              </div>
              <ul className="mt-1 list-disc pl-5 space-y-0.5">
                {assessment.errors.slice(0, 3).map((e) => <li key={e}>{e}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* AI SAFETY METER */}
        <div className="lg:sticky lg:top-4">
          <div className={cn(
            "rounded-2xl border bg-background/40 p-4 backdrop-blur-md",
            tone === "bull" && "border-bull/30",
            tone === "primary" && "border-primary/30",
            tone === "warning" && "border-warning/40",
            tone === "bear" && "border-bear/40",
          )}>
            <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-muted-foreground">
              <span className="flex items-center gap-1.5"><Brain className="h-3 w-3" /> AI Safety Analysis</span>
              <span className={cn(
                "rounded-full px-2 py-0.5 text-[9px] font-bold",
                tone === "bull" && "bg-bull/15 text-bull",
                tone === "primary" && "bg-primary/15 text-primary",
                tone === "warning" && "bg-warning/15 text-warning",
                tone === "bear" && "bg-bear/15 text-bear",
              )}>
                {assessment.level.toUpperCase()}
              </span>
            </div>

            <RiskGauge score={assessment.score} tone={tone} />

            <div className="mt-3 space-y-1">
              <div className="text-sm font-semibold">{assessment.label}</div>
              <p className="text-[12px] leading-relaxed text-muted-foreground">{assessment.message}</p>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
              <Mini icon={<Lock className="h-3 w-3" />} label="Stop Loss" value={values.stopLoss ? `${values.stopLoss} ${currency}` : "—"} ok={Number(values.stopLoss) > 0} />
              <Mini icon={<Sparkles className="h-3 w-3" />} label="Take Profit" value={values.takeProfit ? `${values.takeProfit} ${currency}` : "—"} ok={Number(values.takeProfit) > 0} />
              <Mini icon={<Gauge className="h-3 w-3" />} label="AI Filter" value={values.minConfidence ? `${values.minConfidence}%` : "—"} ok={Number(values.minConfidence) >= 50} />
              <Mini icon={<Shield className="h-3 w-3" />} label="Daily Cap" value={values.dailyLossLimit ? `${values.dailyLossLimit} ${currency}` : "—"} ok={Number(values.dailyLossLimit) > 0} />
            </div>

            {assessment.valid && (
              <div className="mt-4 flex items-center justify-center gap-2 rounded-xl border border-bull/40 bg-bull/10 px-3 py-2 text-xs font-semibold text-bull animate-pulse-glow">
                <CheckCircle2 className="h-4 w-4" /> Risk validated · AI Ready
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({ label, hint, children, tone }: { label: string; hint?: string; children: React.ReactNode; tone?: "warn" }) {
  return (
    <div>
      <Label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</Label>
      {children}
      {hint && (
        <p className={cn("mt-1 text-[10.5px] leading-snug", tone === "warn" ? "text-warning/80" : "text-muted-foreground")}>{hint}</p>
      )}
    </div>
  );
}

function Mini({ icon, label, value, ok }: { icon: React.ReactNode; label: string; value: string; ok: boolean }) {
  return (
    <div className={cn(
      "flex items-center gap-1.5 rounded-lg border px-2 py-1.5",
      ok ? "border-bull/30 bg-bull/5 text-foreground" : "border-border/60 bg-background/40 text-muted-foreground",
    )}>
      <span className={ok ? "text-bull" : "text-muted-foreground"}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
        <div className="num truncate text-[11px] font-semibold">{value}</div>
      </div>
    </div>
  );
}

function RiskGauge({ score, tone }: { score: number; tone: "bull" | "primary" | "warning" | "bear" }) {
  // Display safety score (inverse of risk)
  const safety = 100 - score;
  const angle = -90 + (safety / 100) * 180;
  const stroke =
    tone === "bull" ? "oklch(0.74 0.18 150)"
    : tone === "primary" ? "oklch(0.82 0.15 85)"
    : tone === "warning" ? "oklch(0.78 0.18 70)" : "oklch(0.62 0.21 25)";
  const r = 56;
  const c = Math.PI * r;
  const dash = (safety / 100) * c;

  return (
    <div className="relative mx-auto mt-3 grid place-items-center">
      <svg viewBox="0 0 140 80" className="w-full max-w-[200px]">
        <defs>
          <linearGradient id="risk-grad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="oklch(0.62 0.21 25)" />
            <stop offset="50%" stopColor="oklch(0.78 0.18 70)" />
            <stop offset="100%" stopColor="oklch(0.74 0.18 150)" />
          </linearGradient>
        </defs>
        <path d="M14,70 A56,56 0 0,1 126,70" stroke="oklch(0.3 0 0 / 0.4)" strokeWidth="8" fill="none" strokeLinecap="round" />
        <path
          d="M14,70 A56,56 0 0,1 126,70"
          stroke={stroke} strokeWidth="8" fill="none" strokeLinecap="round"
          strokeDasharray={`${dash} ${c}`}
          style={{ transition: "stroke-dasharray 600ms ease, stroke 400ms ease", filter: `drop-shadow(0 0 8px ${stroke})` }}
        />
        {/* needle */}
        <g transform={`translate(70 70) rotate(${angle})`} style={{ transition: "transform 600ms cubic-bezier(.34,1.56,.64,1)" }}>
          <line x1="0" y1="0" x2="0" y2="-50" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
          <circle r="4" fill={stroke} />
        </g>
      </svg>
      <div className="-mt-3 text-center">
        <div className="num text-2xl font-semibold leading-none">{safety}<span className="text-xs text-muted-foreground">/100</span></div>
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Safety score</div>
      </div>
    </div>
  );
}
