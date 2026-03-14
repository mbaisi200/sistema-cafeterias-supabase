// Re-export dos clientes Supabase
export { createClient, getSupabaseClient } from './client'
export { createClient as createServerClient, createAdminClient } from './server'

// Tipos do Supabase
export type { Session, User, AuthError } from '@supabase/supabase-js'
