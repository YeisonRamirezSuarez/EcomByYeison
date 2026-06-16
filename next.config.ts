import type { NextConfig } from "next";

// Static security headers applied to every response. The Content-Security-Policy
// is NOT here — it needs a per-request nonce (for the inline theme-boot script
// in app/layout.tsx and for Clerk), so it's built in proxy.ts (middleware).
const securityHeaders = [
  // Don't let browsers MIME-sniff responses away from the declared content-type.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow the site being framed by third parties (clickjacking). Sanity Studio
  // lives at /studio on the same origin, so SAMEORIGIN keeps it working.
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  // Force HTTPS for 2 years incl. subdomains. Ignored on http/localhost, so safe
  // in dev. `preload` is intentionally omitted to avoid a hard preload-list commit.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  // Send only the origin to cross-origin destinations; full URL same-origin.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Lock down powerful features the storefront never uses.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.sanity.io",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
