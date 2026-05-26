import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  // Forzar el root de Turbopack para evitar confusión con lockfiles
  turbopack: {
    root: __dirname,
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
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: '**.r2.cloudflarestorage.com' },
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