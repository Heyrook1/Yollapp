import type { NextConfig } from "next";

/**
 * Güvenlik başlıkları (CLAUDE.md §6).
 *
 * CSP notu: Next.js App Router inline script kullandığı için script-src'te
 * 'unsafe-inline' gerekiyor. Nonce tabanlı CSP middleware'de nonce üretimi
 * ister; pilot sonrası iş olarak docs/SECURITY-REVIEW.md'de kayıtlı.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Konum kurye akışında, kamera teslimat kanıtında gerekebilir.
    value: "camera=(self), microphone=(), geolocation=(self), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      // Supabase auth/REST/realtime çağrıları.
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "object-src 'none'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@yolla/core", "@yolla/db"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
