import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { ArrowRight, Bot, LineChart, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen" style={{ background: "var(--gradient-hero)" }}>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">D</div>
          <span className="text-lg font-semibold tracking-tight">DerivFlow</span>
        </div>
        <nav className="flex items-center gap-3">
          <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
          <Link to="/login"><Button>Get started <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
        </nav>
      </header>

      <section className="mx-auto max-w-5xl px-6 pt-16 pb-24 text-center">
        <span className="inline-flex items-center rounded-full border border-border bg-card/40 px-3 py-1 text-xs text-muted-foreground">
          <span className="mr-2 h-2 w-2 rounded-full bg-primary animate-pulse" />
          Live on Deriv synthetic indices
        </span>
        <h1 className="mt-6 text-5xl font-bold tracking-tight sm:text-6xl">
          Trade smarter on <span className="bull">Volatility</span> indices
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          Connect your Deriv account, place trades manually, and run automated strategies — with real-time ticks, live P&L, and full trade history.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link to="/login"><Button size="lg">Start trading <ArrowRight className="ml-1 h-4 w-4" /></Button></Link>
          <a href="https://deriv.com" target="_blank" rel="noreferrer">
            <Button size="lg" variant="secondary">What is Deriv?</Button>
          </a>
        </div>

        <div className="mx-auto mt-16 grid max-w-4xl gap-4 sm:grid-cols-3 text-left">
          {[
            { icon: LineChart, title: "Real-time ticks", body: "Live WebSocket feed for Volatility 10/25/50/75/100." },
            { icon: Bot, title: "Bot strategies", body: "Rise/Fall, Digit Over/Under, Martingale — fully configurable." },
            { icon: ShieldCheck, title: "Demo first", body: "Default to virtual account. Real money only when you're ready." },
          ].map(({ icon: Icon, title, body }) => (
            <div key={title} className="rounded-xl border border-border bg-card/60 p-5 backdrop-blur">
              <Icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-medium">{title}</div>
              <div className="mt-1 text-sm text-muted-foreground">{body}</div>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border/60 py-6 text-center text-xs text-muted-foreground">
        Trading involves risk. Use a demo account first. Not affiliated with Deriv.
      </footer>
    </div>
  );
}
