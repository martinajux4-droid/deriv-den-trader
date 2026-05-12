import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useDeriv } from "@/hooks/use-deriv";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/deriv/callback")({
  component: Callback,
});

function Callback() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const { reload } = useDeriv();
  const [msg, setMsg] = useState("Linking your Deriv account…");

  useEffect(() => {
    if (loading) return;
    if (!user) { navigate({ to: "/login" }); return; }

    (async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const accounts: { loginid: string; token: string; currency: string | null }[] = [];
        let i = 1;
        while (params.get(`acct${i}`) && params.get(`token${i}`)) {
          accounts.push({
            loginid: params.get(`acct${i}`)!,
            token: params.get(`token${i}`)!,
            currency: params.get(`cur${i}`),
          });
          i++;
        }
        if (!accounts.length) throw new Error("No Deriv accounts returned");

        // Upsert each account (loginid starts with VR for virtual)
        for (const a of accounts) {
          const is_virtual = a.loginid.startsWith("VR");
          const { error } = await supabase
            .from("deriv_accounts")
            .upsert({
              user_id: user.id,
              loginid: a.loginid,
              token: a.token,
              currency: a.currency,
              is_virtual,
              is_active: false,
            }, { onConflict: "user_id,loginid" });
          if (error) throw error;
        }

        // Mark first one (prefer virtual) active if none active
        const { data: existing } = await supabase
          .from("deriv_accounts").select("*").eq("user_id", user.id);
        const anyActive = existing?.some((a: any) => a.is_active);
        if (!anyActive && existing?.length) {
          const choice = existing.find((a: any) => a.is_virtual) || existing[0];
          await supabase.from("deriv_accounts").update({ is_active: true }).eq("id", choice.id);
        }

        await reload();
        toast.success(`Linked ${accounts.length} Deriv account${accounts.length > 1 ? "s" : ""}`);
        navigate({ to: "/dashboard" });
      } catch (e: any) {
        setMsg(e.message || "Failed to link Deriv account");
        toast.error(e.message || "Link failed");
      }
    })();
  }, [user, loading]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <div className="text-sm text-muted-foreground">{msg}</div>
    </div>
  );
}
