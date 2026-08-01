import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // The floating dev badge sits over the hero artwork while the layout is being
  // matched against Figma.
  devIndicators: false,
};

export default nextConfig;
