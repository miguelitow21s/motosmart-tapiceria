import type { NextConfig } from "next";

// 'unsafe-eval' solo hace falta en modo dev (React Refresh); en produccion
// Next 15 no lo necesita. 'unsafe-inline' en script-src se queda por ahora:
// migrar a CSP por nonce requiere tocar el middleware y probarlo en vivo,
// ademas hoy no hay ningun sink de XSS conocido que lo explote (verificado:
// cero dangerouslySetInnerHTML/eval en el repo). Candidato a follow-up.
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  // Ya no se cargan fuentes desde fonts.googleapis.com/fonts.gstatic.com:
  // se autohospedan via next/font (app/layout.tsx) desde el propio origen.
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https://*.supabase.co https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com"
      }
    ],
    formats: ["image/avif", "image/webp"]
  },
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Content-Security-Policy", value: csp },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload"
          }
        ]
      },
      {
        source: "/:all*(svg|jpg|jpeg|png|webp|avif|js|css|woff2)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
      }
    ];
  }
};

export default nextConfig;
