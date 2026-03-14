'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  signInAnonymously,
} from 'firebase/auth';
import { doc, getDoc, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserRole } from '@/types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
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
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserData = async (uid: string): Promise<User | null> => {
    try {
      const dbInstance = db();
      const authInstance = auth();
      
      if (!dbInstance) return null;
      
      const userDoc = await getDoc(doc(dbInstance, 'usuarios', uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        return {
          id: uid,
          email: data.email,
          nome: data.nome,
          role: data.role,
          empresaId: data.empresaId,
          ativo: data.ativo,
          criadoEm: data.criadoEm?.toDate() || new Date(),
          atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
        };
      }
      return null;
    } catch (error) {
      console.error('Error fetching user data:', error);
      return null;
    }
  };

  // Buscar dados do funcionário pelo PIN e código da empresa
  const fetchFuncionarioByPin = async (codigoEmpresa: string, pin: string): Promise<User | null> => {
    try {
      const dbInstance = db();
      if (!dbInstance) return null;

      console.log('Buscando funcionário com código:', codigoEmpresa, 'PIN:', pin);

      // 1. Buscar funcionário pelo PIN (apenas um where para evitar índice composto)
      const funcionarioQuery = query(
        collection(dbInstance, 'funcionarios'),
        where('pin', '==', pin)
      );
      const funcionarioSnapshot = await getDocs(funcionarioQuery);

      console.log('Funcionários encontrados com este PIN:', funcionarioSnapshot.size);

      if (funcionarioSnapshot.empty) {
        console.log('Nenhum funcionário encontrado com este PIN');
        return null;
      }

      // 2. Filtrar pelo código da empresa (primeiros 8 caracteres do empresaId)
      const codigoUpper = codigoEmpresa.toUpperCase();
      
      for (const doc of funcionarioSnapshot.docs) {
        const data = doc.data();
        const funcEmpresaId = data.empresaId || '';
        const funcCodigoEmpresa = funcEmpresaId.substring(0, 8).toUpperCase();
        
        console.log('Verificando funcionário:', data.nome, 'Código empresa:', funcCodigoEmpresa, 'Ativo:', data.ativo);
        
        // Verificar se o código da empresa bate e se está ativo
        if (funcCodigoEmpresa === codigoUpper && data.ativo === true) {
          console.log('Funcionário encontrado:', data.nome);
          return {
            id: doc.id,
            email: data.email || '',
            nome: data.nome,
            role: 'funcionario',
            empresaId: funcEmpresaId,
            ativo: data.ativo,
            criadoEm: data.criadoEm?.toDate() || new Date(),
            atualizadoEm: data.atualizadoEm?.toDate() || new Date(),
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

  const refreshUser = async () => {
    if (firebaseUser) {
      const userData = await fetchUserData(firebaseUser.uid);
      setUser(userData);
    }
  };

  // Carregar sessão do funcionário do localStorage
  const loadFuncionarioSession = (): User | null => {
    if (typeof window === 'undefined') return null;
    
    try {
      const session = localStorage.getItem(FUNCIONARIO_SESSION_KEY);
      if (session) {
        const parsed = JSON.parse(session);
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
  const saveFuncionarioSession = (user: User) => {
    if (typeof window === 'undefined') return;
    
    const expiraEm = new Date();
    expiraEm.setHours(expiraEm.getHours() + 24); // Expira em 24 horas
    
    localStorage.setItem(FUNCIONARIO_SESSION_KEY, JSON.stringify({
      user,
      expiraEm: expiraEm.toISOString()
    }));
  };

  // Limpar sessão do funcionário
  const clearFuncionarioSession = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FUNCIONARIO_SESSION_KEY);
    }
  };

  useEffect(() => {
    const authInstance = auth();
    if (!authInstance) {
      // Verificar se há sessão de funcionário
      const funcionarioUser = loadFuncionarioSession();
      if (funcionarioUser) {
        setUser(funcionarioUser);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(authInstance, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser && !fbUser.isAnonymous) {
        // Usuário logado com conta real (admin/master)
        const userData = await fetchUserData(fbUser.uid);
        setUser(userData);
        clearFuncionarioSession();
      } else if (fbUser && fbUser.isAnonymous) {
        // Usuário anônimo - verificar se há sessão de funcionário
        const funcionarioUser = loadFuncionarioSession();
        if (funcionarioUser) {
          setUser(funcionarioUser);
        }
      } else {
        // Sem usuário no Firebase Auth - verificar sessão de funcionário
        const funcionarioUser = loadFuncionarioSession();
        if (funcionarioUser) {
          // Recriar sessão anônima para ter acesso ao Firestore
          try {
            await signInAnonymously(authInstance);
            setUser(funcionarioUser);
          } catch {
            // Se falhar, limpar sessão
            clearFuncionarioSession();
            setUser(null);
          }
        } else {
          setUser(null);
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const authInstance = auth();
      if (!authInstance) throw new Error('Firebase não inicializado');
      
      const result = await signInWithEmailAndPassword(authInstance, email, password);
      const userData = await fetchUserData(result.user.uid);
      if (!userData) {
        throw new Error('Usuário não encontrado no sistema');
      }
      if (!userData.ativo) {
        await signOut(authInstance);
        throw new Error('Seu acesso foi revogado. Entre em contato com o administrador.');
      }
      setUser(userData);
      clearFuncionarioSession();
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao fazer login');
    }
  };

  // Login do funcionário por PIN
  const loginFuncionario = async (codigoEmpresa: string, pin: string) => {
    try {
      const authInstance = auth();
      if (!authInstance) throw new Error('Firebase não inicializado');

      // Primeiro, criar sessão anônima no Firebase Auth para ter acesso ao Firestore
      await signInAnonymously(authInstance);

      // Agora buscar funcionário pelo PIN (com acesso ao Firestore)
      const userData = await fetchFuncionarioByPin(codigoEmpresa, pin);
      
      if (!userData) {
        // Se não encontrou, fazer logout anônimo
        await signOut(authInstance);
        throw new Error('Código da empresa ou PIN inválido');
      }
      
      if (!userData.ativo) {
        await signOut(authInstance);
        throw new Error('Seu acesso foi desativado. Entre em contato com o gerente.');
      }
      
      setUser(userData);
      saveFuncionarioSession(userData);
      setFirebaseUser(authInstance.currentUser);
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('Erro ao fazer login');
    }
  };

  const logout = async () => {
    const authInstance = auth();
    if (authInstance) {
      await signOut(authInstance);
    }
    setUser(null);
    setFirebaseUser(null);
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
    const authInstance = auth();
    if (!authInstance) throw new Error('Firebase não inicializado');
    await sendPasswordResetEmail(authInstance, email);
  };

  const value: AuthContextType = {
    firebaseUser,
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
