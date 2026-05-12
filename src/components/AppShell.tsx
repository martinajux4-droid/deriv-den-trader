import { Link, Outlet, useLocation, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, LineChart, Bot, History, Settings, LogOut, Wifi, WifiOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/trade", label: "Trade", icon: LineChart },
  { to: "/bot", label: "Bot", icon: Bot },
  { to: "/history", label: "History", icon: History },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function AppShell() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { accounts, active, setActive, balance, status, appId } = useDeriv();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-sidebar-border bg-sidebar p-4 md:flex">
        <Link to="/dashboard" className="flex items-center gap-2 px-2 py-1">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary text-primary-foreground font-bold">D</div>
          <span className="font-semibold tracking-tight">DerivFlow</span>
        </Link>
        <nav className="mt-6 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => {
            const active = pathname.startsWith(to);
            return (
              <Link key={to} to={to}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
                  active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                }`}>
                <Icon className="h-4 w-4" />{label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto">
          <Button variant="ghost" className="w-full justify-start" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
            <LogOut className="mr-2 h-4 w-4" /> Sign out
          </Button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-card/40 px-4 py-3 backdrop-blur">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            {status === "open" ? <Wifi className="h-3.5 w-3.5 bull" /> : <WifiOff className="h-3.5 w-3.5 bear" />}
            <span>{status === "open" ? "Connected" : status}</span>
            <span className="opacity-50">· app_id {appId}</span>
          </div>
          <div className="flex items-center gap-3">
            {accounts.length > 0 ? (
              <>
                <Select value={active?.id} onValueChange={(id) => {
                  const a = accounts.find((x) => x.id === id); if (a) setActive(a);
                }}>
                  <SelectTrigger className="w-[220px]"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.loginid} {a.is_virtual ? "(Demo)" : "(Real)"} {a.currency ? `· ${a.currency}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {balance && (
                  <Badge variant="secondary" className="num text-sm">
                    {balance.balance.toFixed(2)} {balance.currency}
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant="outline">No Deriv account linked</Badge>
            )}
          </div>
        </header>

        {/* Mobile nav */}
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-sidebar/40 px-2 py-2 md:hidden">
          {NAV.map(({ to, label, icon: Icon }) => {
            const isActive = pathname.startsWith(to);
            return (
              <Link key={to} to={to}
                className={`flex shrink-0 items-center gap-1 rounded-md px-3 py-1.5 text-xs ${
                  isActive ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground"
                }`}>
                <Icon className="h-3.5 w-3.5" />{label}
              </Link>
            );
          })}
        </nav>

        <main className="min-w-0 flex-1 p-4 md:p-6"><Outlet /></main>
      </div>
    </div>
  );
}
