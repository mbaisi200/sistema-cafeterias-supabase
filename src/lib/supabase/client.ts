import { createBrowserClient } from '@supabase/ssr'

// Singleton para evitar múltiplas instâncias
let client: ReturnType<typeof createBrowserClient> | null = null

// Verificar se as variáveis de ambiente estão configuradas
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Verificar se as credenciais são válidas (não são placeholders)
const isValidSupabaseConfig = supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl !== 'https://your-project.supabase.co' &&
  !supabaseUrl.includes('your-project') &&
  supabaseAnonKey !== 'your-anon-key-here' &&
  supabaseAnonKey.length > 50

export function isSupabaseConfigured(): boolean {
  return isValidSupabaseConfig
}

export function createClient() {
  // Se não configurado, retornar um cliente mock que não quebra a aplicação
  if (!isValidSupabaseConfig) {
    console.warn('⚠️ Supabase não configurado. Configure as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
    // Retornar cliente mock para evitar erros
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
    } as unknown as ReturnType<typeof createBrowserClient>
  }

  return createBrowserClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      auth: {
        storageKey: 'sb-wbgppesbzbwyymmmxgqq-auth-token',
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
        flowType: 'pkce',
        lock: false,
        // Configurar debug para monitorar sessão
        debug: false,
      },
      global: {
        headers: {
          // Cache control para evitar problemas de stale session
          'Cache-Control': 'no-store',
        },
      },
    }
  )
}

export function getSupabaseClient() {
  if (!client) {
    client = createClient()
  }
  return client
}

// Função para verificar se a sessão é válida
export async function isSessionValid(): Promise<boolean> {
  const supabase = getSupabaseClient()
  try {
    const { data: { session }, error } = await supabase.auth.getSession()
    if (error || !session) return false

    // Verificar se o token não expirou
    const expiresAt = session.expires_at
    if (!expiresAt) return false

    const now = Math.floor(Date.now() / 1000)
    // Se expira em menos de 60 segundos, tentar refresh
    if (expiresAt - now < 60) {
      const { data: { session: newSession }, error: refreshError } = await supabase.auth.refreshSession()
      return !refreshError && !!newSession
    }

    return true
  } catch {
    return false
  }
}
