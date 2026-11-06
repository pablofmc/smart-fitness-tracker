import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is curated by hand; next dev would otherwise add its own block to it.
  agentRules: false,
  // Routine PDFs go through a Server Action (#50). Vercel caps a request at 4.5 MB, so the form stops at 4 MB.
  experimental: { serverActions: { bodySizeLimit: "4.5mb" } },
  // The service worker must always be fetched fresh, or a new version could take days to arrive.
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }] }];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
