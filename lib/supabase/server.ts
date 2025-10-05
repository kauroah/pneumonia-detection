// lib/supabase/server.ts
import { createClient as createSupabaseClient } from "@supabase/supabase-js"

export function createServerClient() {
  const url = process.env.SUPABASE_URL!
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY!
  if (!url || !key) throw new Error("Missing SUPABASE_URL or SUPABASE_*_KEY env")

  return createSupabaseClient(url, key, {
    auth: { persistSession: false },
    global: { fetch },
  })
}
