'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { Session, User as SupabaseUser, AuthError } from '@supabase/supabase-js';
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

// Chave para armazenar sessão do funcionário no localStorage
const FUNCIONARIO_SESSION_KEY = 'funcionario_session';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [supabaseUser, setSupabaseUser] = useState<SupabaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = getSupabaseClient();

  // Buscar dados do usuário na tabela usuarios
  const fetchUserData = async (authUserId: string): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from('usuarios')
        .select('*')
        .eq('auth_user_id', authUserId)
        .single();

      if (error) {
        console.error('Erro ao buscar usuário:', error);
        return null;
      }

      if (!data) return null;

      return {
        id: data.id,
        email: data.email,
        nome: data.nome,
        role: data.role,
        empresaId: data.empresa_id,
        ativo: data.ativo,
        criadoEm: new Date(data.criado_em),
        atualizadoEm: new Date(data.atualizado_em),
      };
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Buscar funcionário pelo PIN
  const fetchFuncionarioByPin = async (codigoEmpresa: string, pin: string): Promise<User | null> => {
    try {
      console.log('Buscando funcionário com código:', codigoEmpresa, 'PIN:', pin);

      // Buscar funcionário pelo PIN
      const { data: funcionarios, error } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('pin', pin)
        .eq('ativo', true);

      if (error || !funcionarios || funcionarios.length === 0) {
        console.log('Nenhum funcionário encontrado com este PIN');
        return null;
      }

      // Filtrar pelo código da empresa (primeiros 8 caracteres do empresaId)
      const codigoUpper = codigoEmpresa.toUpperCase();
      
      for (const func of funcionarios) {
        const funcEmpresaId = func.empresa_id || '';
        const funcCodigoEmpresa = funcEmpresaId.substring(0, 8).toUpperCase();
        
        console.log('Verificando funcionário:', func.nome, 'Código empresa:', funcCodigoEmpresa);
        
        if (funcCodigoEmpresa === codigoUpper && func.ativo) {
          console.log('Funcionário encontrado:', func.nome);
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

      console.log('Nenhum funcionário encontrado com código e PIN correspondentes');
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
        // Verificar se a sessão não expirou (24 horas)
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
      setUser(userData);
    }
  };

  useEffect(() => {
    // Verificar sessão inicial
    const initSession = async () => {
      const { data: { session: initialSession } } = await supabase.auth.getSession();
      
      if (initialSession?.user) {
        setSession(initialSession);
        setSupabaseUser(initialSession.user);
        const userData = await fetchUserData(initialSession.user.id);
        setUser(userData);
        clearFuncionarioSession();
      } else {
        // Verificar se há sessão de funcionário
        const funcionarioUser = loadFuncionarioSession();
        if (funcionarioUser) {
          setUser(funcionarioUser);
        }
      }
      setLoading(false);
    };

    initSession();

    // Escutar mudanças de autenticação
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setSupabaseUser(newSession?.user ?? null);
      
      if (newSession?.user && !newSession.user.is_anonymous) {
        const userData = await fetchUserData(newSession.user.id);
        setUser(userData);
        clearFuncionarioSession();
      } else if (!newSession) {
        // Verificar sessão de funcionário
        const funcionarioUser = loadFuncionarioSession();
        if (funcionarioUser) {
          setUser(funcionarioUser);
        } else {
          setUser(null);
        }
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw error;
    }

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
    // Buscar funcionário pelo PIN
    const userData = await fetchFuncionarioByPin(codigoEmpresa, pin);
    
    if (!userData) {
      throw new Error('Código da empresa ou PIN inválido');
    }
    
    if (!userData.ativo) {
      throw new Error('Seu acesso foi desativado. Entre em contato com o gerente.');
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
    
    // Limpar cache do navegador
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
      if ('caches' in window) {
        window.caches.keys().then(names => {
          names.forEach(name => {
            window.caches.delete(name);
          });
        });
      }
    }
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/recuperar-senha`,
    });
    
    if (error) {
      throw error;
    }
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
