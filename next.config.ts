import type { NextConfig } from "next";

// Two supported ways to run the production build:
//
// 1. VPS / PM2 (default): `npm run build` then `npm run start` (= `next start`).
//    `next start` does NOT support `output: "standalone"` (Next logs a warning
//    and the standalone bundle goes unused), so the default build is a normal
//    `.next` build.
//
// 2. Docker: the Dockerfile sets NEXT_OUTPUT_STANDALONE=1 at build time to
//    produce `.next/standalone`, which it runs with `node server.js`.

const isDev = process.env.NODE_ENV !== "production";

/** Origin of the backend API when it is not same-origin (dev / docker). */
function apiOrigin(): string {
  try {
    return process.env.NEXT_PUBLIC_API_BASE_URL
      ? new URL(process.env.NEXT_PUBLIC_API_BASE_URL).origin
      : "";
  } catch {
    return "";
  }
}

// Content-Security-Policy. The access/refresh tokens live in localStorage, so
// the main defence against token theft is "no foreign script can run":
// scripts only from this origin, no plugins, no framing, connections only to
// our API and the Binance market-data hosts used by the live chart.
// 'unsafe-inline' for scripts is required by Next's inline bootstrap without
// nonces (see node_modules/next/dist/docs/01-app/02-guides/content-security-policy.md).
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' blob: data: https:",
  "font-src 'self' data:",
  [
    "connect-src 'self'",
    apiOrigin(),
    "https://fapi.binance.com wss://fstream.binance.com",
    "https://api.binance.com https://data-api.binance.vision wss://data-stream.binance.vision",
    isDev ? "ws: http://localhost:* http://127.0.0.1:*" : "",
  ]
    .filter(Boolean)
    .join(" "),
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // No upgrade-insecure-requests: it would break plain-http deployments
  // (docker-compose on localhost). Production is HTTPS via nginx anyway.
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
  },
];

// Old URLs → new pages (docs/riset-2026-11-12/02-audit-ux.md §3.4).
// 307 (permanent: false) for the first 2 weeks so a rollback is easy; switch
// to 308 afterwards. Next passes the request's query string through and merges
// it with the destination's own query (`/screener?symbol=ETH` →
// `/koin?view=faktor&symbol=ETH`). Redirects run before the filesystem, so the
// old pages may stay in the tree until their owners delete them.
// `/` → `/beranda` lives in app/page.tsx; the post-login default in
// lib/utils/safe-url.ts.
export const LEGACY_REDIRECTS = [
  { source: "/screener", destination: "/koin?view=faktor", permanent: false },
  { source: "/lab/outlook", destination: "/koin", permanent: false },
  { source: "/lab/strength", destination: "/koin?view=terkuat", permanent: false },
  { source: "/lab/live-check", destination: "/bot", permanent: false },
] as const;

const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1"
    ? { output: "standalone" as const }
    : {}),
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  async redirects() {
    return LEGACY_REDIRECTS.map((r) => ({ ...r }));
  },
};

export default nextConfig;
