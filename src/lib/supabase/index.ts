// Re-export dos clientes Supabase (apenas cliente para browser)
export { createClient, getSupabaseClient, isSupabaseConfigured } from './client'

// Tipos do Supabase
export type { Session, User, AuthError } from '@supabase/supabase-js'
