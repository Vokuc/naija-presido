import { createBrowserClient } from '@supabase/ssr'
import { Env } from '../config/env'

export function createClient() {
  return createBrowserClient(
    Env.SUPABASE_URL,
    Env.SUPABASE_ANON_KEY
  )
}
