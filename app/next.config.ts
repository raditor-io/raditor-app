import type { NextConfig } from "next";

/**
 * The platform app is fully dynamic (auth, API, webhooks, worker endpoints);
 * no static export. Worker endpoints under /api/jobs declare their own long
 * maxDuration for Vercel fluid compute.
 */
const nextConfig: NextConfig = {};

export default nextConfig;
