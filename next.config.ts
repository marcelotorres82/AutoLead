import type { NextConfig } from "next";
import { withWorkflow } from "workflow/next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  experimental: { serverActions: { bodySizeLimit: "1mb" } },
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/\\.well-known/workflow/v1/flow",
          destination: "/api/workflow-runtime/flow",
        },
        {
          source: "/\\.well-known/workflow/v1/step",
          destination: "/api/workflow-runtime/step",
        },
        {
          source: "/\\.well-known/workflow/v1/webhook/:token",
          destination: "/api/workflow-runtime/webhook/:token",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' https://api.exa.ai https://api.telegram.org https://api.openai.com https://*.neon.tech https://*.vercel-storage.com https://*.vercel-insights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
};

export default withWorkflow(nextConfig);
