import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Produces a self-contained build under .next/standalone — only the files
  // needed to run the server are copied, keeping the image small.
  output: "standalone",
};

export default nextConfig;
