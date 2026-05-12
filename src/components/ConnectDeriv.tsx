import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDeriv } from "@/hooks/use-deriv";
import { ExternalLink } from "lucide-react";

export function ConnectDeriv() {
  const { appId } = useDeriv();
  const redirect = typeof window !== "undefined" ? `${window.location.origin}/auth/deriv/callback` : "";
  const url = `https://oauth.deriv.com/oauth2/authorize?app_id=${appId}&l=EN&brand=deriv&redirect_uri=${encodeURIComponent(redirect)}`;
  return (
    <Card className="p-6">
      <h2 className="text-lg font-semibold">Connect your Deriv account</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        You'll be sent to Deriv to authorize. Tokens are saved securely against your account.
        Default uses Deriv's public test app id <span className="num">{appId}</span>; you can change it in Settings.
      </p>
      <a href={url}>
        <Button className="mt-4">Connect Deriv <ExternalLink className="ml-1 h-4 w-4" /></Button>
      </a>
      <p className="mt-3 text-xs text-muted-foreground">
        Tip: To use your own app, register at api.deriv.com/dashboard and set the redirect URL to <span className="num">{redirect}</span>.
      </p>
    </Card>
  );
}
