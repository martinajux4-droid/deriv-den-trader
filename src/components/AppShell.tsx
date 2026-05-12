import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, LineChart, Bot, History, Settings, LogOut, Wifi, WifiOff,
  Eye, Activity, Briefcase, BarChart3, Radio, Shield, CreditCard, Users, ShieldCheck,
  Bell, ChevronDown, Sparkles, Globe, Zap, Menu, X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { useBotStatus } from "@/hooks/use-bot-status";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { AIAssistantFab } from "@/components/AIAssistantFab";
import { FloatingProfitWidget } from "@/components/FloatingProfitWidget";
import { TakeProfitModal } from "@/components/TakeProfitModal";
import { AnimatedBackground } from "@/components/AnimatedBackground";

type NavItem = {
  to?: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  soon?: boolean;
};

const PRIMARY_NAV: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/bot", label: "AI Trading Bot", icon: Bot },
  { to: "/trade", label: "Trade Terminal", icon: LineChart },
  { label: "Market Watch", icon: Eye, soon: true },
  { label: "Strategies", icon: Sparkles, soon: true },
  { label: "Portfolio", icon: Briefcase, soon: true },
  { to: "/history", label: "Trade History", icon: History },
  { label: "Analytics", icon: BarChart3, soon: true },
  { label: "Signals", icon: Radio, soon: true },
  { label: "Risk Management", icon: Shield, soon: true },
];

const SECONDARY_NAV: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Settings },
  { label: "Billing", icon: CreditCard, soon: true },
  { label: "Affiliate", icon: Users, soon: true },
  { label: "Admin Panel", icon: ShieldCheck, soon: true },
];

function usePing() {
  const [ping, setPing] = useState<number | null>(null);
  useEffect(() => {
    let alive = true;
    const tick = async () => {
      const start = performance.now();
      try {
        await fetch("https://ws.derivws.com/", { mode: "no-cors", cache: "no-store" });
      } catch {}
      if (alive) setPing(Math.round(performance.now() - start));
    };
    tick();
    const i = setInterval(tick, 8000);
    return () => { alive = false; clearInterval(i); };
  }, []);
  return ping;
}

