import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable standalone output for Docker deployment
  output: "standalone",
  
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
