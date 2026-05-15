import { useEffect } from "react";
import { CheckCircle2, XCircle, X } from "lucide-react";

export type SettlementResult = {
  profit: number;
  contract_type: string;
  stake: number;
  entry_spot: number | null;
  exit_spot: number | null;
  currency?: string;
} | null;

export function SettlementPopup({ result, onClose }: { result: SettlementResult; onClose: () => void }) {
  useEffect(() => {
    if (!result) return;
    const t = setTimeout(onClose, 5000);
    return () => clearTimeout(t);
  }, [result, onClose]);

  if (!result) return null;
  const won = result.profit > 0;
  return (
    <div className="pointer-events-none fixed inset-0 z-[100] flex items-start justify-center pt-24 px-4 animate-fade-in">
      <div className={`pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-2xl border-2 p-5 backdrop-blur-xl ${
        won
          ? "border-bull/60 bg-bull/10 shadow-[0_0_60px_-10px_var(--meter-bull)]"
          : "border-bear/60 bg-bear/10 shadow-[0_0_60px_-10px_var(--meter-bear)]"
      }`}>
        <button onClick={onClose} className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full text-muted-foreground hover:text-foreground hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-3">
          <div className={`grid h-12 w-12 place-items-center rounded-full ${won ? "bg-bull/25 text-bull" : "bg-bear/25 text-bear"}`}>
            {won ? <CheckCircle2 className="h-7 w-7" /> : <XCircle className="h-7 w-7" />}
          </div>
          <div>
            <div className={`text-[11px] uppercase tracking-[0.2em] font-bold ${won ? "text-bull" : "text-bear"}`}>
              {won ? "Trade Won" : result.profit < 0 ? "Trade Lost" : "Even"}
            </div>
            <div className={`num text-2xl font-extrabold ${won ? "text-bull" : "text-bear"}`}>
              {won ? "+" : ""}{result.profit.toFixed(2)} {result.currency || ""}
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Type" value={result.contract_type} />
          <Stat label="Entry" value={result.entry_spot != null ? Number(result.entry_spot).toFixed(3) : "—"} />
          <Stat label="Exit" value={result.exit_spot != null ? Number(result.exit_spot).toFixed(3) : "—"} />
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-white/10 bg-black/30 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="num text-xs font-semibold">{value}</div>
    </div>
  );
}