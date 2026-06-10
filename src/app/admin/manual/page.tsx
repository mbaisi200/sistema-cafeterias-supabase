'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { MainLayout } from '@/components/layout/MainLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BookOpen,
  Search,
  ChevronDown,
  ChevronRight,
  Loader2,
  FileText,
  BookMarked,
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import ReactMarkdown from 'react-markdown';
import { useTheme } from 'next-themes';
import { useAuth } from '@/contexts/AuthContext';

interface Secao {
  id: string;
  categoria: string;
  titulo: string;
  conteudo: string;
  ordem: number;
  icone: string;
}

interface Categoria {
  nome: string;
  icone: string;
  itens: Secao[];
}

export default function ManualPage() {
  const { segmentoId, role } = useAuth();
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [categoriasAbertas, setCategoriasAbertas] = useState<string[]>([]);
  const { resolvedTheme } = useTheme();
  const darkMode = resolvedTheme === 'dark';
  const reqRef = useRef(0);

  useEffect(() => {
    carregarManual();
  }, [segmentoId]);

  const carregarManual = async () => {
    const reqId = ++reqRef.current;
    setLoading(true);
    try {
      const params = segmentoId ? `?segmentoId=${encodeURIComponent(segmentoId)}` : '';
      const res = await fetch(`/api/manual${params}`);
      const json = await res.json();
      if (reqId !== reqRef.current) return; // requisição obsoleta
      if (json.sucesso && json.data?.categorias) {
        setCategorias(json.data.categorias);
        setCategoriasAbertas(json.data.categorias.map((c: Categoria) => c.nome));
      }
    } catch (err) {
      console.error('Erro ao carregar manual:', err);
    } finally {
      if (reqId === reqRef.current) setLoading(false);
    }
  };

  const categoriasFiltradas = categorias
    .filter(cat => role === 'master' || cat.nome !== 'Painel Master')
    .map(cat => ({
      ...cat,
      itens: cat.itens.filter(item =>
        item.titulo.toLowerCase().includes(busca.toLowerCase()) ||
        item.conteudo.toLowerCase().includes(busca.toLowerCase())
      ),
    }))
    .filter(cat => cat.itens.length > 0);

  const toggleCategoria = (nome: string) => {
    setCategoriasAbertas(prev =>
      prev.includes(nome)
        ? prev.filter(n => n !== nome)
        : [...prev, nome]
    );
  };

  return (
    <ProtectedRoute allowedRoles={['admin', 'master']}>
      <MainLayout
        breadcrumbs={[
          { title: 'Admin' },
          { title: 'Manual do Sistema' },
        ]}
      >
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${
                darkMode
                  ? 'bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-400/20'
                  : 'bg-gradient-to-br from-teal-500 to-cyan-500'
              }`}>
                <BookOpen className={`h-6 w-6 ${darkMode ? 'text-cyan-300' : 'text-white'}`} />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Manual do Sistema</h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-slate-400' : 'text-muted-foreground'}`}>
                  Guia completo de funcionalidades do sistema de gestão
                </p>
              </div>
            </div>
            <Badge variant="secondary" className="text-sm px-3 py-1.5 w-fit">
              <BookMarked className="h-4 w-4 mr-1.5" />
              {categorias.reduce((acc, c) => acc + c.itens.length, 0)} seções
            </Badge>
          </div>

          {/* Busca */}
          <div className="relative max-w-md">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 ${
              darkMode ? 'text-slate-500' : 'text-muted-foreground'
            }`} />
            <Input
              placeholder="Buscar no manual..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={`pl-10 ${darkMode ? 'bg-white/5 border-white/10 text-slate-200' : ''}`}
            />
          </div>

          {/* Conteúdo */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className={`h-8 w-8 animate-spin ${darkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
              <span className="ml-3 text-muted-foreground">Carregando manual...</span>
            </div>
          ) : categoriasFiltradas.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className={`h-12 w-12 mx-auto mb-4 ${darkMode ? 'text-slate-600' : 'text-muted-foreground'}`} />
                <p className="text-lg font-medium mb-2">Nenhum resultado encontrado</p>
                <p className={`text-sm ${darkMode ? 'text-slate-400' : 'text-muted-foreground'}`}>
                  Tente buscar por termos diferentes ou limpe o filtro
                </p>
                {busca && (
                  <Button variant="outline" className="mt-4" onClick={() => setBusca('')}>
                    Limpar busca
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {categoriasFiltradas.map((categoria) => (
                <Card key={categoria.nome} className={`overflow-hidden ${
                  darkMode ? 'bg-[#1e1e32]/80 border-white/10 backdrop-blur-sm' : ''
                }`}>
                  <Collapsible
                    open={categoriasAbertas.includes(categoria.nome)}
                    onOpenChange={() => toggleCategoria(categoria.nome)}
                    className="group"
                  >
                    <CollapsibleTrigger asChild>
                      <button className={`w-full flex items-center justify-between p-4 md:p-5 text-left hover:bg-black/5 transition-colors ${
                        darkMode ? 'hover:bg-white/5' : ''
                      }`}>
                        <div className="flex items-center gap-3">
                          <FileText className={`h-5 w-5 ${darkMode ? 'text-cyan-400' : 'text-teal-600'}`} />
                          <h2 className="text-lg font-semibold">{categoria.nome}</h2>
                          <Badge variant="secondary" className="text-xs">
                            {categoria.itens.length}
                          </Badge>
                        </div>
                        <ChevronDown className={`h-5 w-5 transition-transform group-data-[state=open]:rotate-180 ${
                          darkMode ? 'text-slate-400' : 'text-muted-foreground'
                        }`} />
                      </button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="border-t border-border/50">
                        {categoria.itens.map((secao) => (
                          <div key={secao.id} className={`p-4 md:p-5 border-b border-border/30 last:border-b-0 ${
                            darkMode ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                          }`}>
                            <h3 className="text-base font-medium mb-3 flex items-center gap-2">
                              <ChevronRight className={`h-4 w-4 ${darkMode ? 'text-cyan-400' : 'text-teal-500'}`} />
                              {secao.titulo}
                            </h3>
                            <div className={`prose prose-sm max-w-none prose-headings:text-base prose-headings:font-semibold prose-headings:mt-4 prose-headings:mb-2 prose-p:leading-relaxed prose-pre:bg-black/5 prose-pre:border prose-pre:border-border/50 prose-code:text-sm prose-ul:my-1 prose-li:my-0.5 prose-table:text-sm prose-th:text-left prose-td:p-2 prose-th:p-2 prose-td:border prose-th:border prose-td:border-border/30 prose-th:border-border/30 ${
                              darkMode
                                ? 'text-slate-300 prose-headings:text-slate-100 prose-strong:text-slate-100 prose-code:text-cyan-300 prose-a:text-cyan-400 prose-code:bg-white/5 prose-pre:bg-white/5 prose-pre:text-slate-300'
                                : 'text-gray-700 prose-headings:text-gray-900'
                            }`}>
                              <ReactMarkdown>{secao.conteudo}</ReactMarkdown>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          )}
        </div>
      </MainLayout>
    </ProtectedRoute>
  );
}
