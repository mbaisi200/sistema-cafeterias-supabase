'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Trophy, TrendingUp, DollarSign, PiggyBank, ArrowUpRight, ArrowDownRight, BarChart3 } from 'lucide-react';
import { ProdutoVendido, ProdutoLucroBruto } from '@/types/bi';
import { motion } from 'framer-motion';

interface ProdutosMaisVendidosProps {
  dados: ProdutoVendido[];
  categorias: { id: string; nome: string }[];
}

export function ProdutosMaisVendidos({ dados, categorias }: ProdutosMaisVendidosProps) {
  const maxValor = Math.max(...dados.map(p => p.valorTotal), 1);
  const medalhas = ['🥇', '🥈', '🥉'];

  const getNomeCategoria = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || 'Outros';
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Produtos Mais Vendidos
              </CardTitle>
              <CardDescription>Top 10 por faturamento</CardDescription>
            </div>
            <Badge variant="secondary">{dados.length} produtos</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Valor Total</TableHead>
                  <TableHead className="w-32">% Vendas</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {dados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível para o período selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  dados.map((produto, index) => (
                    <TableRow key={produto.id} className="group hover:bg-muted/50">
                      <TableCell className="font-medium">
                        {index < 3 ? <span className="text-lg">{medalhas[index]}</span> : <span className="text-muted-foreground">{index + 1}</span>}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium group-hover:text-primary transition-colors">{produto.nome}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{getNomeCategoria(produto.categoriaId)}</Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">{produto.quantidadeTotal}</TableCell>
                      <TableCell className="text-right font-medium text-emerald-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(produto.valorTotal)}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <Progress value={(produto.valorTotal / maxValor) * 100} className="h-2" />
                          <span className="text-xs text-muted-foreground">{produto.percentualVendas.toFixed(1)}%</span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface VendasPorOperadorProps {
  dados: { operador: string; valor: number; quantidade: number; ticketMedio: number }[];
}

export function VendasPorOperador({ dados }: VendasPorOperadorProps) {
  const maxValor = Math.max(...dados.map(o => o.valor), 1);

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-blue-500" />
            Performance por Operador
          </CardTitle>
          <CardDescription>Vendas por funcionário</CardDescription>
        </CardHeader>
        <CardContent>
          {dados.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Nenhum dado disponível
            </div>
          ) : (
            <div className="space-y-4">
              {dados.map((operador, index) => (
                <div key={operador.operador} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium">{operador.operador}</p>
                        <p className="text-sm text-muted-foreground">
                          {operador.quantidade} vendas • Ticket: {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(operador.ticketMedio)}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-emerald-600">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(operador.valor)}
                    </p>
                  </div>
                  <Progress value={(operador.valor / maxValor) * 100} className="h-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface FluxoCaixaResumoProps {
  dados: {
    entradas: number;
    saidas: number;
    saldo: number;
    porForma: Record<string, { entradas: number; saidas: number; saldo: number }>;
  };
}

export function FluxoCaixaResumo({ dados }: FluxoCaixaResumoProps) {
  const saldoPositivo = dados.saldo >= 0;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            Fluxo de Caixa
          </CardTitle>
          <CardDescription>Resumo financeiro</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="text-center p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
              <p className="text-xs text-muted-foreground">Entradas</p>
              <p className="text-lg font-bold text-emerald-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.entradas)}
              </p>
            </div>
            <div className="text-center p-3 rounded-lg bg-red-50 dark:bg-red-950/30">
              <p className="text-xs text-muted-foreground">Saídas</p>
              <p className="text-lg font-bold text-red-600">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.saidas)}
              </p>
            </div>
            <div className={`text-center p-3 rounded-lg ${saldoPositivo ? 'bg-blue-50 dark:bg-blue-950/30' : 'bg-orange-50 dark:bg-orange-950/30'}`}>
              <p className="text-xs text-muted-foreground">Saldo</p>
              <p className={`text-lg font-bold ${saldoPositivo ? 'text-blue-600' : 'text-orange-600'}`}>
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(dados.saldo)}
              </p>
            </div>
          </div>
          {Object.keys(dados.porForma).length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Por Forma de Pagamento</p>
              {Object.entries(dados.porForma).map(([forma, valores]) => (
                <div key={forma} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                  <span className="font-medium text-sm">{forma}</span>
                  <p className={`font-bold text-sm ${valores.saldo >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valores.saldo)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}

interface LucroBrutoPorProdutoProps {
  dados: ProdutoLucroBruto[];
  resumo: {
    receitaTotal: number;
    custoTotal: number;
    lucroBrutoTotal: number;
    margemMedia: number;
  };
  categorias: { id: string; nome: string }[];
}

export function LucroBrutoPorProduto({ dados, resumo, categorias }: LucroBrutoPorProdutoProps) {
  const maxLucro = Math.max(...dados.map(p => p.lucroBruto), 1);
  const topProdutos = dados.slice(0, 15);

  const getNomeCategoria = (categoriaId: string) => {
    const cat = categorias.find(c => c.id === categoriaId);
    return cat?.nome || 'Outros';
  };

  const formatarMoeda = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
      <Card className="border-2 border-primary/10 hover:shadow-lg transition-shadow">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <PiggyBank className="h-5 w-5 text-emerald-500" />
                Análise de Lucro Bruto por Produto
              </CardTitle>
              <CardDescription>Receita, custo e margem de lucro</CardDescription>
            </div>
            <Badge variant="secondary">{dados.length} produtos</Badge>
          </div>
        </CardHeader>
        <CardContent>
          {/* Resumo */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/30 dark:to-blue-900/30 border border-blue-200 dark:border-blue-800">
              <BarChart3 className="h-5 w-5 mx-auto mb-2 text-blue-600" />
              <p className="text-xs text-muted-foreground mb-1">Receita Total</p>
              <p className="text-lg font-bold text-blue-600">{formatarMoeda(resumo.receitaTotal)}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/30 dark:to-orange-900/30 border border-orange-200 dark:border-orange-800">
              <TrendingUp className="h-5 w-5 mx-auto mb-2 text-orange-600" />
              <p className="text-xs text-muted-foreground mb-1">Custo Total</p>
              <p className="text-lg font-bold text-orange-600">{formatarMoeda(resumo.custoTotal)}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 border border-emerald-200 dark:border-emerald-800">
              <PiggyBank className="h-5 w-5 mx-auto mb-2 text-emerald-600" />
              <p className="text-xs text-muted-foreground mb-1">Lucro Bruto</p>
              <p className="text-lg font-bold text-emerald-600">{formatarMoeda(resumo.lucroBrutoTotal)}</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-gradient-to-br from-violet-50 to-violet-100 dark:from-violet-950/30 dark:to-violet-900/30 border border-violet-200 dark:border-violet-800">
              <DollarSign className="h-5 w-5 mx-auto mb-2 text-violet-600" />
              <p className="text-xs text-muted-foreground mb-1">Margem Média</p>
              <p className="text-lg font-bold text-violet-600">{resumo.margemMedia.toFixed(1)}%</p>
            </div>
          </div>

          {/* Tabela */}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="text-right">Qtd.</TableHead>
                  <TableHead className="text-right">Receita</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Lucro Bruto</TableHead>
                  <TableHead className="text-right">Margem</TableHead>
                  <TableHead className="w-24">Barra</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {topProdutos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Nenhum dado disponível para o período selecionado
                    </TableCell>
                  </TableRow>
                ) : (
                  topProdutos.map((produto, index) => {
                    const lucroPositivo = produto.lucroBruto >= 0;
                    const margemClass = produto.margemLucro >= 50 ? 'text-emerald-600' : 
                                       produto.margemLucro >= 30 ? 'text-blue-600' : 
                                       produto.margemLucro >= 10 ? 'text-amber-600' : 'text-red-600';
                    
                    return (
                      <TableRow key={produto.id} className="group hover:bg-muted/50">
                        <TableCell className="font-medium">
                          {index < 3 ? (
                            <span className="text-lg">{['🥇', '🥈', '🥉'][index]}</span>
                          ) : (
                            <span className="text-muted-foreground">{index + 1}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium group-hover:text-primary transition-colors">
                            {produto.nome}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            Pç: {formatarMoeda(produto.precoUnitario)} • Custo: {formatarMoeda(produto.custoUnitario)}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{getNomeCategoria(produto.categoriaId)}</Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">{produto.quantidadeVendida}</TableCell>
                        <TableCell className="text-right font-medium text-blue-600">
                          {formatarMoeda(produto.receitaTotal)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-orange-600">
                          {formatarMoeda(produto.custoTotal)}
                        </TableCell>
                        <TableCell className="text-right font-bold">
                          <span className={lucroPositivo ? 'text-emerald-600' : 'text-red-600'}>
                            {lucroPositivo ? '+' : ''}{formatarMoeda(produto.lucroBruto)}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {lucroPositivo ? (
                              <ArrowUpRight className="h-4 w-4 text-emerald-500" />
                            ) : (
                              <ArrowDownRight className="h-4 w-4 text-red-500" />
                            )}
                            <span className={`font-bold ${margemClass}`}>
                              {produto.margemLucro.toFixed(1)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Progress 
                            value={Math.max(0, (produto.lucroBruto / maxLucro) * 100)} 
                            className="h-2"
                          />
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* Legenda */}
          <div className="mt-4 flex flex-wrap gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-emerald-500"></div>
              <span>Margem ≥ 50% (Excelente)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-blue-500"></div>
              <span>Margem 30-50% (Boa)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-amber-500"></div>
              <span>Margem 10-30% (Regular)</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded bg-red-500"></div>
              <span>Margem &lt; 10% (Baixa)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
