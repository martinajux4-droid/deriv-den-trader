import { useState } from "react";
import { useDeriv } from "@/hooks/use-deriv";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { CONTRACT_TYPES } from "@/lib/deriv-symbols";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

const NEEDS_BARRIER = ["DIGITOVER", "DIGITUNDER", "DIGITMATCH", "DIGITDIFF"];

export function TradePanel({ symbol }: { symbol: string }) {
  const { user } = useAuth();
  const { client, active, balance } = useDeriv();
  const [contract, setContract] = useState<string>("CALL");
  const [stake, setStake] = useState<string>("1");
  const [duration, setDuration] = useState<string>("5");
  const [unit, setUnit] = useState<string>("t");
  const [barrier, setBarrier] = useState<string>("5");
  const [busy, setBusy] = useState(false);

  const placeTrade = async () => {
    if (!client || !active || !user) { toast.error("Connect a Deriv account first"); return; }
    setBusy(true);
    try {
      const proposal = await client.getProposal({
        contract_type: contract,
        symbol,
        amount: Number(stake),
        duration: Number(duration),
        duration_unit: unit,
        currency: balance?.currency || "USD",
        ...(NEEDS_BARRIER.includes(contract) ? { barrier } : {}),
      });
      const buy = await client.buyContract(proposal.id, proposal.ask_price);
      toast.success(`Trade placed · contract ${buy.contract_id}`);

      const { data: trade } = await supabase.from("trades").insert({
        user_id: user.id,
        contract_id: String(buy.contract_id),
        symbol,
        contract_type: contract,
        stake: Number(stake),
        payout: buy.payout,
        duration: Number(duration),
        duration_unit: unit,
        is_virtual: active.is_virtual,
        loginid: active.loginid,
        status: "open",
      }).select().single();

      // Wait for it to settle
      client.waitForContract(buy.contract_id).then(async (settled) => {
        const profit = Number(settled.profit ?? 0);
        toast[profit >= 0 ? "success" : "error"](`Settled · ${profit >= 0 ? "+" : ""}${profit.toFixed(2)} ${balance?.currency || ""}`);
        if (trade) {
          await supabase.from("trades").update({
            profit, payout: settled.payout,
            entry_spot: settled.entry_spot, exit_spot: settled.exit_spot,
            status: profit > 0 ? "won" : profit < 0 ? "lost" : "even",
            closed_at: new Date().toISOString(),
            raw: settled,
          }).eq("id", trade.id);
        }
      }).catch((e) => console.error("settle err", e));
    } catch (e: any) {
      toast.error(e.message || e.error?.message || "Trade failed");
    } finally {
      setBusy(false);
    }
  };

  const ct = CONTRACT_TYPES.find((c) => c.id === contract)!;

  return (
    <Card className="p-5">
      <h3 className="text-sm font-medium text-muted-foreground">Place trade</h3>
      <div className="mt-4 space-y-3">
        <div>
          <Label>Contract</Label>
          <Select value={contract} onValueChange={setContract}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {CONTRACT_TYPES.map((c) => (
                <SelectItem key={c.id} value={c.id}>{c.name} <span className="ml-1 text-xs text-muted-foreground">({c.group})</span></SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Stake</Label>
            <Input className="num" type="number" step="0.5" min="0.35" value={stake} onChange={(e) => setStake(e.target.value)} />
          </div>
          {NEEDS_BARRIER.includes(contract) && (
            <div>
              <Label>Digit (0-9)</Label>
              <Input className="num" type="number" min="0" max="9" value={barrier} onChange={(e) => setBarrier(e.target.value)} />
            </div>
          )}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>Duration</Label>
            <Input className="num" type="number" min="1" value={duration} onChange={(e) => setDuration(e.target.value)} />
          </div>
          <div>
            <Label>Unit</Label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="t">Ticks</SelectItem>
                <SelectItem value="s">Seconds</SelectItem>
                <SelectItem value="m">Minutes</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Button onClick={placeTrade} disabled={busy || !active} className="mt-2 w-full" size="lg">
          {busy ? "Placing…" : `Buy ${ct.name}`}
        </Button>
        {!active && <p className="text-xs text-bear">Connect a Deriv account on the Dashboard first.</p>}
      </div>
    </Card>
  );
}
