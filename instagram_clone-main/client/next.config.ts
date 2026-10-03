import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  env: {
    BACKEND_URL: process.env.BACKEND_URL,
    IMGBB_API_KEY: process.env.IMGBB_API_KEY
  }
};

export default nextConfig;
