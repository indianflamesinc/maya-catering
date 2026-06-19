import { createClient, SupabaseClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const service = process.env.SUPABASE_SERVICE_ROLE_KEY!

// ── Lazy singletons ──────────────────────────────────────────────────────────
// FIX-090: previously these clients were created at module-evaluation time
// (`export const supabase = createClient(url, anon)`), which crashed with
// "supabaseKey is required" specifically on /admin/menu — a page that imports
// this module directly into a 'use client' component. Other pages (e.g.
// /admin) never hit this because they only call API routes via fetch() and
// never import this file into client-side code.
//
// Root cause: NEXT_PUBLIC_* env vars are inlined into the JS bundle at build
// time, but module-level `createClient()` calls executed during webpack's
// module evaluation can run before that substitution is guaranteed to have
// taken effect for every chunk that imports this file, depending on chunk
// splitting. Lazy initialization defers client creation until first actual
// use (inside a function/effect), by which point env vars are reliably
// available in both server and client bundles.
//
// RULE for all future sessions: never export a Supabase client as a
// module-level `const`. Always lazily construct it behind a getter function.

let _supabase: SupabaseClient | null = null
let _supabaseAdmin: SupabaseClient | null = null

function getSupabase(): SupabaseClient {
  if (!_supabase) {
    if (!url || !anon) {
      throw new Error(
        `Supabase client misconfigured: url=${url ? 'set' : 'MISSING'}, anon=${anon ? 'set' : 'MISSING'}`
      )
    }
    _supabase = createClient(url, anon)
  }
  return _supabase
}

function getSupabaseAdmin(): SupabaseClient {
  if (!_supabaseAdmin) {
    if (!url || !service) {
      throw new Error(
        `Supabase admin client misconfigured: url=${url ? 'set' : 'MISSING'}, service=${service ? 'set' : 'MISSING'}`
      )
    }
    _supabaseAdmin = createClient(url, service, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  }
  return _supabaseAdmin
}

// Proxy objects preserve the existing `supabase.from(...)` call-site syntax
// used across ~15 files in this project, so NO other file needs to change.
export const supabase: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabase() as any)[prop]
  },
})

export const supabaseAdmin: SupabaseClient = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return (getSupabaseAdmin() as any)[prop]
  },
})
