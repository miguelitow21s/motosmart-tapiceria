import type { NextConfig } from "next";

// 'unsafe-eval' solo hace falta en modo dev (React Refresh); en produccion
// Next 15 no lo necesita. 'unsafe-inline' en script-src se queda por ahora:
// migrar a CSP por nonce requiere tocar el middleware y probarlo en vivo,
// ademas hoy no hay ningun sink de XSS conocido que lo explote (verificado:
// cero dangerouslySetInnerHTML/eval en el repo). Candidato a follow-up.
const csp = [
  "default-src 'self'",
  // Vercel inyecta este script oficial para su Toolbar/Feedback. Se permite
  // exclusivamente ese origen, sin convertir la directiva en un comodin.
  `script-src 'self' 'unsafe-inline' https://vercel.live${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  // Ya no se cargan fuentes desde fonts.googleapis.com/fonts.gstatic.com:
  // se autohospedan via next/font (app/layout.tsx) desde el propio origen.
  "style-src 'self' 'unsafe-inline' https://vercel.live",
  "font-src 'self' data: https://vercel.live https://assets.vercel.com",
  "img-src 'self' data: blob: https://*.supabase.co https:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://vercel.live wss://ws-us3.pusher.com",
  "frame-src 'self' https://vercel.live",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'"
].join("; ");

const nextConfig: NextConfig = {
  images: {
    // Las fotos se guardan con nombre UUID y no se reescriben (upsert: false):
    // una variante optimizada vale 31 días, no 1 hora como dice Storage.
    minimumCacheTTL: 2678400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co"
      }
      // Sin images.unsplash.com: las fotos de stock del seed ya no se muestran
      // en la tienda (lib/photos.ts) y nada más las pide a next/image.
    ],
    formats: ["image/avif", "image/webp"]
  },
  reactStrictMode: true,
  // El personalizador ya no existe: una redirección permanente de verdad (308)
  // en vez de una página que respondía 200 con el título del inicio.
  async redirects() {
    return [{ source: "/personalizador", destination: "/catalogo", permanent: true }];
  },
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
