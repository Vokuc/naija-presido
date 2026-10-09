import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { Env } from '../config/env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    Env.SUPABASE_URL,
    Env.SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}

export function createAdminClient() {
  // Service role for internal operations (e.g. game ticks, financial transfers)
  return createServerClient(
    Env.SUPABASE_URL,
    Env.SUPABASE_SERVICE_ROLE_KEY,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}
