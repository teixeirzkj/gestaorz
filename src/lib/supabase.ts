import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** null = modo local (sem Supabase configurado; dados ficam só neste navegador). */
export const supabase: SupabaseClient | null = url && key ? createClient(url, key) : null
