import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  rewrites: async function () {
      return [
        {
          //建议生产环境直接用nginx拦截直接访问pysdk
          source: '/api/pysdk/:path*',
          destination: 'http://' + process.env.NEXT_PUBLIC_PYSDK_HOST + '/api/pysdk/:path*',
        },
      ]
  }
};

export default nextConfig;
