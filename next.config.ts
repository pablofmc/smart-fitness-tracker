import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // AGENTS.md is curated by hand; next dev would otherwise add its own block to it.
  agentRules: false,
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
