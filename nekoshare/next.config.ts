import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async function () {
      return [
        {
          source: '/api/pysdk/:path*',
          destination: "http://" + process.env.NEXT_PUBLIC_PYSDK_HOST + '/api/pysdk/:path*',
        },
      ]
  }
};

export default nextConfig;
