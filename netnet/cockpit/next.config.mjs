/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow builds to complete in production even if ESLint reports issues.
  // This prevents the build from failing due to dev-only lint rules.
  eslint: { ignoreDuringBuilds: true },
  reactStrictMode: true,
};
export default nextConfig;
