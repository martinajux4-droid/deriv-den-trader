import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { DerivClient } from "@/lib/deriv-ws";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./use-auth";

export type DerivAccount = {
  id: string;
  loginid: string;
  currency: string | null;
  is_virtual: boolean;
  token: string;
  is_active: boolean;
};

type Profile = {
  id: string;
  display_name: string | null;
  default_stake: number;
  default_symbol: string;
  deriv_app_id: string;
};

type DerivCtx = {
  client: DerivClient | null;
  status: string;
  accounts: DerivAccount[];
  active: DerivAccount | null;
  balance: { balance: number; currency: string } | null;
  profile: Profile | null;
  appId: string;
  reload: () => Promise<void>;
  setActive: (acc: DerivAccount) => Promise<void>;
};

const DEFAULT_APP_ID = "68610";

const Ctx = createContext<DerivCtx>({
  client: null, status: "idle", accounts: [], active: null, balance: null,
  profile: null, appId: DEFAULT_APP_ID, reload: async () => {}, setActive: async () => {},
});

export function DerivProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [accounts, setAccounts] = useState<DerivAccount[]>([]);
  const [active, setActiveState] = useState<DerivAccount | null>(null);
  const [status, setStatus] = useState("idle");
  const [balance, setBalance] = useState<{ balance: number; currency: string } | null>(null);
  const clientRef = useRef<DerivClient | null>(null);
  const balanceUnsubRef = useRef<null | (() => void)>(null);

  const appId = profile?.deriv_app_id || DEFAULT_APP_ID;

  // build/replace client when appId changes
  useEffect(() => {
    if (clientRef.current) clientRef.current.close();
    const c = new DerivClient(appId);
    clientRef.current = c;
    const off = c.onStatus(setStatus);
    c.connect().catch(() => {});
    return () => { off(); c.close(); clientRef.current = null; };
  }, [appId]);

  const reload = async () => {
    if (!user) return;
    const [{ data: prof }, { data: accs }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
      supabase.from("deriv_accounts").select("*").eq("user_id", user.id).order("created_at"),
    ]);
    if (prof) setProfile(prof as Profile);
    if (accs) {
      setAccounts(accs as DerivAccount[]);
      const act = (accs as DerivAccount[]).find((a) => a.is_active) || (accs as DerivAccount[])[0] || null;
      setActiveState(act);
    }
  };

  useEffect(() => { reload(); }, [user?.id]);

  // when active account changes, authorize and subscribe to balance
  useEffect(() => {
    const c = clientRef.current;
    if (!c || !active) return;
    let cancelled = false;
    (async () => {
      try {
        c.setToken(active.token);
        await c.connect();
        await c.authorize(active.token);
        if (cancelled) return;
        balanceUnsubRef.current?.();
        balanceUnsubRef.current = await c.subscribeBalance((b) => {
          setBalance({ balance: b.balance, currency: b.currency });
        });
      } catch (e) {
        console.error("[deriv] authorize failed", e);
      }
    })();
    return () => {
      cancelled = true;
      balanceUnsubRef.current?.();
      balanceUnsubRef.current = null;
    };
  }, [active?.id, status === "open"]);

  const setActive = async (acc: DerivAccount) => {
    if (!user) return;
    await supabase.from("deriv_accounts").update({ is_active: false }).eq("user_id", user.id);
    await supabase.from("deriv_accounts").update({ is_active: true }).eq("id", acc.id);
    await reload();
  };

  const value = useMemo(
    () => ({ client: clientRef.current, status, accounts, active, balance, profile, appId, reload, setActive }),
    [status, accounts, active, balance, profile, appId]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useDeriv = () => useContext(Ctx);
