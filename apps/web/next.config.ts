import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@yolla/core", "@yolla/db"],
};

export default nextConfig;