export function AppShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { accounts, active, setActive, balance, status, profile } = useDeriv();
  const bot = useBotStatus();
  const ping = usePing();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const renderNav = (items: NavItem[]) =>
    items.map(({ to, label, icon: Icon, soon }) => {
      const active = !!to && pathname.startsWith(to);
      const content = (
        <span
          className={cn(
            "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all",
            active
              ? "bg-gradient-to-r from-primary/15 to-accent/10 text-foreground shadow-[inset_0_0_0_1px_oklch(0.82_0.15_85_/_0.25)]"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-foreground",
            soon && "cursor-not-allowed opacity-60 hover:bg-transparent"
          )}
        >
          <Icon className={cn("h-4 w-4", active && "text-primary")} />
          <span className="flex-1">{label}</span>
          {soon && <span className="rounded bg-muted px-1.5 py-0.5 text-[9px] uppercase text-muted-foreground">soon</span>}
          {active && <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.82_0.15_85)]" />}
        </span>
      );
      if (soon || !to) {
        return <div key={label}>{content}</div>;
      }
      return (
        <Link key={to} to={to} onClick={() => setMobileNavOpen(false)}>
          {content}
        </Link>
      );
    });

  const sidebarInner = (
    <div className="flex h-full flex-col">
      <Link to="/dashboard" className="flex items-center gap-2.5 px-3 py-1">
        <div className="relative grid h-9 w-9 place-items-center rounded-lg bg-gold-gradient text-primary-foreground font-bold shadow-[0_0_24px_oklch(0.82_0.15_85_/_0.4)]">
          H
          <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-bull shadow-[0_0_8px_oklch(0.74_0.18_150)]" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">Hifex Trader</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-primary/80">AI Terminal</div>
        </div>
      </Link>

      <div className="mt-5 px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Workspace</div>
      <nav className="mt-1 space-y-0.5">{renderNav(PRIMARY_NAV)}</nav>

      <div className="mt-5 px-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Account</div>
      <nav className="mt-1 space-y-0.5">{renderNav(SECONDARY_NAV)}</nav>

      <div className="mt-auto pt-4">
        <div className="rounded-xl border border-border/60 bg-card/40 p-3">
          <div className="flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full",
              bot.running ? "bg-bull shadow-[0_0_8px_oklch(0.74_0.18_150)] animate-pulse" : "bg-muted-foreground")} />
            <span className="text-[11px] font-medium">{bot.running ? "Bot live" : "Bot idle"}</span>
          </div>
          {bot.running && (
            <div className="num mt-1 text-[11px] text-muted-foreground">
              {bot.symbol} · P&L{" "}
              <span className={(bot.pnl ?? 0) >= 0 ? "bull" : "bear"}>
                {(bot.pnl ?? 0) >= 0 ? "+" : ""}{(bot.pnl ?? 0).toFixed(2)}
              </span>
            </div>
          )}
        </div>
        <Button variant="ghost" className="mt-2 w-full justify-start text-sidebar-foreground/70 hover:text-foreground"
          onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
          <LogOut className="mr-2 h-4 w-4" /> Sign out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="relative flex min-h-screen bg-background text-foreground">
      <AnimatedBackground />
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border bg-sidebar/80 p-4 backdrop-blur md:block">
        {sidebarInner}
      </aside>

      {/* Mobile drawer */}
      {mobileNavOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm md:hidden" onClick={() => setMobileNavOpen(false)} />
          <aside className="fixed inset-y-0 left-0 z-50 w-72 border-r border-sidebar-border bg-sidebar p-4 md:hidden">
            <div className="mb-2 flex items-center justify-end">
              <Button size="icon" variant="ghost" onClick={() => setMobileNavOpen(false)}><X className="h-4 w-4" /></Button>
            </div>
            {sidebarInner}
          </aside>
        </>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-border/60 bg-background/70 px-3 py-2.5 backdrop-blur-xl md:px-5">
          <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setMobileNavOpen(true)}>
            <Menu className="h-4 w-4" />
          </Button>

          {/* Account balance */}
          <div className="flex items-center gap-2 rounded-lg border border-border/60 bg-card/60 px-2.5 py-1.5">
            <div className="grid h-7 w-7 place-items-center rounded-md bg-gold-gradient text-primary-foreground">
              <Zap className="h-3.5 w-3.5" />
            </div>
            <div className="leading-tight">
              <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Balance</div>
              <div className="num text-sm font-semibold">
                {balance ? `${balance.balance.toFixed(2)} ${balance.currency}` : "—"}
              </div>
            </div>
          </div>

          {/* Account selector */}
          {accounts.length > 0 ? (
            <Select value={active?.id} onValueChange={(id) => {
              const a = accounts.find((x) => x.id === id); if (a) setActive(a);
            }}>
              <SelectTrigger className="h-9 w-[200px] border-border/60 bg-card/60 text-xs"><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.loginid} {a.is_virtual ? "(Demo)" : "(Real)"} {a.currency ? `· ${a.currency}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Link to="/settings">
              <Badge variant="outline" className="cursor-pointer hover:border-primary/40">Connect Deriv</Badge>
            </Link>
          )}

          <div className="ml-auto flex items-center gap-2">
            {/* Bot status */}
            <div className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium sm:flex",
              bot.running ? "border-bull/40 bg-bull/10 text-bull" : "border-border bg-card/60 text-muted-foreground"
            )}>
              <Bot className="h-3 w-3" />
              <span>{bot.running ? "Bot Live" : "Bot Idle"}</span>
              {bot.running && bot.pnl != null && (
                <span className="num ml-1 opacity-80">{bot.pnl >= 0 ? "+" : ""}{bot.pnl.toFixed(2)}</span>
              )}
            </div>

            {/* Market open */}
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground lg:flex">
              <Globe className="h-3 w-3 text-accent" />
              <span>Synthetics 24/7</span>
            </div>

            {/* Connection ping */}
            <div className="hidden items-center gap-1.5 rounded-full border border-border bg-card/60 px-2.5 py-1 text-[11px] text-muted-foreground sm:flex">
              {status === "open" ? <Wifi className="h-3 w-3 text-bull" /> : <WifiOff className="h-3 w-3 text-bear" />}
              <span className="num">{ping != null ? `${ping}ms` : "—"}</span>
            </div>

            {/* Notifications */}
            <Button size="icon" variant="ghost" className="relative h-9 w-9">
              <Bell className="h-4 w-4" />
              <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_oklch(0.82_0.15_85)]" />
            </Button>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <div className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-primary/40 to-accent/40 text-[11px] font-bold">
                    {(profile?.display_name || "U").slice(0, 1).toUpperCase()}
                  </div>
                  <ChevronDown className="hidden h-3.5 w-3.5 opacity-60 md:block" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="text-xs">{profile?.display_name || "Trader"}</div>
                  <div className="text-[11px] font-normal text-muted-foreground">Active terminal</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}><Settings className="mr-2 h-3.5 w-3.5" /> Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate({ to: "/history" })}><History className="mr-2 h-3.5 w-3.5" /> Trade history</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
                  <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-3 md:p-5"><Outlet /></main>
      </div>
      <AIAssistantFab />
      <FloatingProfitWidget />
      <TakeProfitModal />
    </div>
  );
}
