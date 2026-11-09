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
const nextConfig: NextConfig = {
  ...(process.env.NEXT_OUTPUT_STANDALONE === "1"
    ? { output: "standalone" as const }
    : {}),
};

export default nextConfig;
