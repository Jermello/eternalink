import createNextIntlPlugin from "next-intl/plugin";
import type { NextConfig } from "next";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Default is 1MB. Family upload allows 10MB photos, so we leave a bit
      // of headroom for the rest of the form payload.
      bodySizeLimit: "12mb",
    },
  },
};

export default withNextIntl(nextConfig);
