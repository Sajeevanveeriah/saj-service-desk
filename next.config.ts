import type { NextConfig } from "next";

const isPagesExport = process.env.PAGES_EXPORT === "true";
const pagesBasePath = "/saj-service-desk";

const nextConfig: NextConfig = {
  output: isPagesExport ? "export" : undefined,
  basePath: isPagesExport ? pagesBasePath : undefined,
  assetPrefix: isPagesExport ? pagesBasePath : undefined,
  trailingSlash: isPagesExport,
  images: { unoptimized: isPagesExport },
  typescript: { ignoreBuildErrors: isPagesExport },
  poweredByHeader: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "1mb",
    },
  },
  ...(isPagesExport ? {} : {
    async headers() {
      return [
        {
          source: "/:path*",
          headers: [
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          ],
        },
      ];
    },
  }),
};

export default nextConfig;
