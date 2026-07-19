/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // JSON file store is used for the dev/demo backend; keep it out of the
  // server bundle tracing noise. Swap for Supabase in production (see README).
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
