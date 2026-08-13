import type { NextConfig } from "next";

// Ensure NEXTAUTH_URL is always a valid URL during Vercel builds
if (!process.env.NEXTAUTH_URL || process.env.NEXTAUTH_URL.trim() === '') {
  process.env.NEXTAUTH_URL = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000';
}

const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
