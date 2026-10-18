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
    const isDev = process.env.NODE_ENV !== "production";
    const scriptSrc = isDev
      ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
      : "script-src 'self' 'unsafe-inline'";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; ${scriptSrc}; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://*.googleusercontent.com; font-src 'self' data:; connect-src 'self' https://accounts.google.com https://oauth2.googleapis.com https://api.exa.ai https://api.telegram.org https://api.openai.com https://*.neon.tech https://*.vercel-storage.com https://*.vercel-insights.com; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://accounts.google.com`,
          },
        ],
      },
    ];
  },
};

export default withWorkflow(nextConfig);
