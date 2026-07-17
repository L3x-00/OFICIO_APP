import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const cspReportOnly = [
  "default-src 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://va.vercel-scripts.com",
  "connect-src 'self' https://api.oficioapp.org.pe https://oficio-backend.onrender.com https://*.sentry.io wss:",
  "frame-src 'self' https:",
].join("; ");

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Forzar el root de Turbopack para evitar confusión con lockfiles
  turbopack: {
    root: __dirname,
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Content-Security-Policy-Report-Only", value: cspReportOnly },
        ],
      },
    ];
  },
  // Hosts permitidos para `next/image`. Sin esta lista, cualquier
  // `<Image src="…">` con URL remota tira el error
  // "hostname is not configured under images in your next.config.js".
  //
  //   • localhost                  → MinIO local en dev (puerto 9000).
  //   • *.r2.cloudflarestorage.com → bucket Cloudflare R2 (prod actual,
  //                                  ver MINIO_ENDPOINT en backend/.env).
  //
  // Si configurás `MINIO_PUBLIC_URL` con un dominio custom (ej.
  // cdn.servi.app), sumalo a este array.
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "**.r2.cloudflarestorage.com" },
    ],
  },
};

export default withSentryConfig(nextConfig, {
  silent: true,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Elimina hideSourceMaps y disableLogger (obsoletos)
  sourcemaps: {
    disable: true,
  },
});
