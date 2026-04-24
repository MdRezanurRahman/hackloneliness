import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // cacheComponents is an opt-in Next 16 caching model where every dynamic
  // access must be wrapped in <Suspense> or 'use cache'. Overkill for an
  // auth-gated MVP — keeping the simpler per-request dynamic rendering for now.
  // cacheComponents: true,
};

export default nextConfig;
