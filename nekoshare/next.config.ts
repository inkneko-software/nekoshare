import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async function () {
      return [
        {
          source: '/api/pysdk/:path*',
          destination: process.env.PYSDK_HOST + '/api/pysdk/:path*',
        },
      ]
  }
};

export default nextConfig;
