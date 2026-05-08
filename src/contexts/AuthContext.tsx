'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { createClient, isSupabaseConfigured } from '@/lib/supabase';
import { User, UserRole } from '@/types';

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: User | null;
  loading: boolean;
  empresaId: string | null;
  role: UserRole | null;
  isConfigured: boolean;
  secoesPermitidas: string[];
  nomeMarca: string | null;
  permitirFotoProduto: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginFuncionario: (codigoEmpresa: string, pin: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const FUNCIONARIO_SESSION_KEY = 'funcionario_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [secoesPermitidas, setSecoesPermitidas] = useState<string[]>([]);
  const [nomeMarca, setNomeMarca] = useState<string | null>(null);
  const [permitirFotoProduto, setPermitirFotoProduto] = useState(true);
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const hasInitialized = useRef(false);
  const initialSessionProcessed = useRef(false);
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);
  const userCache = useRef<Map<string, User>>(new Map());
  const fetchingRef = useRef<Set<string>>(new Set());
  const lastFetchedUserId = useRef<string | null>(null);

  // Inicializar cliente Supabase apenas uma vez
  const getSupabase = () => {
    if (!supabaseRef.current) {
      supabaseRef.current = createClient();
    }
    return supabaseRef.current;
  };

  // Buscar dados do usuário na tabela usuarios via API route
  const fetchUserData = async (authUserId: string): Promise<User | null> => {
    // Verificar cache
    const cached = userCache.current.get(authUserId);
    if (cached) {
      return cached;
    }

    // Evitar chamadas duplicadas simultâneas
    if (fetchingRef.current.has(authUserId)) {
      return null;
    }

    try {
      fetchingRef.current.add(authUserId);

      const response = await fetch('/api/fetch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.blocked || result.expired) {
          await getSupabase().auth.signOut();
          throw new Error(result.error);
        }
        return null;
      }

      if (!result.user) {
        return null;
      }


      // Armazenar seções permitidas, nome da marca e permissão de foto
      setSecoesPermitidas(result.user.secoesPermitidas || []);
      setNomeMarca(result.user.nomeMarca || null);
      setPermitirFotoProduto(result.user.permitirFotoProduto ?? true);

      const userData: User = {
        id: result.user.id,
        email: result.user.email,
        nome: result.user.nome,
        role: result.user.role,
        empresaId: result.user.empresaId,
        ativo: result.user.ativo,
        criadoEm: new Date(result.user.criadoEm),
        atualizadoEm: new Date(result.user.atualizadoEm),
      };

      // Salvar no cache
      userCache.current.set(authUserId, userData);
      lastFetchedUserId.current = authUserId;

      return userData;
    } catch (error) {
      // Tentar novamente uma vez após breve delay
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResponse = await fetch('/api/fetch-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ authUserId }),
        });
        if (retryResponse.ok) {
          const retryResult = await retryResponse.json();
          if (retryResult.user) {
            return retryResult.user;
          }
        }
      } catch {
      }
      return null;
    } finally {
      fetchingRef.current.delete(authUserId);
    }
  };

  // Buscar funcionário pelo PIN via API route (bypass RLS com service role)
  const fetchFuncionarioByPin = async (codigoEmpresa: string, pin: string): Promise<User | null> => {
    try {
      const response = await fetch('/api/funcionario-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin, codigoEmpresa }),
      });

      const result = await response.json();

      if (!response.ok) {
        return null;
      }

      if (!result.funcionario) {
        return null;
      }

      const func = result.funcionario;
      return {
        id: func.id,
        email: func.email || '',
        nome: func.nome,
        role: 'funcionario',
        empresaId: func.empresaId,
        ativo: func.ativo,
        criadoEm: new Date(func.criadoEm),
        atualizadoEm: new Date(func.atualizadoEm),
      };
    } catch {
      return null;
    }
  };

  // Carregar sessão do funcionário do localStorage
  // A validação real é feita pelo middleware via cookie httpOnly no server
  const loadFuncionarioSession = (): User | null => {
    if (typeof window === 'undefined') return null;
    try {
      const sessionStr = localStorage.getItem(FUNCIONARIO_SESSION_KEY);
      if (sessionStr) {
        const parsed = JSON.parse(sessionStr);
        if (parsed.expiraEm && new Date(parsed.expiraEm) > new Date()) {
          return parsed.user;
        } else {
          localStorage.removeItem(FUNCIONARIO_SESSION_KEY);
        }
      }
    } catch {
      localStorage.removeItem(FUNCIONARIO_SESSION_KEY);
    }
    return null;
  };

  // Salvar sessão do funcionário no localStorage
  const saveFuncionarioSession = (userData: User) => {
    if (typeof window === 'undefined') return;
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 24);
    localStorage.setItem(FUNCIONARIO_SESSION_KEY, JSON.stringify({
      user: userData,
      expiraEm: expiraEm.toISOString()
    }));
  };

  // Limpar sessão do funcionário
  const clearFuncionarioSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FUNCIONARIO_SESSION_KEY);
    }
  };

  const refreshUser = async () => {
    if (supabaseUser) {
      const userData = await fetchUserData(supabaseUser.id);
      if (userData && mounted.current) {
        setUser(userData);
      }
    }
  };

  useEffect(() => {
    mounted.current = true;

    // Evitar dupla inicialização
    if (hasInitialized.current) {
      return;
    }

    const initSession = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        const { data: { session: initialSession } } = await getSupabase().auth.getSession();

        if (!mounted.current) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setSupabaseUser(initialSession.user);
          const userData = await fetchUserData(initialSession.user.id);
          if (userData && mounted.current) {
            // Device check on initial load only
            if (userData.empresaId) {
              try {
                await verifyDevice(userData.empresaId, userData.id, userData.nome);
              } catch (deviceError) {
                await getSupabase().auth.signOut();
                if (mounted.current) {
                  setUser(null);
                  setLoading(false);
                }
                return;
              }
            }
            if (mounted.current) {
              setUser(userData);
            }
          } else if (mounted.current) {
            setUser(null);
          }
          clearFuncionarioSession();
        } else {
          const funcionarioUser = loadFuncionarioSession();
          if (funcionarioUser && mounted.current) {
            setUser(funcionarioUser);
          }
        }
        if (mounted.current) {
          setLoading(false);
        }
      } catch (error) {
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    initSession();

    let subscription: { unsubscribe: () => void } | null = null;

    // Log de debug para verificar estado


    // Heartbeat para manter sessão viva - verifica a cada 2 minutos
    const heartbeatInterval = setInterval(async () => {
      if (!mounted.current) return;

      try {
        const { data: { session: currentSession } } = await getSupabase().auth.getSession();

        if (currentSession) {
          const expiresAt = currentSession.expires_at;
          const now = Math.floor(Date.now() / 1000);

          // Se expira em menos de 5 minutos, fazer refresh proativo
          if (expiresAt && (expiresAt - now) < 300) {
            const { error } = await getSupabase().auth.refreshSession();
            if (error) {
            } else {
            }
          }
        }
      } catch (error) {
      }
    }, 2 * 60 * 1000); // 2 minutos

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      clearInterval(heartbeatInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Função auxiliar para verificação de dispositivo
  const verifyDevice = async (empresaId: string, usuarioId: string, usuarioNome: string, isFuncionario = false): Promise<void> => {
    try {
      const { getDeviceId, getDeviceName } = await import('@/lib/device-fingerprint');
      const deviceId = getDeviceId();
      const deviceName = getDeviceName();
      const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : '';

      const deviceResponse = await fetch('/api/dispositivos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          empresaId,
          deviceId,
          deviceName,
          userAgent,
          usuarioId,
          usuarioNome,
          isFuncionario,
        }),
      });

      const deviceResult = await deviceResponse.json();
      if (!deviceResult.allowed) {
        throw new Error(deviceResult.message || 'Dispositivo não autorizado');
      }
    } catch (deviceError) {
      if (deviceError instanceof Error) {
        throw deviceError;
      }
      // Silently pass if device check fails (network issue, etc.)
    }
  };

  const login = async (email: string, password: string) => {
    const { data, error } = await getSupabase().auth.signInWithPassword({
      email,
      password,
    });

    // Se o erro for "Email not confirmed", confirmar via admin API e retry
    if (error && (error.message.includes('Email not confirmed') || error.status === 400)) {
      try {
        const confirmResponse = await fetch('/api/auth/confirm-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email }),
        });
        const confirmResult = await confirmResponse.json();

        if (confirmResponse.ok && confirmResult.success) {
          // Retry do login após confirmar o email
          const retry = await getSupabase().auth.signInWithPassword({ email, password });
          if (retry.error) throw retry.error;
          if (retry.data.user) {
            const userData = await fetchUserData(retry.data.user.id);
            if (!userData) {
              await getSupabase().auth.signOut();
              throw new Error('Usuário não encontrado no sistema');
            }
            if (!userData.ativo) {
              await getSupabase().auth.signOut();
              throw new Error('Seu acesso foi revogado. Entre em contato com o administrador.');
            }
            // Device check
            if (userData.empresaId) {
              await verifyDevice(userData.empresaId, userData.id, userData.nome);
            }
            setUser(userData);
            clearFuncionarioSession();
          }
          return;
        }
      } catch (confirmError) {
      }
      // Se não conseguiu confirmar, lançar o erro original
      throw error;
    }

    if (error) throw error;

    if (data.user) {
      const userData = await fetchUserData(data.user.id);
      if (!userData) {
        await getSupabase().auth.signOut();
        throw new Error('Usuário não encontrado no sistema');
      }
      if (!userData.ativo) {
        await getSupabase().auth.signOut();
        throw new Error('Seu acesso foi revogado. Entre em contato com o administrador.');
      }
      // Device check
      if (userData.empresaId) {
        await verifyDevice(userData.empresaId, userData.id, userData.nome);
      }
      setUser(userData);
      clearFuncionarioSession();
    }
  };

  const loginFuncionario = async (codigoEmpresa: string, pin: string) => {
    const userData = await fetchFuncionarioByPin(codigoEmpresa, pin);
    if (!userData) {
      throw new Error('Código da empresa ou PIN inválido');
    }
    if (!userData.ativo) {
      throw new Error('Seu acesso foi desativado.');
    }
    // Device check - funcionários SEMPRE exigem aprovação de novo dispositivo
    if (userData.empresaId) {
      try {
        await verifyDevice(userData.empresaId, userData.id, userData.nome, true);
      } catch (deviceError) {
        clearFuncionarioSession();
        throw deviceError;
      }
    }
    setUser(userData);
    saveFuncionarioSession(userData);
  };

  const logout = async () => {
    // Limpar cookie de autenticação do funcionário
    try {
      await fetch('/api/funcionario-login', { method: 'DELETE' });
    } catch {
      // Ignorar erro ao limpar cookie
    }
    await getSupabase().auth.signOut();
    setSession(null);
    setSupabaseUser(null);
    setUser(null);
    setSecoesPermitidas([]);
    setNomeMarca(null);
    setPermitirFotoProduto(true);
    clearFuncionarioSession();
    hasInitialized.current = false;

    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await getSupabase().auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha`,
    });
    if (error) throw error;
  };

  const value: AuthContextType = {
    session,
    supabaseUser,
    user,
    loading,
    empresaId: user?.empresaId || null,
    role: user?.role || null,
    isConfigured: isSupabaseConfigured(),
    secoesPermitidas,
    nomeMarca,
    permitirFotoProduto,
    login,
    loginFuncionario,
    logout,
    resetPassword,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
