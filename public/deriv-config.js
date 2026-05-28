// =============================================================
//  DERIV API CONFIGURATION — edit values marked with ← below
//  Client distribution builds: client-deriv-overrides.js sets an object from clients/*.json;
//  trading.js then ignores the constants below for OAuth/WS (no fallback). Original/dev builds
//  use __CLIENT_DIST_DERIV_OVERRIDES__ = null so these values apply.
// =============================================================

// OAuth2 client_id from https://developers.deriv.com (your new API app)
// Set to null to disable new-API login on this host.
const DERIV_CLIENT_ID = '32TJp4qCYy5pUCnglJnFO';

// Old Deriv API (v3) numeric app_id.
// Used for: old OAuth login URL, old WebSocket URL, and legacy user routing.
// Set to null on any host where only the new API is used.
const DERIV_OLD_APP_ID = (function() {
    const host = window.location.hostname;
    if (host === 'mydmt5.com')            return '121869';
    if (host === 'dmt5trader.web.app')    return '118191';
    return null; // local dev — no old-API credentials configured
})();

// DERIV_LEGACY_APP_ID is kept as an alias so existing routing logic still works.
const DERIV_LEGACY_APP_ID = DERIV_OLD_APP_ID;

// Your deployed Vercel backend URL (no trailing slash).
const DERIV_BACKEND_URL = 'https://deriv-backend-murex.vercel.app';

// Callback URL — Deriv OAuth redirect_uri must use /verify.html (registered in Deriv dashboard).
const DERIV_REDIRECT_URI = window.location.origin + '/verify.html';

// =============================================================
// NOTE: DERIV_APP_ID for REST headers lives on the server side
// in vercel-backend/api/_registry.js — no longer needed here.
// =============================================================

// Expose for the Webpack-bundled `src/trading/trading.js` module (same values as `const` above).
globalThis.DERIV_CLIENT_ID = DERIV_CLIENT_ID;
globalThis.DERIV_OLD_APP_ID = DERIV_OLD_APP_ID;
globalThis.DERIV_LEGACY_APP_ID = DERIV_LEGACY_APP_ID;
globalThis.DERIV_BACKEND_URL = DERIV_BACKEND_URL;
globalThis.DERIV_REDIRECT_URI = DERIV_REDIRECT_URI;
