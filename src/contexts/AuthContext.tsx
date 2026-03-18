'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode, useRef } from 'react';
import { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/lib/supabase';
import { User, UserRole } from '@/types';

interface AuthContextType {
  session: Session | null;
  supabaseUser: SupabaseUser | null;
  user: User | null;
  loading: boolean;
  empresaId: string | null;
  role: UserRole | null;
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
  const [loading, setLoading] = useState(true);
  const mounted = useRef(true);
  const hasInitialized = useRef(false);

  const supabase = getSupabaseClient();

  // Buscar dados do usuário na tabela usuarios via API route
  const fetchUserData = async (authUserId: string): Promise<User | null> => {
    try {
      console.log('🔄 Buscando usuário via API com auth_user_id:', authUserId);

      const response = await fetch('/api/fetch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authUserId }),
      });

      const result = await response.json();
      console.log('📊 Resultado da API:', result);

      if (!response.ok) {
        if (result.blocked || result.expired) {
          await supabase.auth.signOut();
          throw new Error(result.error);
        }
        console.error('❌ Erro da API:', result.error);
        return null;
      }

      if (!result.user) {
        console.log('⚠️ Nenhum usuário encontrado');
        return null;
      }

      console.log('✅ Usuário encontrado:', result.user.email, 'role:', result.user.role);

      return {
        id: result.user.id,
        email: result.user.email,
        nome: result.user.nome,
        role: result.user.role,
        empresaId: result.user.empresaId,
        ativo: result.user.ativo,
        criadoEm: new Date(result.user.criadoEm),
        atualizadoEm: new Date(result.user.atualizadoEm),
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Buscar funcionário pelo PIN
  const fetchFuncionarioByPin = async (codigoEmpresa: string, pin: string): Promise<User | null> => {
    try {
      const { data: funcionarios, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('pin', pin)
        .eq('ativo', true);

      if (error || !funcionarios || funcionarios.length === 0) {
        return null;
      }

      const codigoUpper = codigoEmpresa.toUpperCase();
      for (const func of funcionarios) {
        const funcEmpresaId = func.empresa_id || '';
        const funcCodigoEmpresa = funcEmpresaId.substring(0, 8).toUpperCase();
        if (funcCodigoEmpresa === codigoUpper && func.ativo) {
          return {
            id: func.id,
            email: func.email || '',
            nome: func.nome,
            role: 'funcionario',
            empresaId: func.empresa_id,
            ativo: func.ativo,
            criadoEm: new Date(func.criado_em),
            atualizadoEm: new Date(func.atualizado_em),
          };
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching funcionario:', error);
      return null;
    }
  };

  // Carregar sessão do funcionário do localStorage
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
      console.log('⏭️ Já inicializado, pulando');
      return;
    }

    const initSession = async () => {
      if (hasInitialized.current) return;
      hasInitialized.current = true;

      try {
        console.log('🚀 Iniciando sessão...');
        const { data: { session: initialSession } } = await supabase.auth.getSession();

        if (!mounted.current) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setSupabaseUser(initialSession.user);
          const userData = await fetchUserData(initialSession.user.id);
          if (mounted.current) {
            setUser(userData);
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
          console.log('✅ Sessão inicializada');
        }
      } catch (error) {
        console.error('❌ Erro ao inicializar sessão:', error);
        if (mounted.current) {
          setLoading(false);
        }
      }
    };

    initSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      console.log('🔄 Auth state change:', event);
      if (!mounted.current) return;

      // TOKEN_REFRESH: apenas atualizar a sessão, não buscar usuário novamente
      if (event === 'TOKEN_REFRESH') {
        console.log('✅ Token refreshed com sucesso');
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        return;
      }

      // Ignorar INITIAL_SESSION se já tem usuário
      if (event === 'INITIAL_SESSION' && user) {
        console.log('⏭️ Initial session ignorado');
        setSession(newSession);
        setSupabaseUser(newSession?.user ?? null);
        setLoading(false);
        return;
      }

      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);

      if (newSession?.user && !newSession.user.is_anonymous) {
        const userData = await fetchUserData(newSession.user.id);
        if (mounted.current) {
          setUser(userData);
        }
        clearFuncionarioSession();
      } else if (!newSession) {
        const funcionarioUser = loadFuncionarioSession();
        if (mounted.current) {
          setUser(funcionarioUser);
        }
      }

      if (mounted.current) {
        setLoading(false);
      }
    });

    // Heartbeat para manter sessão viva - verifica a cada 2 minutos
    const heartbeatInterval = setInterval(async () => {
      if (!mounted.current) return;

      try {
        const { data: { session: currentSession } } = await supabase.auth.getSession();

        if (currentSession) {
          const expiresAt = currentSession.expires_at;
          const now = Math.floor(Date.now() / 1000);

          // Se expira em menos de 5 minutos, fazer refresh proativo
          if (expiresAt && (expiresAt - now) < 300) {
            console.log('🔄 Refresh proativo da sessão...');
            const { error } = await supabase.auth.refreshSession();
            if (error) {
              console.error('❌ Erro no refresh proativo:', error);
            } else {
              console.log('✅ Refresh proativo realizado');
            }
          }
        }
      } catch (error) {
        console.error('❌ Erro no heartbeat:', error);
      }
    }, 2 * 60 * 1000); // 2 minutos

    return () => {
      mounted.current = false;
      subscription.unsubscribe();
      clearInterval(heartbeatInterval);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      const userData = await fetchUserData(data.user.id);
      if (!userData) {
        await supabase.auth.signOut();
        throw new Error('Usuário não encontrado no sistema');
      }
      if (!userData.ativo) {
        await supabase.auth.signOut();
        throw new Error('Seu acesso foi revogado. Entre em contato com o administrador.');
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
    setUser(userData);
    saveFuncionarioSession(userData);
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setSupabaseUser(null);
    setUser(null);
    clearFuncionarioSession();
    hasInitialized.current = false;

    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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
