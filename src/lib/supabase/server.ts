import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Verificar se as variáveis de ambiente estão configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Verificar se as credenciais são válidas
const isValidSupabaseConfig = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseAnonKey.length > 50

export function isSupabaseConfigured(): boolean {
  return isValidSupabaseConfig
}

export async function createClient() {
  const cookieStore = await cookies()

  // Se não configurado, retornar um cliente mock
  if (!isValidSupabaseConfig) {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase não configurado') }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: new Error('Supabase não configurado') }),
        refreshSession: async () => ({ data: { session: null, user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: null, error: new Error('Supabase não configurado') }),
        insert: () => ({ data: null, error: new Error('Supabase não configurado') }),
        update: () => ({ data: null, error: new Error('Supabase não configurado') }),
        delete: () => ({ data: null, error: new Error('Supabase não configurado') }),
      }),
    } as unknown as ReturnType<typeof createServerClient>
  }

  return createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
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
            // O middleware pode tentar setar cookies mas falhar
            // Isso é esperado em alguns casos
          }
        },
      },
    }
  )
}

// Cliente admin com service role (para operações privilegiadas)
export function createAdminClient() {
  // Se não configurado, retornar um cliente mock
  if (!isValidSupabaseConfig) {
    return {
      auth: {
        getSession: async () => ({ data: { session: null }, error: null }),
        getUser: async () => ({ data: { user: null }, error: null }),
        signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase não configurado') }),
        signOut: async () => ({ error: null }),
        resetPasswordForEmail: async () => ({ error: new Error('Supabase não configurado') }),
        refreshSession: async () => ({ data: { session: null, user: null }, error: null }),
        onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
      },
      from: () => ({
        select: () => ({ data: null, error: new Error('Supabase não configurado') }),
        insert: () => ({ data: null, error: new Error('Supabase não configurado') }),
        update: () => ({ data: null, error: new Error('Supabase não configurado') }),
        delete: () => ({ data: null, error: new Error('Supabase não configurado') }),
      }),
    } as unknown as ReturnType<typeof createServerClient>
  }

  return createServerClient(
    supabaseUrl!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() {
          return []
        },
        setAll() {},
      },
    }
  )
}
