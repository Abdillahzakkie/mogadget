/** @type {import('next').NextConfig} */
export default {
  transpilePackages: ["@mogadget/contracts"],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.API_ORIGIN ?? "http://localhost:4000"}/api/:path*`,
      },
    ];
  },
};
