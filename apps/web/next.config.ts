import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Güvenlik başlıkları (CLAUDE.md §6).
 *
 * CSP notu: Next.js App Router inline script kullandığı için script-src'te
 * 'unsafe-inline' gerekiyor. Nonce tabanlı CSP middleware'de nonce üretimi
 * ister; pilot sonrası iş olarak docs/SECURITY-REVIEW.md'de kayıtlı.
 *
 * Dev-only: React Refresh / webpack eval için 'unsafe-eval' ve HMR websocket
 * connect-src. Production CSP'de eval YOK.
 */
function buildCsp(): string {
  const scriptSrc = isDev
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

  const connectSrc = isDev
    ? "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://maps.googleapis.com ws: wss: http://localhost:* http://127.0.0.1:*"
    : "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.googleapis.com https://maps.googleapis.com";

  return [
    "default-src 'self'",
    `${scriptSrc} https://maps.googleapis.com https://maps.gstatic.com`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "img-src 'self' data: blob: https: https://*.googleapis.com https://*.gstatic.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    connectSrc,
    "worker-src 'self' blob:",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Konum kurye akışında, kamera teslimat kanıtında gerekebilir.
    value: "camera=(self), microphone=(), geolocation=(self), payment=()",
  },
  // HSTS yalnızca production — localhost HTTP'te tarayıcıyı HTTPS'e kilitleyip
  // girişi bozabilir.
  ...(isDev
    ? []
    : [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]),
  {
    key: "Content-Security-Policy",
    value: buildCsp(),
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
