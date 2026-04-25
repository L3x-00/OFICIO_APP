import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default withSentryConfig(nextConfig, {
  // DSN se lee de SENTRY_DSN en el entorno de build/runtime
  silent: true,
  // Subir source maps solo en CI (cuando SENTRY_AUTH_TOKEN esté configurado)
  authToken: process.env.SENTRY_AUTH_TOKEN,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // No fallar el build si Sentry no está configurado
  hideSourceMaps: true,
  disableLogger: true,
});