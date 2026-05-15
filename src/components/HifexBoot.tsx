import { useEffect, useState } from "react";

const CHIPS = ["WS/LINK", "NEON/CORE", "v3+API"];

export function HifexBoot() {
  const [show, setShow] = useState(() => {
    if (typeof window === "undefined") return false;
    return !sessionStorage.getItem("hifex-boot-seen");
  });
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!show) return;
    const tickInt = setInterval(() => setStep((s) => (s + 1) % 5), 280);
    const t = setTimeout(() => {
      sessionStorage.setItem("hifex-boot-seen", "1");
      setShow(false);
    }, 2400);
    return () => {
      clearInterval(tickInt);
      clearTimeout(t);
    };
  }, [show]);

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center overflow-hidden bg-black animate-[hifex-fade_400ms_ease-out]">
      {/* radar grid */}
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(oklch(0.86 0.27 142 / 0.18) 1px, transparent 1px), linear-gradient(90deg, oklch(0.86 0.27 142 / 0.18) 1px, transparent 1px)",
          backgroundSize: "44px 44px, 44px 44px",
          maskImage:
            "radial-gradient(circle at 50% 50%, black 30%, transparent 75%)",
        }}
      />
      {/* concentric radar rings */}
      <div className="absolute inset-0 flex items-center justify-center">
        {[0.4, 0.65, 0.9, 1.15].map((s, i) => (
          <span
            key={i}
            className="absolute rounded-full border"
            style={{
              width: `${s * 90}vmin`,
              height: `${s * 90}vmin`,
              borderColor: `oklch(0.86 0.27 142 / ${0.32 - i * 0.06})`,
              boxShadow: `inset 0 0 80px oklch(0.86 0.27 142 / 0.18)`,
              animation: `hifex-ring-pulse 2.6s ease-in-out ${i * 0.3}s infinite`,
            }}
          />
        ))}
      </div>
      {/* central green halo */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(40% 40% at 50% 50%, oklch(0.86 0.27 142 / 0.30), transparent 70%)",
        }}
      />
      {/* sweep */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, transparent, oklch(0.86 0.27 142 / 0.10), transparent)",
          height: "40%",
          animation: "hifex-sweep 2.4s linear infinite",
        }}
      />

      {/* foreground */}
      <div className="relative z-10 flex flex-col items-center gap-5 px-6">
        <div
          className="rounded border px-4 py-1.5 text-[10px] font-bold uppercase tracking-[0.4em]"
          style={{
            color: "oklch(0.92 0.22 142)",
            borderColor: "oklch(0.86 0.27 142 / 0.6)",
            textShadow: "0 0 12px oklch(0.86 0.27 142 / 0.9)",
            boxShadow: "0 0 24px oklch(0.86 0.27 142 / 0.25), inset 0 0 12px oklch(0.86 0.27 142 / 0.18)",
          }}
        >
          Secure Session
        </div>
        <div
          className="font-mono text-5xl font-black tracking-[0.25em] sm:text-6xl"
          style={{
            color: "oklch(0.95 0.22 142)",
            textShadow:
              "0 0 16px oklch(0.86 0.27 142 / 0.9), 0 0 40px oklch(0.86 0.27 142 / 0.6)",
          }}
        >
          HIFEX
        </div>
        <div
          className="text-sm font-semibold uppercase tracking-[0.6em]"
          style={{
            color: "oklch(0.86 0.18 175)",
            textShadow: "0 0 12px oklch(0.82 0.16 200 / 0.8)",
          }}
        >
          PRO
        </div>

        <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
          {CHIPS.map((c) => (
            <span
              key={c}
              className="rounded-sm border px-2.5 py-1 font-mono text-[10px] uppercase tracking-widest"
              style={{
                color: "oklch(0.92 0.20 142)",
                borderColor: "oklch(0.86 0.27 142 / 0.55)",
                background: "oklch(0.10 0.04 145 / 0.7)",
                boxShadow: "inset 0 0 10px oklch(0.86 0.27 142 / 0.2)",
              }}
            >
              {c}
            </span>
          ))}
        </div>

        <div className="mt-2 flex gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="h-2.5 w-2.5 rounded-[2px] transition-all"
              style={{
                background:
                  i === step
                    ? "oklch(0.92 0.24 142)"
                    : "oklch(0.45 0.12 142 / 0.6)",
                boxShadow:
                  i === step ? "0 0 12px oklch(0.86 0.27 142 / 0.95)" : "none",
              }}
            />
          ))}
        </div>

        {/* market line */}
        <svg
          width="280"
          height="60"
          viewBox="0 0 280 60"
          className="mt-2 opacity-90"
        >
          <polyline
            points="0,40 30,38 55,32 80,36 110,28 140,30 175,20 210,24 245,14 280,18"
            fill="none"
            stroke="oklch(0.92 0.24 142)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              filter: "drop-shadow(0 0 6px oklch(0.86 0.27 142 / 0.9))",
              strokeDasharray: 600,
              strokeDashoffset: 600,
              animation: "hifex-line 1.6s ease-out forwards",
            }}
          />
        </svg>

        {/* progress bar */}
        <div className="mt-2 h-px w-72 overflow-hidden bg-[oklch(0.30_0.10_145_/_0.5)]">
          <div
            className="h-full"
            style={{
              background:
                "linear-gradient(90deg, transparent, oklch(0.92 0.24 142), transparent)",
              animation: "hifex-progress 1.4s linear infinite",
            }}
          />
        </div>

        <div
          className="font-mono text-sm uppercase tracking-[0.5em]"
          style={{
            color: "oklch(0.86 0.18 175)",
            textShadow: "0 0 10px oklch(0.82 0.16 200 / 0.7)",
          }}
        >
          Syncing<span className="ml-1 inline-block animate-pulse">...</span>
        </div>
        <div
          className="text-[10px] uppercase tracking-[0.4em]"
          style={{ color: "oklch(0.65 0.14 145 / 0.8)" }}
        >
          Powered by Deriv
        </div>
      </div>

      <style>{`
        @keyframes hifex-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes hifex-ring-pulse {
          0%, 100% { transform: scale(1); opacity: 0.55; }
          50%      { transform: scale(1.04); opacity: 1; }
        }
        @keyframes hifex-sweep {
          0%   { transform: translateY(-100%); opacity: 0; }
          15%  { opacity: 1; }
          100% { transform: translateY(260%); opacity: 0; }
        }
        @keyframes hifex-line {
          to { stroke-dashoffset: 0; }
        }
        @keyframes hifex-progress {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
