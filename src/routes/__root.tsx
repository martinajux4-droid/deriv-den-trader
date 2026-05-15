import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/hooks/use-auth";
import { DerivProvider } from "@/hooks/use-deriv";
import { Toaster } from "@/components/ui/sonner";
import { HifexBoot } from "@/components/HifexBoot";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold">404</h1>
        <p className="mt-2 text-sm text-muted-foreground">This page doesn't exist.</p>
        <Link to="/" className="mt-6 inline-flex rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Go home</Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  const router = useRouter();
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <button
          onClick={() => { router.invalidate(); reset(); }}
          className="mt-6 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
        >Try again</button>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Hifex Trader AI — AI-Powered Automated Trading" },
      { name: "description", content: "Hifex Trader AI: institutional-grade automated trading on Deriv synthetic indices. AI signals, risk management, real-time execution." },
      { property: "og:title", content: "Hifex Trader AI — AI-Powered Automated Trading" },
      { name: "twitter:title", content: "Hifex Trader AI — AI-Powered Automated Trading" },
      { property: "og:description", content: "AI-powered automated trading platform. Connect Deriv, deploy bots, track live profits with bank-grade risk control." },
      { name: "twitter:description", content: "AI-powered automated trading platform. Connect Deriv, deploy bots, track live profits with bank-grade risk control." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4e74410a-939e-45c6-bb51-84e3a8166701/id-preview-f9bccd63--8663f2df-d6a1-45db-bb8e-994d1e3995ef.lovable.app-1778587001923.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/4e74410a-939e-45c6-bb51-84e3a8166701/id-preview-f9bccd63--8663f2df-d6a1-45db-bb8e-994d1e3995ef.lovable.app-1778587001923.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <DerivProvider>
          <HifexBoot />
          <Outlet />
          <Toaster richColors theme="dark" />
        </DerivProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
