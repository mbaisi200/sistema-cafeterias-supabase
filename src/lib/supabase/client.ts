// Lazy load do createBrowserClient para evitar erros quando não configurado
let createBrowserClientFn: typeof import('@supabase/ssr').createBrowserClient | null = null

// Singleton para evitar múltiplas instâncias
let client: ReturnType<typeof import('@supabase/ssr').createBrowserClient> | null = null

// Verificar se as credenciais são válidas (não são placeholders)
function checkSupabaseConfig(url: string | undefined, key: string | undefined): boolean {
  if (!url || !key) return false
  if (url === 'https://your-project.supabase.co') return false
  if (url.includes('your-project')) return false
  if (key === 'your-anon-key-here') return false
  if (key.length < 50) return false
  // Verificar se a URL é válida
  try {
    new URL(url)
    return true
  } catch {
    return false
  }
}

export function isSupabaseConfigured(): boolean {
  return checkSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}

// Tipo do cliente Supabase
type SupabaseClient = ReturnType<typeof import('@supabase/ssr').createBrowserClient>

// Mock query builder que suporta encadeamento
function createMockQueryBuilder() {
  const queryBuilder: Record<string, unknown> = {
    data: null,
    error: new Error('Supabase não configurado'),
  }

  // Métodos que retornam o próprio queryBuilder para encadeamento
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'upsert',
    'eq', 'neq', 'gt', 'gte', 'lt', 'lte', 'in', 'contains', 'containedBy',
    'order', 'limit', 'offset', 'range', 'single', 'maybeSingle',
    'ilike', 'like', 'is', 'not', 'or', 'and', 'filter',
    'match', 'overlaps', 'textSearch', 'fts', 'plfts', 'phfts', 'wfts'
  ]

  chainMethods.forEach(method => {
    queryBuilder[method] = (..._args: unknown[]) => queryBuilder
  })

  // Métodos que retornam promise
  queryBuilder.then = (resolve: (value: unknown) => void) => {
    return Promise.resolve(resolve({ data: null, error: new Error('Supabase não configurado') }))
  }

  return queryBuilder
}

// Mock client para quando o Supabase não está configurado
function createMockClient(): SupabaseClient {
  const mockClient = {
    auth: {
      getSession: async () => ({ data: { session: null }, error: null }),
      getUser: async () => ({ data: { user: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null, session: null }, error: new Error('Supabase não configurado') }),
      signOut: async () => ({ error: null }),
      resetPasswordForEmail: async () => ({ error: new Error('Supabase não configurado') }),
      refreshSession: async () => ({ data: { session: null, user: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
    },
    from: (_table: string) => createMockQueryBuilder(),
    rpc: (_fn: string, _args?: Record<string, unknown>) => ({
      data: null,
      error: new Error('Supabase não configurado'),
    }),
    storage: {
      from: (_bucket: string) => ({
        upload: async () => ({ data: null, error: new Error('Supabase não configurado') }),
        download: async () => ({ data: null, error: new Error('Supabase não configurado') }),
        remove: async () => ({ data: null, error: new Error('Supabase não configurado') }),
        list: async () => ({ data: [], error: new Error('Supabase não configurado') }),
        getPublicUrl: () => ({ data: { publicUrl: '' } }),
        createSignedUrl: async () => ({ data: null, error: new Error('Supabase não configurado') }),
      }),
    },
    realtime: {
      channel: () => ({
        on: () => ({ subscribe: () => {} }),
        subscribe: () => {},
        unsubscribe: () => {},
      }),
    },
    channel: () => ({
      on: () => ({ subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    }),
  }

  return mockClient as unknown as SupabaseClient
}

export async function createClientAsync(): Promise<SupabaseClient> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Se não configurado, retornar um cliente mock
  if (!checkSupabaseConfig(supabaseUrl, supabaseAnonKey)) {
    console.warn('⚠️ Supabase não configurado. Configure as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return createMockClient()
  }

  try {
    // Lazy import do @supabase/ssr
    if (!createBrowserClientFn) {
      const ssr = await import('@supabase/ssr')
      createBrowserClientFn = ssr.createBrowserClient
    }

    return createBrowserClientFn(
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
          debug: false,
        },
        global: {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      }
    )
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
    return createMockClient()
  }
}

export function createClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Se não configurado, retornar um cliente mock
  if (!checkSupabaseConfig(supabaseUrl, supabaseAnonKey)) {
    console.warn('⚠️ Supabase não configurado. Configure as variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY')
    return createMockClient()
  }

  try {
    // Import síncrono (pode falhar se @supabase/ssr tiver problemas)
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { createBrowserClient } = require('@supabase/ssr')

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
          debug: false,
        },
        global: {
          headers: {
            'Cache-Control': 'no-store',
          },
        },
      }
    )
  } catch (error) {
    console.error('Erro ao criar cliente Supabase:', error)
    return createMockClient()
  }
}

export function getSupabaseClient(): SupabaseClient {
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

// ── Movimentação de Estoque ──
export async function debitarEstoqueVenda(
  supabase: any,
  empresaId: string,
  produtoId: string,
  quantidade: number,
  usuarioId?: string,
  usuarioNome?: string,
  vendaId?: string,
  observacao?: string,
): Promise<void> {
  const { data: prod } = await supabase
    .from('produtos')
    .select('estoque_atual, controlar_estoque, nome')
    .eq('id', produtoId)
    .single();

  if (!prod) return;
  if (prod.controlar_estoque === false) return;

  try {
    const { error: rpcError } = await supabase.rpc('decrementar_estoque_produto', {
      p_produto_id: produtoId,
      p_quantidade: quantidade,
    });
    if (rpcError) throw rpcError;
  } catch {
    const novoEstoque = Math.max(0, parseFloat(prod.estoque_atual) - quantidade);
    await supabase.from('produtos').update({ estoque_atual: novoEstoque }).eq('id', produtoId);
  }

  await supabase.from('estoque_movimentos').insert({
    empresa_id: empresaId,
    produto_id: produtoId,
    produto_nome: prod.nome,
    tipo: 'venda',
    quantidade,
    estoque_anterior: parseFloat(prod.estoque_atual) || 0,
    estoque_novo: Math.max(0, (parseFloat(prod.estoque_atual) || 0) - quantidade),
    usuario_id: usuarioId,
    usuario_nome: usuarioNome,
    observacao: observacao || `Venda ${vendaId ? vendaId.slice(-8) : ''}`,
    venda_id: vendaId,
    criado_em: new Date().toISOString(),
  });
}
