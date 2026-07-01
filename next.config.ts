import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // A stray package-lock.json in the parent (home) dir makes Next infer the wrong
  // workspace root. Pin it to this project directory.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
