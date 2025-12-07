/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable static export
  output: 'export',
  // Disable image optimization for static export
  images: {
    unoptimized: true
  },
  // Ensure trailing slashes for static hosting
  trailingSlash: true,
  // Disable server-side features for static export
  distDir: 'out'
};

module.exports = nextConfig;

//updated dec25
