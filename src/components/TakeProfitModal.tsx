import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Trophy, X, Share2, Play, Square, Download, Sparkles, CheckCircle2 } from "lucide-react";
import { BOT_TP, type TpPayload } from "@/hooks/use-bot-status";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function TakeProfitModal() {
  const [payload, setPayload] = useState<TpPayload | null>(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    const onTp = (e: Event) => {
      const detail = (e as CustomEvent<TpPayload>).detail;
      setPayload(detail);
      // play optional success sound
      try { beep(); } catch {}
    };
    window.addEventListener(BOT_TP, onTp as EventListener);
    return () => window.removeEventListener(BOT_TP, onTp as EventListener);
  }, []);

  if (typeof document === "undefined" || !payload) return null;

  const close = () => { setPayload(null); setShowShare(false); };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-md animate-in fade-in" onClick={close} />
      <Confetti />
      <div className="profit-pop relative w-full max-w-md overflow-hidden rounded-3xl border border-bull/40 bg-card shadow-[0_40px_120px_-20px_oklch(0.74_0.18_150_/_0.5)]">
        {/* Glow background */}
        <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-bull/40 blur-[100px]" />
        <div className="pointer-events-none absolute inset-0 shimmer-gold opacity-30" />

        <button onClick={close} className="absolute right-3 top-3 z-10 rounded-full bg-background/60 p-1.5 hover:bg-background">
          <X className="h-4 w-4" />
        </button>

        {!showShare ? (
          <div className="relative px-6 pb-6 pt-8 text-center">
            <div className="mx-auto mb-3 grid h-16 w-16 place-items-center rounded-full bg-bull-gradient text-bull-foreground shadow-[0_0_40px_oklch(0.74_0.18_150_/_0.6)]">
              <Trophy className="h-8 w-8" />
            </div>
            <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase tracking-[0.2em] text-bull">
              <Sparkles className="h-3 w-3" /> Take Profit Reached
            </div>
            <h2 className="mt-1 text-2xl font-bold">🎯 Target Hit!</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              {payload.strategy} on {payload.symbol} · {payload.accountType}
            </p>

            <div className="mt-5 rounded-2xl border border-bull/30 bg-bull/10 p-4">
              <div className="text-[10px] uppercase tracking-wider text-bull">Net Profit</div>
              <div className="num mt-1 text-4xl font-bold text-bull">
                +${payload.pnl.toFixed(2)}
              </div>
              <div className="num mt-0.5 text-[11px] text-muted-foreground">
                ROI {payload.roi >= 0 ? "+" : ""}{payload.roi.toFixed(2)}% · {payload.currency}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <Stat label="Trades" value={`${payload.trades}`} />
              <Stat label="Wins" value={`${payload.wins}`} tone="bull" />
              <Stat label="AI Conf" value={`${payload.confidence}%`} tone="primary" />
            </div>

            <div className="mt-5 flex flex-col gap-2">
              <button
                onClick={() => setShowShare(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 text-sm font-semibold text-primary-foreground shadow-[0_10px_30px_-10px_oklch(0.82_0.15_85_/_0.6)] hover:opacity-95">
                <Share2 className="h-4 w-4" /> Share Result
              </button>
              <div className="grid grid-cols-2 gap-2">
                <button onClick={close} className="flex items-center justify-center gap-1.5 rounded-xl border border-bull/40 bg-bull/10 py-2 text-xs font-medium text-bull hover:bg-bull/20">
                  <Play className="h-3.5 w-3.5" /> Continue
                </button>
                <button
                  onClick={() => { window.dispatchEvent(new CustomEvent("hifex:bot-stop")); close(); }}
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-border bg-background/60 py-2 text-xs font-medium hover:bg-muted">
                  <Square className="h-3.5 w-3.5" /> Stop Bot
                </button>
              </div>
            </div>
          </div>
        ) : (
          <ShareView payload={payload} onBack={() => setShowShare(false)} />
        )}
      </div>
    </div>,
    document.body
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "bull" | "primary" }) {
  return (
    <div className="rounded-lg border border-border/60 bg-background/40 p-2">
      <div className="text-[9px] uppercase text-muted-foreground">{label}</div>
      <div className={cn("num text-base font-semibold",
        tone === "bull" && "text-bull", tone === "primary" && "text-primary")}>{value}</div>
    </div>
  );
}

