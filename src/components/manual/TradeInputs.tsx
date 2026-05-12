import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

export type TradeConfig = {
  stake: number;
  takeProfit: number;
  maxLoss: number;
  martingale: number;
  ticks: number;
  duration: number;
  durationUnit: "t" | "s" | "m";
  digit: number;
  riskMultiplier: number;
};

export function TradeInputs({
  cfg, setCfg, showDigit = false,
}: {
  cfg: TradeConfig;
  setCfg: (next: TradeConfig) => void;
  showDigit?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const upd = <K extends keyof TradeConfig>(k: K, v: TradeConfig[K]) => setCfg({ ...cfg, [k]: v });

  const Field = ({ label, value, onChange, step = "0.01", min = "0", suffix }: {
    label: string; value: number; onChange: (n: number) => void; step?: string; min?: string; suffix?: string;
  }) => (
    <label className="flex flex-col gap-1.5">
      <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</span>
      <div className="input-glow flex items-center px-3 py-2.5">
        <input
          type="number" inputMode="decimal" step={step} min={min}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(Number(e.target.value))}
          className="num w-full bg-transparent text-base font-semibold outline-none placeholder:text-muted-foreground/40"
        />
        {suffix && <span className="ml-2 text-xs text-muted-foreground">{suffix}</span>}
      </div>
    </label>
  );

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Stake" value={cfg.stake} onChange={(v) => upd("stake", v)} step="0.5" min="0.35" suffix="USD" />
        <Field label="Take profit" value={cfg.takeProfit} onChange={(v) => upd("takeProfit", v)} step="1" suffix="USD" />
        <Field label="Max loss" value={cfg.maxLoss} onChange={(v) => upd("maxLoss", v)} step="1" suffix="USD" />
        <Field label="Martingale" value={cfg.martingale} onChange={(v) => upd("martingale", v)} step="0.1" min="1" suffix="×" />
        <Field label="Ticks" value={cfg.ticks} onChange={(v) => upd("ticks", Math.max(1, Math.round(v)))} step="1" min="1" />
        {showDigit && (
          <Field label="Digit (0–9)" value={cfg.digit} onChange={(v) => upd("digit", Math.max(0, Math.min(9, Math.round(v))))} step="1" min="0" />
        )}
      </div>

      <button onClick={() => setOpen((o) => !o)}
              className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2 text-xs text-muted-foreground transition-colors hover:text-foreground hover:border-[var(--meter-momentum)]/40">
        <span className="uppercase tracking-[0.16em]">Advanced AI settings</span>
        {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
      </button>
      {open && (
        <div className="risk-advanced grid grid-cols-2 gap-3 p-3">
          <Field label="Duration" value={cfg.duration} onChange={(v) => upd("duration", v)} step="1" min="1" />
          <label className="flex flex-col gap-1.5">
            <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Unit</span>
            <div className="input-glow px-3 py-2.5">
              <select value={cfg.durationUnit} onChange={(e) => upd("durationUnit", e.target.value as any)}
                      className="w-full bg-transparent text-sm font-semibold outline-none">
                <option value="t">Ticks</option>
                <option value="s">Seconds</option>
                <option value="m">Minutes</option>
              </select>
            </div>
          </label>
          <Field label="Risk multiplier" value={cfg.riskMultiplier} onChange={(v) => upd("riskMultiplier", v)} step="0.1" min="0.1" suffix="×" />
        </div>
      )}
    </div>
  );
}