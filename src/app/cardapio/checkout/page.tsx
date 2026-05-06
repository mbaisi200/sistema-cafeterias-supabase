'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { getSupabaseClient } from '@/lib/supabase';
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  User, 
  CreditCard, 
  Bike, 
  Store, 
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
  Plus,
  Edit2,
  Trash2
} from 'lucide-react';
import type { CarrinhoItem, TipoPedido } from '@/types/delivery';

// Types
interface ClienteEndereco {
  id: string;
  apelido: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  ponto_referencia?: string;
  endereco_padrao: boolean;
}

interface EmpresaInfo {
  id: string;
  nome: string;
  telefone?: string;
  endereco?: string;
  delivery_ativo: boolean;
  retirada_ativo: boolean;
  taxa_entrega_padrao: number;
  pedido_minimo: number;
  tempo_preparo_min: number;
  tempo_preparo_max: number;
  aceita_dinheiro: boolean;
  aceita_cartao: boolean;
  aceita_pix: boolean;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

function generateCodigo(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'PED-';
  for (let i = 0; i < 4; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function CheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const supabase = getSupabaseClient();

  const empresaId = searchParams.get('empresa') || '';

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [carrinho, setCarrinho] = useState<CarrinhoItem[]>([]);
  const [empresa, setEmpresa] = useState<EmpresaInfo | null>(null);

  // Dados do cliente
  const [clienteNome, setClienteNome] = useState('');
  const [clienteTelefone, setClienteTelefone] = useState('');
  const [clienteEmail, setClienteEmail] = useState('');

  // Endereços
  const [enderecos, setEnderecos] = useState<ClienteEndereco[]>([]);
  const [enderecoSelecionado, setEnderecoSelecionado] = useState<string>('');
  const [mostrarNovoEndereco, setMostrarNovoEndereco] = useState(false);

  // Novo endereço
  const [novoEndereco, setNovoEndereco] = useState({
    apelado: '',
    logradouro: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: '',
    cep: '',
    pontoReferencia: '',
  });

  // Pedido
  const [tipoPedido, setTipoPedido] = useState<TipoPedido>('delivery');
  const [formaPagamento, setFormaPagamento] = useState('dinheiro');
  const [trocoPara, setTrocoPara] = useState<number>(0);
  const [observacoes, setObservacoes] = useState('');

  // Carregar dados
  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLoading(true);
    try {
      // Carregar carrinho do localStorage
      const carrinhoSalvo = localStorage.getItem('carrinho_delivery');
      const empresaSalva = localStorage.getItem('empresa_delivery');

      if (carrinhoSalvo) {
        setCarrinho(JSON.parse(carrinhoSalvo));
      }

      if (empresaSalva) {
        setEmpresa(JSON.parse(empresaSalva));
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const subtotal = carrinho.reduce((sum, item) => sum + item.total, 0);
  const taxaEntrega = tipoPedido === 'delivery' ? (empresa?.taxa_entrega_padrao || 0) : 0;
  const total = subtotal + taxaEntrega;
  const troco = trocoPara > total ? trocoPara - total : 0;

  const handleFinalizarPedido = async () => {
    // Validações
    if (!clienteNome.trim()) {
      toast({ variant: 'destructive', title: 'Nome obrigatório', description: 'Informe seu nome para continuar.' });
      return;
    }

    if (!clienteTelefone.trim()) {
      toast({ variant: 'destructive', title: 'Telefone obrigatório', description: 'Informe seu telefone para continuar.' });
      return;
    }

    if (tipoPedido === 'delivery' && !enderecoSelecionado && !mostrarNovoEndereco) {
      toast({ variant: 'destructive', title: 'Endereço obrigatório', description: 'Selecione ou cadastre um endereço de entrega.' });
      return;
    }

    if (formaPagamento === 'dinheiro' && trocoPara > 0 && trocoPara < total) {
      toast({ variant: 'destructive', title: 'Troco insuficiente', description: 'O valor para troco deve ser maior que o total.' });
      return;
    }

    setSubmitting(true);

    try {
      // 1. Criar ou buscar cliente
      let clienteId = '';

      const { data: clienteExistente } = await supabase
        .from('clientes')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('telefone', clienteTelefone.replace(/\D/g, ''))
        .maybeSingle();

      if (clienteExistente) {
        clienteId = clienteExistente.id;
      } else {
        const { data: novoCliente, error: clienteError } = await supabase
          .from('clientes')
          .insert({
            empresa_id: empresaId,
            nome: clienteNome,
            telefone: clienteTelefone.replace(/\D/g, ''),
            email: clienteEmail || null,
            criado_em: new Date().toISOString(),
          })
          .select('id')
          .single();

        if (clienteError) throw clienteError;
        clienteId = novoCliente.id;
      }

      // 2. Criar endereço se for novo
      let enderecoEntregaId = enderecoSelecionado;
      let enderecoEntrega = null;

      if (tipoPedido === 'delivery') {
        if (mostrarNovoEndereco) {
          const { data: novoEnd, error: enderecoError } = await supabase
            .from('cliente_enderecos')
            .insert({
              cliente_id: clienteId,
              apelido: novoEndereco.apelado || 'Endereço',
              logradouro: novoEndereco.logradouro,
              numero: novoEndereco.numero,
              complemento: novoEndereco.complemento || null,
              bairro: novoEndereco.bairro,
              cidade: novoEndereco.cidade,
              estado: novoEndereco.estado,
              cep: novoEndereco.cep.replace(/\D/g, ''),
              ponto_referencia: novoEndereco.pontoReferencia || null,
              criado_em: new Date().toISOString(),
            })
            .select('id')
            .single();

          if (enderecoError) throw enderecoError;
          enderecoEntregaId = novoEnd.id;

          enderecoEntrega = {
            logradouro: novoEndereco.logradouro,
            numero: novoEndereco.numero,
            complemento: novoEndereco.complemento,
            bairro: novoEndereco.bairro,
            cidade: novoEndereco.cidade,
            estado: novoEndereco.estado,
            cep: novoEndereco.cep,
            pontoReferencia: novoEndereco.pontoReferencia,
          };
        } else if (enderecoSelecionado) {
          const { data: enderecoData } = await supabase
            .from('cliente_enderecos')
            .select('*')
            .eq('id', enderecoSelecionado)
            .single();

          if (enderecoData) {
            enderecoEntrega = {
              logradouro: enderecoData.logradouro,
              numero: enderecoData.numero,
              complemento: enderecoData.complemento,
              bairro: enderecoData.bairro,
              cidade: enderecoData.cidade,
              estado: enderecoData.estado,
              cep: enderecoData.cep,
              pontoReferencia: enderecoData.ponto_referencia,
            };
          }
        }
      }

      // 3. Criar pedido
      const codigo = generateCodigo();
      const tempoEstimado = empresa?.tempo_preparo_max || 45;

      const { data: pedido, error: pedidoError } = await supabase
        .from('pedido_delivery')
        .insert({
          empresa_id: empresaId,
          cliente_id: clienteId,
          codigo,
          tipo: tipoPedido,
          endereco_entrega_id: tipoPedido === 'delivery' ? enderecoEntregaId : null,
          endereco_entrega: enderecoEntrega,
          status: 'pendente',
          subtotal,
          taxa_entrega: taxaEntrega,
          total,
          forma_pagamento: formaPagamento,
          troco_para: formaPagamento === 'dinheiro' ? trocoPara || null : null,
          troco: formaPagamento === 'dinheiro' ? troco || null : null,
          tempo_estimado_preparo: tempoEstimado,
          observacoes: observacoes || null,
          criado_em: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (pedidoError) throw pedidoError;

      // 4. Criar itens do pedido
      const itensPedido = carrinho.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produtoId,
        produto_nome: item.produtoNome,
        produto_descricao: item.produtoDescricao,
        produto_imagem: item.produtoImagem,
        quantidade: item.quantidade,
        preco_unitario: item.precoBase,
        total: item.total,
        variacoes: item.variacoes,
        adicionais: item.adicionais,
        observacoes: item.observacoes,
        criado_em: new Date().toISOString(),
      }));

      const { error: itensError } = await supabase
        .from('pedido_delivery_itens')
        .insert(itensPedido);

      if (itensError) throw itensError;

      // 5. Criar histórico
      await supabase
        .from('pedido_delivery_historico')
        .insert({
          pedido_id: pedido.id,
          status_novo: 'pendente',
          observacao: 'Pedido realizado',
          usuario_tipo: 'cliente',
          criado_em: new Date().toISOString(),
        });

      // 6. Limpar carrinho e redirecionar
      localStorage.removeItem('carrinho_delivery');
      localStorage.removeItem('empresa_delivery');

      toast({
        title: 'Pedido realizado!',
        description: `Seu pedido ${codigo} foi enviado com sucesso.`,
      });

      router.push(`/cardapio/pedido/${pedido.id}?codigo=${codigo}`);
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao finalizar pedido',
        description: error.message || 'Tente novamente em instantes.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-32 rounded-lg" />
        </div>
      </div>
    );
  }

  if (carrinho.length === 0 || !empresa) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
          <h2 className="text-xl font-semibold">Carrinho vazio</h2>
          <p className="text-muted-foreground mb-4">Adicione produtos ao carrinho para fazer o pedido.</p>
          <Button onClick={() => router.push(`/cardapio?empresa=${empresaId}`)}>Ver Cardápio</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold">Finalizar Pedido</h1>
            <p className="text-sm text-muted-foreground">{empresa.nome}</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Resumo do Pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumo do Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {carrinho.map((item, index) => (
                <div key={index} className="flex justify-between items-start text-sm">
                  <div>
                    <span className="font-medium">{item.quantidade}x</span> {item.produtoNome}
                    {item.variacoes && (
                      <span className="text-muted-foreground">
                        {' '}({item.variacoes.map(v => v.valor).join(', ')})
                      </span>
                    )}
                  </div>
                  <span className="font-medium">{formatCurrency(item.total)}</span>
                </div>
              ))}
            </div>
            <Separator className="my-4" />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between"><span>Taxa de entrega</span><span>{formatCurrency(taxaEntrega)}</span></div>
              <Separator />
              <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
          </CardContent>
        </Card>

        {/* Tipo de Pedido */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tipo de Pedido</CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup value={tipoPedido} onValueChange={(value: TipoPedido) => setTipoPedido(value)}>
              {empresa.delivery_ativo && (
                <div className="flex items-center space-x-3 p-3 border rounded-lg mb-2">
                  <RadioGroupItem value="delivery" id="delivery" />
                  <Label htmlFor="delivery" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Bike className="h-5 w-5 text-orange-500" />
                    <div>
                      <span className="font-medium">Entrega</span>
                      <p className="text-xs text-muted-foreground">
                        Receba em casa • {empresa.tempo_preparo_min}-{empresa.tempo_preparo_max} min
                      </p>
                    </div>
                  </Label>
                </div>
              )}
              {empresa.retirada_ativo && (
                <div className="flex items-center space-x-3 p-3 border rounded-lg">
                  <RadioGroupItem value="retirada" id="retirada" />
                  <Label htmlFor="retirada" className="flex items-center gap-2 cursor-pointer flex-1">
                    <Store className="h-5 w-5 text-blue-500" />
                    <div>
                      <span className="font-medium">Retirada</span>
                      <p className="text-xs text-muted-foreground">
                        Retire no local • Sem taxa de entrega
                      </p>
                    </div>
                  </Label>
                </div>
              )}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Dados do Cliente */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5" />
              Seus Dados
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input id="nome" value={clienteNome} onChange={(e) => setClienteNome(e.target.value)} placeholder="Seu nome completo" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="telefone">Telefone *</Label>
              <Input id="telefone" value={clienteTelefone} onChange={(e) => setClienteTelefone(e.target.value)} placeholder="(00) 00000-0000" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail (opcional)</Label>
              <Input id="email" type="email" value={clienteEmail} onChange={(e) => setClienteEmail(e.target.value)} placeholder="seu@email.com" />
            </div>
          </CardContent>
        </Card>

        {/* Endereço de Entrega */}
        {tipoPedido === 'delivery' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço de Entrega
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {enderecos.length > 0 && !mostrarNovoEndereco ? (
                <>
                  <RadioGroup value={enderecoSelecionado} onValueChange={setEnderecoSelecionado}>
                    {enderecos.map(end => (
                      <div key={end.id} className="flex items-start space-x-3 p-3 border rounded-lg mb-2">
                        <RadioGroupItem value={end.id} id={end.id} className="mt-1" />
                        <Label htmlFor={end.id} className="cursor-pointer flex-1">
                          <span className="font-medium">{end.apelido}</span>
                          <p className="text-sm text-muted-foreground">
                            {end.logradouro}, {end.numero}
                            {end.complemento && ` - ${end.complemento}`}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {end.bairro} - {end.cidade}/{end.estado}
                          </p>
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                  <Button variant="outline" className="w-full" onClick={() => setMostrarNovoEndereco(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar novo endereço
                  </Button>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="cep">CEP</Label>
                      <Input id="cep" value={novoEndereco.cep} onChange={(e) => setNovoEndereco(prev => ({ ...prev, cep: e.target.value }))} placeholder="00000-000" />
                    </div>
                    <div className="col-span-2 space-y-2">
                      <Label htmlFor="logradouro">Logradouro</Label>
                      <Input id="logradouro" value={novoEndereco.logradouro} onChange={(e) => setNovoEndereco(prev => ({ ...prev, logradouro: e.target.value }))} placeholder="Rua, Avenida..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="numero">Número</Label>
                      <Input id="numero" value={novoEndereco.numero} onChange={(e) => setNovoEndereco(prev => ({ ...prev, numero: e.target.value }))} placeholder="Nº" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="complemento">Complemento</Label>
                      <Input id="complemento" value={novoEndereco.complemento} onChange={(e) => setNovoEndereco(prev => ({ ...prev, complemento: e.target.value }))} placeholder="Apto, Bloco..." />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="bairro">Bairro</Label>
                      <Input id="bairro" value={novoEndereco.bairro} onChange={(e) => setNovoEndereco(prev => ({ ...prev, bairro: e.target.value }))} placeholder="Bairro" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="cidade">Cidade</Label>
                      <Input id="cidade" value={novoEndereco.cidade} onChange={(e) => setNovoEndereco(prev => ({ ...prev, cidade: e.target.value }))} placeholder="Cidade" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="estado">Estado</Label>
                      <Input id="estado" value={novoEndereco.estado} onChange={(e) => setNovoEndereco(prev => ({ ...prev, estado: e.target.value }))} placeholder="UF" maxLength={2} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="referencia">Ponto de Referência</Label>
                      <Input id="referencia" value={novoEndereco.pontoReferencia} onChange={(e) => setNovoEndereco(prev => ({ ...prev, pontoReferencia: e.target.value }))} placeholder="Próximo ao..." />
                    </div>
                  </div>
                  {enderecos.length > 0 && (
                    <Button variant="ghost" onClick={() => setMostrarNovoEndereco(false)}>
                      Usar endereço cadastrado
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Forma de Pagamento */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Forma de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <RadioGroup value={formaPagamento} onValueChange={setFormaPagamento}>
              {empresa.aceita_dinheiro && (
                <div className="flex items-center space-x-3 p-3 border rounded-lg mb-2">
                  <RadioGroupItem value="dinheiro" id="dinheiro" />
                  <Label htmlFor="dinheiro" className="cursor-pointer flex-1">Dinheiro</Label>
                </div>
              )}
              {empresa.aceita_pix && (
                <div className="flex items-center space-x-3 p-3 border rounded-lg mb-2">
                  <RadioGroupItem value="pix" id="pix" />
                  <Label htmlFor="pix" className="cursor-pointer flex-1">PIX</Label>
                </div>
              )}
              {empresa.aceita_cartao && (
                <>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg mb-2">
                    <RadioGroupItem value="cartao_debito" id="cartao_debito" />
                    <Label htmlFor="cartao_debito" className="cursor-pointer flex-1">Cartão de Débito (na entrega)</Label>
                  </div>
                  <div className="flex items-center space-x-3 p-3 border rounded-lg">
                    <RadioGroupItem value="cartao_credito" id="cartao_credito" />
                    <Label htmlFor="cartao_credito" className="cursor-pointer flex-1">Cartão de Crédito (na entrega)</Label>
                  </div>
                </>
              )}
            </RadioGroup>

            {formaPagamento === 'dinheiro' && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="space-y-2">
                  <Label htmlFor="trocoPara">Precisa de troco para?</Label>
                  <div className="flex items-center gap-2">
                    <span>R$</span>
                    <Input
                      id="trocoPara"
                      type="number"
                      value={trocoPara || ''}
                      onChange={(e) => setTrocoPara(parseFloat(e.target.value) || 0)}
                      placeholder="0,00"
                      className="max-w-32"
                    />
                  </div>
                  {trocoPara > total && (
                    <p className="text-sm text-green-600">
                      Troco: {formatCurrency(troco)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observações */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              placeholder="Alguma observação para o pedido? Ex: Sem cebola, apartamento 201..."
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Botão Finalizar */}
        <Button
          onClick={handleFinalizarPedido}
          disabled={submitting}
          className="w-full h-14 text-lg"
          size="lg"
        >
          {submitting ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Processando...
            </>
          ) : (
            <>
              <CheckCircle className="h-5 w-5 mr-2" />
              Confirmar Pedido - {formatCurrency(total)}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-6 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-32 rounded-lg" />
          <Skeleton className="h-48 rounded-lg" />
        </div>
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}
