import { createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";

// This project now serves the prebuilt static SPA in /public.
// TanStack Start only provides the HTML shell; the CRA bundle self-mounts to #root
// and handles all routing client-side.

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  shellComponent: RootShell,
  component: () => null,
  notFoundComponent: RootShell,
  errorComponent: RootShell,
});

const HEAD_HTML = `
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no" />
<meta name="theme-color" content="#000000" />
<meta name="description" content="DMT5 - Professional Deriv Trading" />
<link rel="icon" href="/pwa-icon.svg" type="image/svg+xml" />
<link rel="apple-touch-icon" href="/pwa-icon.svg" />
<link rel="manifest" href="/manifest.json" />
<title>DMT5 - Professional Deriv Trading</title>
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="" />
<link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Inter:wght@400;500;600;700&family=Orbitron:wght@400;700;900&display=swap" rel="stylesheet" />
<script src="/client-app-meta.js"></script>
<script src="/deriv-config.js"></script>
<script src="/client-deriv-overrides.js"></script>
<script src="/client-verify-ui.js"></script>
<script src="https://cdn.jsdelivr.net/npm/lightweight-charts@5.1.0/dist/lightweight-charts.standalone.production.js"></script>
<link href="/static/css/main.4fd37b89.css" rel="stylesheet" />
<style>body,html{margin:0;padding:0;background:#000}</style>
`;

const BODY_HTML = `
<noscript>You need to enable JavaScript to run this app.</noscript>
<div id="root"></div>
<script defer src="/static/js/main.a47d2d21.js"></script>
`;

function RootShell() {
  return (
    <html lang="en" className="dark">
      <head dangerouslySetInnerHTML={{ __html: HEAD_HTML }} />
      <body dangerouslySetInnerHTML={{ __html: BODY_HTML }} />
    </html>
  );
}
