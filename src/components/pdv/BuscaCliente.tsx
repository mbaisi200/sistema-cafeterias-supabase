'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Search, User, Building2, X, Loader2, CheckCircle, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface ClienteEncontrado {
  id: string;
  tipo_pessoa: string;
  cnpj_cpf: string;
  nome_razao_social: string;
  nome_fantasia?: string;
  email?: string;
  telefone?: string;
  celular?: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  codigo_municipio: string;
  municipio: string;
  uf: string;
  cep: string;
}

interface BuscaClienteProps {
  onSelect: (cliente: ClienteEncontrado | null) => void;
  selected?: ClienteEncontrado | null;
  placeholder?: string;
  label?: string;
  showActions?: boolean;
  onCadastrarNovo?: () => void;
}

export function BuscaCliente({
  onSelect,
  selected,
  placeholder = 'Buscar cliente por nome ou CPF/CNPJ...',
  label = 'Identificar Cliente',
  showActions = true,
  onCadastrarNovo,
}: BuscaClienteProps) {
  const [busca, setBusca] = useState('');
  const [resultados, setResultados] = useState<ClienteEncontrado[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [mostrarConfirmacao, setMostrarConfirmacao] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buscarClientes = useCallback(async (termo: string) => {
    if (termo.length < 2) {
      setResultados([]);
      setShowDropdown(false);
      return;
    }

    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('busca', termo);
      params.append('limite', '10');

      const res = await fetch(`/api/clientes?${params.toString()}`);
      const data = await res.json();

      if (data.sucesso) {
        setResultados(data.clientes || []);
        setShowDropdown(true);
      }
    } catch (error) {
      console.error('Erro ao buscar clientes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce na busca
  const handleBuscaChange = (valor: string) => {
    setBusca(valor);

    if (selected) {
      onSelect(null);
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (valor.length < 2) {
      setResultados([]);
      setShowDropdown(false);
      return;
    }

    debounceRef.current = setTimeout(() => {
      buscarClientes(valor);
    }, 300);
  };

  const handleSelect = (cliente: ClienteEncontrado) => {
    setBusca('');
    setResultados([]);
    setShowDropdown(false);
    setMostrarConfirmacao(false);
    onSelect(cliente);
  };

  const handleDesvincular = () => {
    onSelect(null);
    setBusca('');
  };

  const mascaraCPFCNPJ = (valor: string) => {
    const nums = valor.replace(/\D/g, '');
    if (nums.length <= 11) {
      return nums.replace(/(\d{3})(\d{3})(\d{3})(\d{0,2})/, '$1.$2.$3-$4').replace(/(-\s*)$/, '');
    }
    return nums.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{0,2})/, '$1.$2.$3/$4-$5').replace(/(-\s*)$/, '');
  };

  const mascaraCEP = (valor: string) => valor.replace(/\D/g, '').replace(/(\d{5})(\d{0,3})/, '$1-$2');
  const mascaraFone = (valor: string) => valor.replace(/\D/g, '').replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/(-\s*)$/, '');

  // Se tem cliente selecionado, mostrar card do cliente
  if (selected) {
    return (
      <div className="space-y-2">
        <Label>{label}</Label>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-2 flex-1 min-w-0">
              <div className="h-9 w-9 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                {selected.tipo_pessoa === '1' ? (
                  <Building2 className="h-4 w-4 text-green-700" />
                ) : (
                  <User className="h-4 w-4 text-green-700" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-green-800 text-sm truncate">{selected.nome_razao_social}</p>
                {selected.nome_fantasia && (
                  <p className="text-xs text-green-600 truncate">Fantasia: {selected.nome_fantasia}</p>
                )}
                <p className="text-xs text-green-600 font-mono">
                  {selected.tipo_pessoa === '1' ? 'CNPJ' : 'CPF'}: {mascaraCPFCNPJ(selected.cnpj_cpf)}
                </p>
                {(selected.telefone || selected.celular) && (
                  <p className="text-xs text-green-600">
                    Tel: {mascaraFone(selected.telefone || selected.celular || '')}
                  </p>
                )}
                {selected.email && (
                  <p className="text-xs text-green-600 truncate">{selected.email}</p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-green-600 hover:text-red-600 hover:bg-red-50 shrink-0"
              onClick={handleDesvincular}
              title="Remover cliente"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <div className="flex items-center gap-1 mt-2">
            <CheckCircle className="h-3 w-3 text-green-600" />
            <span className="text-xs text-green-700 font-medium">Cliente identificado</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label className="font-bold flex items-center gap-2">
        <User className="h-4 w-4 text-gray-600" />
        {label}
        <span className="text-xs text-gray-400 font-normal">(opcional)</span>
      </Label>

      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={placeholder}
            value={busca}
            onChange={(e) => handleBuscaChange(e.target.value)}
            onFocus={() => {
              if (resultados.length > 0) setShowDropdown(true);
            }}
            className="pl-10 pr-9 border-blue-200 focus:border-blue-500"
          />
          {loading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {!loading && busca.length >= 2 && (
            <button
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-600"
              onClick={() => {
                setBusca('');
                setResultados([]);
                setShowDropdown(false);
              }}
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Dropdown com resultados */}
        {showDropdown && resultados.length > 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {resultados.map((cliente) => (
              <button
                key={cliente.id}
                className="w-full px-3 py-2.5 hover:bg-blue-50 border-b border-gray-50 last:border-b-0 text-left transition-colors"
                onClick={() => handleSelect(cliente)}
              >
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0">
                    {cliente.tipo_pessoa === '1' ? (
                      <Building2 className="h-3.5 w-3.5 text-blue-600" />
                    ) : (
                      <User className="h-3.5 w-3.5 text-blue-600" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm text-gray-800 truncate">
                      {cliente.nome_razao_social}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-mono">
                        {mascaraCPFCNPJ(cliente.cnpj_cpf)}
                      </span>
                      {cliente.telefone && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>{mascaraFone(cliente.telefone)}</span>
                        </>
                      )}
                      {cliente.municipio && (
                        <>
                          <span className="text-gray-300">|</span>
                          <span>{cliente.municipio}/{cliente.uf}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <CheckCircle className="h-4 w-4 text-blue-300 opacity-0 group-hover:opacity-100 shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Sem resultados */}
        {showDropdown && !loading && busca.length >= 2 && resultados.length === 0 && (
          <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-4">
            <div className="text-center text-gray-400">
              <User className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm font-medium">Nenhum cliente encontrado</p>
              <p className="text-xs mt-1">Digite o CPF/CNPJ para cadastrar manualmente</p>
            </div>
          </div>
        )}
      </div>

      {/* Botão cadastrar novo */}
      {showActions && onCadastrarNovo && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs gap-1"
          onClick={onCadastrarNovo}
        >
          <UserPlus className="h-3.5 w-3.5" />
          Cadastrar novo cliente
        </Button>
      )}
    </div>
  );
}

// Componente Label simples para uso interno
function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <label className={`text-sm font-medium leading-none ${className || ''}`}>
      {children}
    </label>
  );
}
