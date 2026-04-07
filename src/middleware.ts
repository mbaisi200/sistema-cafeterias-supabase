import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

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

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Se Supabase não está configurado, permitir acesso apenas a rotas públicas
  if (!isValidSupabaseConfig) {
    const publicRoutes = ['/', '/recuperar-senha', '/setup-master', '/diagnostico', '/setup']
    const isPublicRoute = publicRoutes.some(route =>
      request.nextUrl.pathname === route || 
      request.nextUrl.pathname.startsWith('/api/') ||
      request.nextUrl.pathname.startsWith('/_next/')
    )
    
    if (!isPublicRoute) {
      // Redirecionar para página de setup se tentar acessar rota protegida
      const url = request.nextUrl.clone()
      url.pathname = '/setup'
      return NextResponse.redirect(url)
    }
    
    return supabaseResponse
  }

  const supabase = createServerClient(
    supabaseUrl!,
    supabaseAnonKey!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // NÃO escreva lógica entre createServerClient e supabase.auth.getUser()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  // Verificar se funcionário está autenticado via cookie (PIN login)
  const funcAuthCookie = request.cookies.get('func_auth')?.value
  const isFuncionarioAuth = funcAuthCookie === 'true'

  // Rotas públicas que não precisam de autenticação
  const publicRoutes = ['/', '/recuperar-senha', '/setup-master', '/diagnostico']
  const isPublicRoute = publicRoutes.some(route =>
    request.nextUrl.pathname === route || request.nextUrl.pathname.startsWith('/api/')
  )

  // Se há erro de autenticação ou usuário null em rota protegida
  // MAS se o funcionário está autenticado via cookie, permitir acesso
  if ((!user || error) && !isPublicRoute && !isFuncionarioAuth) {
    console.log('🚪 Middleware: Sessão inválida, redirecionando para login')
    const url = request.nextUrl.clone()
    url.pathname = '/'
    url.searchParams.set('session_expired', 'true')
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
