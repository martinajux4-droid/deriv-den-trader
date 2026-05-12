import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  ArrowRight, Bot, ShieldCheck, Zap, TrendingUp, Sparkles, BarChart3,
  Lock, Cpu, Globe, Check, ChevronDown, Twitter, Github, Send, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "Hifex Trader AI — AI-Powered Automated Trading Platform" },
      { name: "description", content: "Institutional-grade AI trading bots for Deriv synthetic indices. Real-time execution, smart risk control, transparent profits." },
    ],
  }),
});

function Logo({ size = 36 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid place-items-center rounded-lg bg-gold-gradient text-primary-foreground font-black shadow-[0_0_20px_oklch(0.82_0.15_85_/_0.4)]"
        style={{ width: size, height: size, fontSize: size * 0.45 }}
      >H</div>
      <span className="text-base font-semibold tracking-tight sm:text-lg">
        Hifex <span className="text-gradient-gold">Trader AI</span>
      </span>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "var(--gradient-hero)" }}>
      <Header />
      <Hero />
      <Ticker />
      <Stats />
      <Features />
      <HowItWorks />
      <Pricing />
      <Testimonials />
      <Faq />
      <Contact />
      <Footer />
    </div>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-50 border-b border-white/5 bg-background/60 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 sm:py-4">
        <Logo />
        <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
          <a href="#features" className="hover:text-foreground">Features</a>
          <a href="#how" className="hover:text-foreground">How it works</a>
          <a href="#pricing" className="hover:text-foreground">Pricing</a>
          <a href="#faq" className="hover:text-foreground">FAQ</a>
        </nav>
        <div className="flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm" className="hidden sm:inline-flex">Sign in</Button></Link>
          <Link to="/login">
            <Button size="sm" className="bg-gold-gradient text-primary-foreground hover:opacity-90">
              Launch app <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative mx-auto max-w-7xl px-4 pt-16 pb-20 sm:px-6 sm:pt-24 sm:pb-28">
      <div className="text-center animate-float-up">
        <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-muted-foreground backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-gold" />
          Powered by next-gen AI · Live on Deriv
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl">
          AI-Powered <span className="text-gradient-gold">Automated</span><br />
          Trading <span className="text-gradient-blue">Platform</span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg">
          Deploy institutional-grade AI bots on Deriv synthetic indices.
          Smart entries, automated risk management, and real-time profit tracking — built for serious traders.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/login">
            <Button size="lg" className="w-full bg-gold-gradient text-primary-foreground hover:opacity-90 sm:w-auto animate-pulse-glow">
              Start trading free <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <a href="#how" className="w-full sm:w-auto">
            <Button size="lg" variant="outline" className="w-full border-white/15 bg-white/5 backdrop-blur sm:w-auto">
              See how it works
            </Button>
          </a>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-bull" /> No credit card</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-bull" /> Demo account by default</span>
          <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-bull" /> Cancel anytime</span>
        </div>
      </div>

      <DashboardPreview />
    </section>
  );
}

