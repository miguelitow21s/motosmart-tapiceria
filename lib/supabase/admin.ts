import { createClient } from "@supabase/supabase-js";

type JwtPayload = {
  role?: string;
};

function parseJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const normalized = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const json = Buffer.from(padded, "base64").toString("utf8");
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !anonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  if (!serviceRoleKey) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY in deployment environment");
  }

  if (serviceRoleKey === anonKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is set to ANON key. Use the real service_role key from Supabase Project Settings > API");
  }

  const payload = parseJwtPayload(serviceRoleKey);
  if (payload?.role && payload.role !== "service_role") {
    throw new Error(`Invalid SUPABASE_SERVICE_ROLE_KEY role: ${payload.role}. Expected: service_role`);
  }

  return createClient(url, serviceRoleKey);
}
