import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Si necesitas omitir errores de tipos para poder trabajar, usa esto: */
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;