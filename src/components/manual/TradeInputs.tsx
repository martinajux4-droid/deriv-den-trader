import { useState } from "react";

export type TradeConfig = {
  stake: number;
  takeProfit: number;
  maxLoss: number;
  stopLoss: number;
  martingale: number;
  ticks: number;
  duration: number;
  durationUnit: "t" | "s" | "m";
  digit: number;
  riskMultiplier: number;
  stakeList: string;
};

type ToggleKey = "martingale" | "stakeList" | "ticks" | "duration";

export function TradeInputs({
  cfg, setCfg, showDigit = false,
}: {
  cfg: TradeConfig;
  setCfg: (next: TradeConfig) => void;
  showDigit?: boolean;
}) {
  const upd = <K extends keyof TradeConfig>(k: K, v: TradeConfig[K]) =>
    setCfg({ ...cfg, [k]: v });

  const [enabled, setEnabled] = useState<Record<ToggleKey, boolean>>({
    martingale: (cfg.martingale ?? 0) > 1,
    stakeList: !!cfg.stakeList,
    ticks: (cfg.ticks ?? 0) > 0,
    duration: (cfg.duration ?? 0) > 0,
  });

  const toggle = (k: ToggleKey) =>
    setEnabled((prev) => ({ ...prev, [k]: !prev[k] }));

  return (
    <div className="space-y-3">
      {/* Pill input row — STAKE / TAKE PROFIT / MAX LOSSES / STOPLOSS */}
      <div className="grid grid-cols-2 gap-2">
        <PillField
          label="STAKE"
          value={cfg.stake}
          onChange={(n) => upd("stake", n)}
          step="0.5"
          min="0.35"
        />
        <PillField
          label="TAKE PROFIT"
          value={cfg.takeProfit}
          onChange={(n) => upd("takeProfit", n)}
          step="1"
        />
        <PillField
          label="MAX LOSSES"
          value={cfg.maxLoss}
          onChange={(n) => upd("maxLoss", n)}
          step="1"
        />
        <PillField
          label="STOPLOSS"
          value={cfg.stopLoss}
          onChange={(n) => upd("stopLoss", n)}
          step="1"
        />
      </div>

      {/* Toggle chips — Martingale / Stake List / Ticks / Duration */}
      <div className="grid grid-cols-2 gap-2">
        <ToggleChip
          label="Martingale"
          on={enabled.martingale}
          onClick={() => toggle("martingale")}
        />
        <ToggleChip
          label="Stake List"
          on={enabled.stakeList}
          onClick={() => toggle("stakeList")}
        />
        <ToggleChip
          label="Ticks"
          on={enabled.ticks}
          onClick={() => toggle("ticks")}
        />
        <ToggleChip
          label="Duration"
          on={enabled.duration}
          onClick={() => toggle("duration")}
        />
      </div>

      {/* Expanded controls per enabled toggle */}
      {(enabled.martingale ||
        enabled.stakeList ||
        enabled.ticks ||
        enabled.duration ||
        showDigit) && (
        <div className="grid grid-cols-2 gap-2 rounded-xl border border-white/10 bg-white/[0.02] p-2.5">
          {enabled.martingale && (
            <PillField
              label="MARTINGALE"
              value={cfg.martingale}
              onChange={(n) => upd("martingale", n)}
              step="0.1"
              min="1"
              suffix="×"
            />
          )}
          {enabled.stakeList && (
            <label className="col-span-2 flex flex-col gap-1">
              <span className="px-1 text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
                STAKE LIST
              </span>
              <input
                type="text"
                placeholder="1, 2, 4, 8, 16"
                value={cfg.stakeList}
                onChange={(e) => upd("stakeList", e.target.value)}
                className="num input-glow w-full rounded-full bg-transparent px-3 py-2 text-sm font-semibold outline-none"
              />
            </label>
          )}
          {enabled.ticks && (
            <PillField
              label="TICKS"
              value={cfg.ticks}
              onChange={(n) => upd("ticks", Math.max(1, Math.round(n)))}
              step="1"
              min="1"
            />
          )}
          {enabled.duration && (
            <div className="flex items-end gap-1.5">
              <div className="flex-1">
                <PillField
                  label="DURATION"
                  value={cfg.duration}
                  onChange={(n) => upd("duration", Math.max(1, Math.round(n)))}
                  step="1"
                  min="1"
                />
              </div>
              <select
                value={cfg.durationUnit}
                onChange={(e) =>
                  upd("durationUnit", e.target.value as TradeConfig["durationUnit"])
                }
                className="input-glow rounded-full bg-transparent px-2 py-2 text-xs font-semibold outline-none"
                aria-label="Duration unit"
              >
                <option value="t">t</option>
                <option value="s">s</option>
                <option value="m">m</option>
              </select>
            </div>
          )}
          {showDigit && (
            <PillField
              label="DIGIT (0–9)"
              value={cfg.digit}
              onChange={(n) =>
                upd("digit", Math.max(0, Math.min(9, Math.round(n))))
              }
              step="1"
              min="0"
            />
          )}
        </div>
      )}
    </div>
  );
}

function PillField({
  label, value, onChange, step = "0.01", min = "0", suffix,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step?: string;
  min?: string;
  suffix?: string;
}) {
  return (
    <label className="relative block">
      <input
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        value={Number.isFinite(value) ? value : 0}
        onChange={(e) => onChange(Number(e.target.value))}
        placeholder={label}
        className="num input-glow w-full rounded-full bg-transparent px-3.5 py-2.5 text-sm font-bold uppercase tracking-wider outline-none placeholder:text-[10px] placeholder:font-bold placeholder:uppercase placeholder:tracking-[0.18em] placeholder:text-muted-foreground/70"
      />
      {suffix && (
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {suffix}
        </span>
      )}
    </label>
  );
}

function ToggleChip({
  label, on, onClick,
}: {
  label: string;
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={`group flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-bold uppercase tracking-wider transition-all ${
        on
          ? "border-[var(--color-primary)]/60 bg-[var(--color-primary)]/10 text-foreground shadow-[0_0_18px_-6px_var(--color-primary)]"
          : "border-white/10 bg-white/[0.02] text-muted-foreground hover:border-white/20"
      }`}
    >
      <span
        className={`h-3.5 w-3.5 rounded-full border transition-all ${
          on
            ? "border-[var(--color-primary)] bg-[var(--color-primary)] shadow-[0_0_10px_var(--color-primary)]"
            : "border-white/30 bg-transparent"
        }`}
      />
      {label}
    </button>
  );
}
