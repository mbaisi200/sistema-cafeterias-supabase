import { createBrowserClient } from '@supabase/ssr'

// Singleton para evitar múltiplas instâncias
let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
