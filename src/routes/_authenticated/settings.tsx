import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DERIV_SYMBOLS } from "@/lib/deriv-symbols";
import { toast } from "sonner";
import { ConnectDeriv } from "@/components/ConnectDeriv";
import { Trash2 } from "lucide-react";
import { SoundSettingsCard } from "@/components/SoundSettings";

export const Route = createFileRoute("/_authenticated/settings")({ component: Settings });

function Settings() {
  const { user } = useAuth();
  const { profile, accounts, reload } = useDeriv();
  const [displayName, setDisplayName] = useState("");
  const [appId, setAppId] = useState("68610");
  const [stake, setStake] = useState("1");
  const [symbol, setSymbol] = useState("R_100");

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || "");
      setAppId(profile.deriv_app_id);
      setStake(String(profile.default_stake));
      setSymbol(profile.default_symbol);
    }
  }, [profile?.id]);

  const save = async () => {
    if (!user) return;
    const { error } = await supabase.from("profiles").update({
      display_name: displayName,
      deriv_app_id: appId,
      default_stake: Number(stake),
      default_symbol: symbol,
    }).eq("id", user.id);
    if (error) toast.error(error.message); else { toast.success("Saved"); reload(); }
  };

  const removeAccount = async (id: string) => {
    await supabase.from("deriv_accounts").delete().eq("id", id);
    await reload();
    toast.success("Account removed");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <Card className="space-y-3 p-5">
        <h2 className="font-medium">Profile</h2>
        <div><Label>Display name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} /></div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div><Label>Deriv app_id</Label><Input className="num" value={appId} onChange={(e) => setAppId(e.target.value)} /></div>
          <div><Label>Default stake</Label><Input className="num" value={stake} onChange={(e) => setStake(e.target.value)} /></div>
          <div>
            <Label>Default symbol</Label>
            <Select value={symbol} onValueChange={setSymbol}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {DERIV_SYMBOLS.map((s) => <SelectItem key={s.symbol} value={s.symbol}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={save}>Save</Button>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="font-medium">Linked Deriv accounts</h2>
        {accounts.length === 0 ? <ConnectDeriv /> : (
          <ul className="divide-y divide-border">
            {accounts.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <div className="text-sm">
                  <div className="font-medium">{a.loginid} {a.is_virtual ? "(Demo)" : "(Real)"} {a.is_active && <span className="ml-2 text-xs bull">active</span>}</div>
                  <div className="text-xs text-muted-foreground">{a.currency}</div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => removeAccount(a.id)}><Trash2 className="h-4 w-4" /></Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <SoundSettingsCard />
    </div>
  );
}
