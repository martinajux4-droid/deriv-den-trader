import { createFileRoute } from "@tanstack/react-router";
import { StrategyPage } from "@/components/manual/StrategyPage";

export const Route = createFileRoute("/_authenticated/bot")({
  component: BotPage,
});

function BotPage() {
  return (
    <div className="relative">
      {/* Animated market background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,oklch(0.7_0.18_250/0.15),transparent_60%),radial-gradient(ellipse_60%_50%_at_90%_110%,oklch(0.65_0.22_25/0.10),transparent_60%)]" />
        <div className="absolute inset-0 bg-grid-fine opacity-[0.04]" />
        <div className="absolute -top-40 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[var(--meter-ai)]/10 blur-[140px] animate-pulse" />
      </div>

      {/* Centered focused terminal */}
      <div className="mx-auto w-full max-w-6xl">
        <StrategyPage id="even-odd" />
      </div>
    </div>
  );
}
