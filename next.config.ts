import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB. Family upload allows 10MB photos, so we leave a bit
      // of headroom for the rest of the form payload.
      bodySizeLimit: "12mb",
    },
  },
};

export default nextConfig;
