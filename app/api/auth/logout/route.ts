import { NextResponse } from "next/server";
import { assertCsrf } from "@/lib/security";
import { createRouteHandlerSupabaseClient } from "@/lib/supabase/route-handler";

export async function POST(request: Request) {
  try {
    assertCsrf(request);
  } catch {
    return NextResponse.json({ error: "CSRF invalido" }, { status: 403 });
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createRouteHandlerSupabaseClient(request, response);

  await supabase.auth.signOut();
  return response;
}
