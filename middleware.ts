import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

function generateCsrfToken() {
  return crypto.randomUUID().replace(/-/g, "");
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const csrfToken = request.cookies.get("csrf-token")?.value;
  if (!csrfToken) {
    response.cookies.set("csrf-token", generateCsrfToken(), {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/"
    });
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            request.cookies.set(name, value);
            response.cookies.set(name, value, options);
          });
        }
      }
    }
  );

  if (request.nextUrl.pathname.startsWith("/admin")) {
    const {
      data: { user }
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL("/login", request.url));
    }

    const role = (user.user_metadata.role as string | undefined) ?? "customer";
    if (role !== "admin" && role !== "editor") {
      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  response.headers.set("x-request-id", crypto.randomUUID());
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/api/:path*"]
};
