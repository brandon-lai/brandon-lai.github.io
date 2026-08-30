/** @type {import('next').NextConfig} */
const nextConfig = {
  // GitHub Pages serves static files; the Actions workflow uploads ./out
  output: "export",
  images: { unoptimized: true },
  transpilePackages: ["three"],
};

export default nextConfig;
