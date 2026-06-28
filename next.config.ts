import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

/**
 * Static export para GitHub Pages servido em /synesthesia.
 * Em dev (NODE_ENV !== "production") o basePath fica vazio para servir em "/".
 */
const nextConfig: NextConfig = {
  output: "export",
  basePath: isProd ? "/synesthesia" : "",
  images: { unoptimized: true },
};

export default nextConfig;