function ShareView({ payload, onBack }: { payload: TpPayload; onBack: () => void }) {
  const text = useMemo(() =>
    `🎯 Hit Take Profit on Hifex Trader AI\n+$${payload.pnl.toFixed(2)} (${payload.roi.toFixed(2)}% ROI)\n${payload.strategy} · ${payload.symbol}\nAI confidence ${payload.confidence}%`,
    [payload]
  );
  const enc = encodeURIComponent(text);

  const downloadCard = async () => {
    try {
      const svg = makeSvgCard(payload);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `hifex-profit-${Date.now()}.svg`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      toast.error("Could not generate card");
    }
  };

  return (
    <div className="relative px-6 pb-6 pt-8">
      <div className="text-center text-[11px] uppercase tracking-[0.2em] text-primary">Share Card</div>
      <h3 className="mt-1 text-center text-lg font-semibold">Spread the win</h3>

      {/* Premium card preview */}
      <div className="mt-4 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-[oklch(0.16_0.02_260)] to-[oklch(0.10_0.02_260)] p-5 text-foreground shadow-[0_0_50px_oklch(0.82_0.15_85_/_0.25)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gold-gradient text-primary-foreground font-bold">H</div>
            <div className="leading-tight">
              <div className="text-[10px] font-semibold tracking-wide">Hifex Trader</div>
              <div className="text-[8px] uppercase tracking-[0.2em] text-primary/80">AI Terminal</div>
            </div>
          </div>
          <span className="rounded-full border border-bull/40 bg-bull/10 px-2 py-0.5 text-[9px] font-semibold uppercase text-bull">
            <CheckCircle2 className="mr-0.5 inline h-2.5 w-2.5" /> Win
          </span>
        </div>
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Net profit</div>
          <div className="num bg-gold-gradient bg-clip-text text-4xl font-extrabold text-transparent">
            +${payload.pnl.toFixed(2)}
          </div>
          <div className="num text-[11px] text-bull">ROI {payload.roi.toFixed(2)}%</div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-[10px]">
          <MiniSh label="Strategy" value={payload.strategy.replace(/_/g, " ")} />
          <MiniSh label="Market" value={payload.symbol} />
          <MiniSh label="AI" value={`${payload.confidence}%`} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <a target="_blank" rel="noreferrer" href={`https://wa.me/?text=${enc}`}
          className="rounded-xl border border-bull/40 bg-bull/10 py-2 text-center text-xs font-medium text-bull hover:bg-bull/20">
          WhatsApp
        </a>
        <a target="_blank" rel="noreferrer" href={`https://t.me/share/url?url=https%3A%2F%2Fhifextrader.com&text=${enc}`}
          className="rounded-xl border border-accent/40 bg-accent/10 py-2 text-center text-xs font-medium text-accent hover:bg-accent/20">
          Telegram
        </a>
        <button onClick={downloadCard}
          className="flex items-center justify-center gap-1 rounded-xl border border-primary/40 bg-primary/10 py-2 text-xs font-medium text-primary hover:bg-primary/20">
          <Download className="h-3.5 w-3.5" /> Save
        </button>
      </div>
      <button onClick={onBack} className="mt-3 w-full text-center text-[11px] text-muted-foreground hover:text-foreground">
        ← Back to summary
      </button>
    </div>
  );
}

function MiniSh({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border/40 bg-background/40 p-1.5">
      <div className="text-[8px] uppercase text-muted-foreground">{label}</div>
      <div className="truncate text-[11px] font-semibold">{value}</div>
    </div>
  );
}

function Confetti() {
  const pieces = Array.from({ length: 36 });
  const colors = ["#f5c542", "#3ecf8e", "#3b82f6", "#fcd34d", "#ef4444"];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const dur = 2 + Math.random() * 2.4;
        const delay = Math.random() * 0.6;
        const size = 6 + Math.random() * 8;
        const color = colors[i % colors.length];
        return (
          <span
            key={i}
            style={{
              position: "absolute", top: -20, left: `${left}%`, width: size, height: size * 0.4,
              background: color, borderRadius: 2,
              animation: `confetti-fall ${dur}s ${delay}s linear forwards`,
              opacity: 0.9,
            }}
          />
        );
      })}
    </div>
  );
}

function beep() {
  const Ctx = (window as any).AudioContext || (window as any).webkitAudioContext;
  if (!Ctx) return;
  const ctx = new Ctx();
  const notes = [880, 1175, 1568];
  notes.forEach((f, i) => {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = f;
    g.gain.value = 0.0001;
    o.connect(g).connect(ctx.destination);
    const t0 = ctx.currentTime + i * 0.12;
    g.gain.exponentialRampToValueAtTime(0.18, t0 + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.25);
    o.start(t0); o.stop(t0 + 0.3);
  });
  setTimeout(() => ctx.close(), 1500);
}

function makeSvgCard(p: TpPayload) {
  const w = 1080, h = 1080;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#0d1424"/>
        <stop offset="100%" stop-color="#05080f"/>
      </linearGradient>
      <linearGradient id="gold" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="#f6d27a"/>
        <stop offset="100%" stop-color="#caa14a"/>
      </linearGradient>
    </defs>
    <rect width="${w}" height="${h}" fill="url(#bg)"/>
    <circle cx="900" cy="120" r="260" fill="#caa14a" opacity="0.15"/>
    <circle cx="120" cy="980" r="280" fill="#3ecf8e" opacity="0.12"/>
    <text x="80" y="120" font-family="Inter,Arial" font-size="36" fill="url(#gold)" font-weight="700">HIFEX TRADER</text>
    <text x="80" y="160" font-family="Inter,Arial" font-size="22" fill="#9aa3b2">AI Trading Terminal</text>
    <text x="80" y="360" font-family="Inter,Arial" font-size="32" fill="#9aa3b2">Net Profit</text>
    <text x="80" y="500" font-family="Inter,Arial" font-size="160" fill="url(#gold)" font-weight="800">+$${p.pnl.toFixed(2)}</text>
    <text x="80" y="560" font-family="Inter,Arial" font-size="36" fill="#3ecf8e" font-weight="700">ROI ${p.roi.toFixed(2)}%</text>
    <rect x="80" y="700" width="920" height="220" rx="24" fill="#0f1729" stroke="#2a3550"/>
    <text x="120" y="760" font-family="Inter,Arial" font-size="22" fill="#9aa3b2">Strategy</text>
    <text x="120" y="800" font-family="Inter,Arial" font-size="34" fill="#fff" font-weight="700">${(p.strategy || "").replace(/_/g, " ")}</text>
    <text x="120" y="860" font-family="Inter,Arial" font-size="22" fill="#9aa3b2">Market · AI Confidence</text>
    <text x="120" y="900" font-family="Inter,Arial" font-size="34" fill="#f6d27a" font-weight="700">${p.symbol} · ${p.confidence}%</text>
    <text x="80" y="1020" font-family="Inter,Arial" font-size="22" fill="#6b7280">hifextrader.com · ${p.accountType} account</text>
  </svg>`;
}