/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: "export", // Outputs a Single-Page Application (SPA).
  // distDir: "./dist", // Changes the build output directory to `./dist/`.
  basePath: process.env.NEXT_PUBLIC_BASE_PATH, // Sets the base path to `/some-base-path`.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'gateway.irys.xyz',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
