import type { NextConfig } from "next";
import path from "node:path";

// Ensure Turbopack (and env loading) uses the directory you run `next dev` from.
// This avoids accidental root inference from unrelated lockfiles elsewhere.
const turbopackRoot = path.resolve(process.cwd());

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",

  // Fix incorrect workspace root inference when multiple lockfiles exist.
  turbopack: {
    root: turbopackRoot,
  },
  
  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  
  // Image configuration
  // SECURITY: Disable remote image optimization to prevent SSRF attacks.
  // The wildcard "**" hostname pattern would allow /_next/image to fetch
  // from any external URL, enabling:
  // - Internal network probing from the server's trusted position
  // - Resource exhaustion via large image processing
  // - Potential data exfiltration through image requests
  // 
  // If you need remote image optimization, explicitly allowlist only
  // the specific domains you trust (e.g., your CDN, avatar providers).
  images: {
    // Disable remote image optimization entirely - use local images only
    // To enable specific remote sources, replace with explicit allowlist:
    // remotePatterns: [
    //   { protocol: "https", hostname: "your-cdn.example.com" },
    //   { protocol: "https", hostname: "avatars.githubusercontent.com" },
    // ],
    unoptimized: false, // Still optimize local images
    remotePatterns: [], // No remote sources allowed
  },
};

export default nextConfig;
