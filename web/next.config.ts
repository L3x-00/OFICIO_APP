import type { NextConfig } from "next";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

const webRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  turbopack: {
    root: webRoot,
  },
  images: {
    remotePatterns: [
      // Cloudflare R2 (storage en producción)
      {
        protocol: "https",
        hostname: "**.r2.cloudflarestorage.com",
      },
      // Render backend (imágenes servidas desde MinIO en producción)
      {
        protocol: "https",
        hostname: "**.onrender.com",
      },
      // MinIO local (desarrollo)
      {
        protocol: "http",
        hostname: "localhost",
        port: "9000",
      },
      {
        protocol: "http",
        hostname: "minio",
        port: "9000",
      },
      // Tu propio dominio en producción
      {
        protocol: "https",
        hostname: "www.oficioapp.org.pe",
      },
    ],
  },
  async redirects() {
    return [
      // La vanity URL pública perdió el prefijo /p/ (ahora /:slug directo).
      // Los enlaces ya compartidos (WhatsApp, redes, Google indexado) siguen
      // funcionando vía este 301.
      {
        source: "/p/:slug",
        destination: "/:slug",
        permanent: true,
      },
    ];
  },
  async headers() {
    // Host del backend (API REST + WebSocket) para el allowlist de connect-src.
    const apiUrl =
      process.env.NEXT_PUBLIC_API_URL || "https://oficio-backend.onrender.com";
    const apiWs = apiUrl.replace(/^https:/, "wss:").replace(/^http:/, "ws:");

    // CSP en modo Report-Only (igual criterio que el panel admin): reporta
    // violaciones sin bloquear, para poder afinar la política antes de
    // aplicarla en modo enforcing. img-src amplio (las imágenes no ejecutan
    // código) cubre R2/CDN/tiles del radar; connect-src acotado al backend.
    const csp = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline'",
      // Next.js inyecta scripts de arranque/hidratación inline → 'unsafe-inline'.
      "script-src 'self' 'unsafe-inline'",
      `connect-src 'self' ${apiUrl} ${apiWs}`,
      "frame-src 'self'",
      "upgrade-insecure-requests",
    ].join("; ");

    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // El sitio solo usa geolocalización (búsqueda por radio). El resto de
          // APIs sensibles quedan denegadas.
          {
            key: "Permissions-Policy",
            value:
              "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), magnetometer=(), gyroscope=(), accelerometer=(), interest-cohort=()",
          },
          // HSTS conservador: 1 año, solo este host (sin includeSubDomains ni
          // preload para no afectar otros subdominios). Los navegadores solo lo
          // honran sobre https; en http/localhost se ignora.
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000",
          },
          { key: "Content-Security-Policy-Report-Only", value: csp },
        ],
      },
    ];
  },
};

export default nextConfig;