function DashboardPreview() {
  return (
    <div className="relative mx-auto mt-16 max-w-5xl">
      <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-primary/20 via-accent/20 to-primary/20 opacity-50 blur-3xl" />
      <div className="glass relative overflow-hidden rounded-2xl p-1 shadow-2xl">
        <div className="rounded-xl bg-card/80 p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Portfolio balance</div>
              <div className="num mt-1 text-3xl font-bold sm:text-4xl">$ 24,837.<span className="text-muted-foreground">52</span></div>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-bull/10 px-3 py-1.5 text-sm text-bull">
              <TrendingUp className="h-4 w-4" /> +18.42% · 24h
            </div>
          </div>
          <MiniChart />
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { l: "Win rate", v: "78.4%" },
              { l: "Trades", v: "1,284" },
              { l: "Best streak", v: "23" },
              { l: "Active bots", v: "4" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border border-white/5 bg-background/40 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">{s.l}</div>
                <div className="num mt-1 text-lg font-semibold">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniChart() {
  // Simple animated SVG sparkline
  const pts = [10, 18, 14, 22, 19, 28, 24, 32, 30, 40, 36, 48, 44, 56, 60];
  const max = Math.max(...pts);
  const w = 600, h = 140;
  const step = w / (pts.length - 1);
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * h}`).join(" ");
  const area = `${path} L ${w} ${h} L 0 ${h} Z`;
  return (
    <div className="mt-5 overflow-hidden rounded-lg border border-white/5 bg-background/40">
      <svg viewBox={`0 0 ${w} ${h}`} className="h-32 w-full sm:h-40">
        <defs>
          <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="oklch(0.86 0.14 90)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="oklch(0.86 0.14 90)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#g)" />
        <path d={path} fill="none" stroke="oklch(0.86 0.14 90)" strokeWidth="2" />
      </svg>
    </div>
  );
}

function Ticker() {
  const items = [
    { s: "VOL 75", p: "412,839.21", c: "+1.24%" },
    { s: "VOL 100", p: "918,402.55", c: "+0.87%" },
    { s: "VOL 50", p: "284,920.18", c: "-0.32%" },
    { s: "VOL 25", p: "172,341.07", c: "+2.18%" },
    { s: "VOL 10", p: "84,221.92", c: "+0.55%" },
    { s: "BOOM 1000", p: "8,402.41", c: "+3.04%" },
    { s: "CRASH 500", p: "5,118.66", c: "-1.12%" },
    { s: "JUMP 75", p: "61,204.30", c: "+0.92%" },
  ];
  const row = [...items, ...items];
  return (
    <div className="border-y border-white/5 bg-background/40 py-3 backdrop-blur">
      <div className="flex animate-ticker gap-10 whitespace-nowrap text-sm">
        {row.map((t, i) => (
          <span key={i} className="flex items-center gap-2 text-muted-foreground">
            <span className="font-semibold text-foreground">{t.s}</span>
            <span className="num">{t.p}</span>
            <span className={`num ${t.c.startsWith("+") ? "text-bull" : "text-bear"}`}>{t.c}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function Stats() {
  const [profit, setProfit] = useState(2_148_293);
  useEffect(() => {
    const id = setInterval(() => setProfit((p) => p + Math.floor(Math.random() * 240 + 40)), 1500);
    return () => clearInterval(id);
  }, []);
  const items = [
    { l: "Total profit generated", v: `$${profit.toLocaleString()}`, live: true },
    { l: "Active traders", v: "12,847" },
    { l: "Trades executed", v: "4.2M+" },
    { l: "Avg. win rate", v: "76.8%" },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 sm:py-20">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((s) => (
          <div key={s.l} className="glass rounded-xl p-5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>{s.l}</span>
              {s.live && <span className="flex items-center gap-1 text-bull"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-bull" /> live</span>}
            </div>
            <div className="num mt-2 text-2xl font-bold sm:text-3xl">{s.v}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Features() {
  const features = [
    { icon: Bot, title: "AI signal engine", body: "Neural models analyze tick streams to confirm Rise/Fall and digit entries with high-probability setups." },
    { icon: ShieldCheck, title: "Smart risk control", body: "Per-trade stop loss, daily loss caps, and drawdown circuit breakers protect your capital 24/7." },
    { icon: Zap, title: "Real-time execution", body: "WebSocket bot trades with sub-second latency. No missed entries, no slippage surprises." },
    { icon: BarChart3, title: "Live analytics", body: "Profit curves, win-rate heatmaps, per-strategy P&L. Know exactly what's working." },
    { icon: Cpu, title: "Auto compounding", body: "Reinvest profits automatically with configurable scaling and martingale toggles." },
    { icon: Lock, title: "Bank-grade security", body: "OAuth-only Deriv link, encrypted tokens, RLS-protected database. Your keys, your control." },
    { icon: Globe, title: "Multi-account support", body: "Switch between demo and live, or run separate strategies across multiple Deriv logins." },
    { icon: TrendingUp, title: "Strategy library", body: "Pre-built Rise/Fall, Even/Odd, Digit Over/Under bots. Tune to your risk profile." },
  ];
  return (
    <section id="features" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Features"
        title={<>Everything you need to <span className="text-gradient-gold">trade smarter</span></>}
        subtitle="Production-grade infrastructure built for traders who don't have time to babysit charts."
      />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {features.map(({ icon: Icon, title, body }) => (
          <div key={title} className="glass group rounded-xl p-5 transition hover:border-primary/30">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-gold-gradient text-primary-foreground">
              <Icon className="h-5 w-5" />
            </div>
            <div className="mt-4 font-semibold">{title}</div>
            <div className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorks() {
  const steps = [
    { n: "01", t: "Create your account", d: "Sign up free in 30 seconds. Email or Google — your choice." },
    { n: "02", t: "Connect Deriv via OAuth", d: "Securely link your Deriv account. We never see your password." },
    { n: "03", t: "Pick a strategy", d: "Choose a pre-built AI bot or build your own with our visual configurator." },
    { n: "04", t: "Let the AI trade", d: "Sit back. The bot executes, manages risk, and reports profit in real time." },
  ];
  return (
    <section id="how" className="border-y border-white/5 bg-background/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading
          eyebrow="How it works"
          title={<>From signup to <span className="text-gradient-blue">first trade</span> in 4 steps</>}
        />
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s) => (
            <div key={s.n} className="glass relative rounded-xl p-6">
              <div className="text-gradient-gold text-3xl font-black">{s.n}</div>
              <div className="mt-3 font-semibold">{s.t}</div>
              <div className="mt-1.5 text-sm text-muted-foreground">{s.d}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Pricing() {
  const tiers = [
    {
      name: "Starter", price: "Free", desc: "Try the platform with demo trading",
      features: ["1 active bot", "Demo account only", "Basic analytics", "Community support"],
      cta: "Start free", featured: false,
    },
    {
      name: "Pro", price: "$49", per: "/mo", desc: "Real-money trading + advanced AI",
      features: ["Unlimited bots", "Real Deriv accounts", "AI signal engine", "Risk management suite", "Priority support"],
      cta: "Go Pro", featured: true,
    },
    {
      name: "VIP", price: "$199", per: "/mo", desc: "For serious capital deployment",
      features: ["Everything in Pro", "Custom strategies", "Multi-account routing", "1-on-1 onboarding", "API access"],
      cta: "Become VIP", featured: false,
    },
  ];
  return (
    <section id="pricing" className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading
        eyebrow="Pricing"
        title={<>Simple plans, <span className="text-gradient-gold">serious upside</span></>}
        subtitle="Start free. Upgrade when your bots are printing."
      />
      <div className="mt-12 grid gap-5 lg:grid-cols-3">
        {tiers.map((t) => (
          <div
            key={t.name}
            className={`glass relative rounded-2xl p-6 sm:p-8 ${t.featured ? "border-primary/40 shadow-[0_0_60px_oklch(0.82_0.15_85_/_0.15)]" : ""}`}
          >
            {t.featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold-gradient px-3 py-1 text-xs font-semibold text-primary-foreground">
                Most popular
              </span>
            )}
            <div className="text-sm font-medium text-muted-foreground">{t.name}</div>
            <div className="mt-3 flex items-baseline gap-1">
              <span className="text-4xl font-bold">{t.price}</span>
              {t.per && <span className="text-sm text-muted-foreground">{t.per}</span>}
            </div>
            <div className="mt-1 text-sm text-muted-foreground">{t.desc}</div>
            <ul className="mt-6 space-y-2.5 text-sm">
              {t.features.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-bull" /> <span>{f}</span>
                </li>
              ))}
            </ul>
            <Link to="/login" className="mt-7 block">
              <Button className={`w-full ${t.featured ? "bg-gold-gradient text-primary-foreground hover:opacity-90" : ""}`} variant={t.featured ? "default" : "outline"}>
                {t.cta}
              </Button>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

function Testimonials() {
  const items = [
    { name: "Marcus T.", role: "Day trader", q: "Hifex made automation actually safe. The risk controls saved me twice in one week.", g: "MT" },
    { name: "Aisha R.", role: "Quant analyst", q: "The signal confirmation layer is the real deal. My win rate jumped from 58% to 74%.", g: "AR" },
    { name: "David L.", role: "VIP member", q: "Multi-account routing across my Deriv logins is a game changer. Worth every dollar.", g: "DL" },
  ];
  return (
    <section className="border-y border-white/5 bg-background/40 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <SectionHeading eyebrow="Testimonials" title={<>Loved by <span className="text-gradient-gold">12,000+ traders</span></>} />
        <div className="mt-12 grid gap-5 lg:grid-cols-3">
          {items.map((t) => (
            <figure key={t.name} className="glass rounded-2xl p-6">
              <div className="flex text-gold">{"★★★★★"}</div>
              <blockquote className="mt-4 text-sm leading-relaxed text-foreground/90">"{t.q}"</blockquote>
              <figcaption className="mt-5 flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-gradient text-sm font-semibold">{t.g}</div>
                <div>
                  <div className="text-sm font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    { q: "Is Hifex Trader AI safe to use?", a: "Yes. We use OAuth to connect to Deriv (we never see your password), encrypt all tokens, and start every account in demo mode by default." },
    { q: "Do I need trading experience?", a: "No. Our pre-built bots run out of the box. Advanced traders can fine-tune every parameter." },
    { q: "What markets can I trade?", a: "All Deriv synthetic indices: Volatility 10/25/50/75/100, Boom & Crash, Jump indices, plus digit-based contracts." },
    { q: "Can I lose money?", a: "Yes — trading involves real risk. We give you stop loss, daily caps, and circuit breakers, but no system guarantees profit." },
    { q: "Can I cancel anytime?", a: "Of course. Cancel from your dashboard with one click. No questions, no fees." },
  ];
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="mx-auto max-w-3xl px-4 py-20 sm:px-6 sm:py-28">
      <SectionHeading eyebrow="FAQ" title={<>Frequently asked <span className="text-gradient-blue">questions</span></>} />
      <div className="mt-10 space-y-3">
        {items.map((it, i) => (
          <div key={it.q} className="glass overflow-hidden rounded-xl">
            <button
              onClick={() => setOpen(open === i ? null : i)}
              className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-medium hover:bg-white/5"
            >
              {it.q}
              <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${open === i ? "rotate-180" : ""}`} />
            </button>
            {open === i && (
              <div className="border-t border-white/5 p-5 text-sm text-muted-foreground">{it.a}</div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 sm:pb-28">
      <div className="glass overflow-hidden rounded-3xl p-8 text-center sm:p-14">
        <Sparkles className="mx-auto h-8 w-8 text-gold" />
        <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
          Ready to deploy your first <span className="text-gradient-gold">AI bot?</span>
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
          Join thousands of traders automating profits on Deriv. Free to start, no card required.
        </p>
        <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link to="/login">
            <Button size="lg" className="bg-gold-gradient text-primary-foreground hover:opacity-90">
              Launch app <ArrowRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
          <a href="mailto:hello@hifextrader.ai">
            <Button size="lg" variant="outline" className="border-white/15 bg-white/5">
              <Mail className="mr-2 h-4 w-4" /> Talk to us
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="border-t border-white/5 bg-background/60 py-10 backdrop-blur">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 sm:px-6 md:flex-row md:items-center">
        <div>
          <Logo />
          <p className="mt-2 max-w-sm text-xs text-muted-foreground">
            AI-powered automated trading platform for Deriv synthetic indices. Trading involves risk — start with demo.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <a href="#" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"><Twitter className="h-4 w-4" /></a>
          <a href="#" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"><Send className="h-4 w-4" /></a>
          <a href="#" className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 bg-white/5 text-muted-foreground hover:text-foreground"><Github className="h-4 w-4" /></a>
        </div>
      </div>
      <div className="mx-auto mt-6 max-w-7xl px-4 text-center text-[11px] text-muted-foreground sm:px-6">
        © {new Date().getFullYear()} Hifex Trader AI · Not affiliated with Deriv.com · Trading involves substantial risk of loss.
      </div>
    </footer>
  );
}

function SectionHeading({ eyebrow, title, subtitle }: { eyebrow: string; title: React.ReactNode; subtitle?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">{eyebrow}</div>
      <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}