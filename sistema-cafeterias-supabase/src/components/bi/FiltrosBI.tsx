'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { Filter, CalendarIcon, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
import { FiltrosBI } from '@/types/bi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useIsMobile } from '@/hooks/use-mobile';

interface FiltrosBIProps {
  filtros: FiltrosBI;
  periodoFormatado: string;
  opcoesFiltros: {
    categorias: { valor: string; label: string }[];
    formasPagamento: { valor: string; label: string }[];
    tiposVenda: { valor: string; label: string }[];
    produtos: { valor: string; label: string }[];
  };
  onAtualizarFiltros: (filtros: Partial<FiltrosBI>) => void;
  onResetarFiltros: () => void;
}

const periodos = [
  { valor: 'hoje', label: 'Hoje' },
  { valor: 'ontem', label: 'Ontem' },
  { valor: 'semana', label: 'Esta Semana' },
  { valor: 'mes', label: 'Este Mês' },
  { valor: 'trimestre', label: 'Este Trimestre' },
  { valor: 'ano', label: 'Este Ano' },
  { valor: 'personalizado', label: 'Personalizado' }
];

function MultiSelect({ titulo, opcoes, valores, onChange }: { titulo: string; opcoes: { valor: string; label: string }[]; valores: string[]; onChange: (valores: string[]) => void }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">{titulo}</Label>
      <div className="max-h-32 overflow-y-auto space-y-2 pr-2">
        {opcoes.map((opcao) => (
          <div key={opcao.valor} className="flex items-center space-x-2">
            <Checkbox id={opcao.valor} checked={valores.includes(opcao.valor)} onCheckedChange={(checked) => { onChange(checked ? [...valores, opcao.valor] : valores.filter((v) => v !== opcao.valor)); }} />
            <Label htmlFor={opcao.valor} className="text-sm cursor-pointer">{opcao.label}</Label>
          </div>
        ))}
      </div>
    </div>
  );
}

function FiltrosContent({ filtros, opcoesFiltros, onAtualizarFiltros, onResetarFiltros }: { filtros: FiltrosBI; opcoesFiltros: FiltrosBIProps['opcoesFiltros']; onAtualizarFiltros: FiltrosBIProps['onAtualizarFiltros']; onResetarFiltros: FiltrosBIProps['onResetarFiltros'] }) {
  const filtrosAtivos = [...filtros.categorias, ...filtros.formasPagamento, ...filtros.tiposVenda, ...filtros.produtos].length;

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <Label className="text-sm font-medium">Período</Label>
        <Select value={filtros.periodo} onValueChange={(valor) => { onAtualizarFiltros({ periodo: valor as FiltrosBI['periodo'] }); }}>
          <SelectTrigger><SelectValue placeholder="Selecione o período" /></SelectTrigger>
          <SelectContent>
            {periodos.map((p) => (<SelectItem key={p.valor} value={p.valor}>{p.label}</SelectItem>))}
          </SelectContent>
        </Select>
        {filtros.periodo === 'personalizado' && (
          <div className="flex gap-2">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtros.dataInicio ? format(filtros.dataInicio, 'dd/MM/yy') : 'Início'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filtros.dataInicio} onSelect={(date) => onAtualizarFiltros({ dataInicio: date })} initialFocus />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="flex-1 justify-start text-left">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {filtros.dataFim ? format(filtros.dataFim, 'dd/MM/yy') : 'Fim'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={filtros.dataFim} onSelect={(date) => onAtualizarFiltros({ dataFim: date })} initialFocus />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>
      <Separator />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <MultiSelect titulo="Categorias" opcoes={opcoesFiltros.categorias} valores={filtros.categorias} onChange={(valores) => onAtualizarFiltros({ categorias: valores })} />
        <MultiSelect titulo="Forma de Pagamento" opcoes={opcoesFiltros.formasPagamento} valores={filtros.formasPagamento} onChange={(valores) => onAtualizarFiltros({ formasPagamento: valores })} />
        <MultiSelect titulo="Tipo de Venda" opcoes={opcoesFiltros.tiposVenda} valores={filtros.tiposVenda} onChange={(valores) => onAtualizarFiltros({ tiposVenda: valores })} />
        <MultiSelect titulo="Produtos" opcoes={opcoesFiltros.produtos} valores={filtros.produtos} onChange={(valores) => onAtualizarFiltros({ produtos: valores })} />
      </div>
      <Separator />
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-muted-foreground">
          {filtrosAtivos > 0 && <Badge variant="secondary">{filtrosAtivos} filtro{filtrosAtivos > 1 ? 's' : ''} ativo{filtrosAtivos > 1 ? 's' : ''}</Badge>}
        </div>
        <Button variant="outline" size="sm" onClick={onResetarFiltros}>
          <RotateCcw className="h-4 w-4 mr-2" />Limpar
        </Button>
      </div>
    </div>
  );
}

export function FiltrosBI({ filtros, periodoFormatado, opcoesFiltros, onAtualizarFiltros, onResetarFiltros }: FiltrosBIProps) {
  const isMobile = useIsMobile();
  const filtrosAtivos = [...filtros.categorias, ...filtros.formasPagamento, ...filtros.tiposVenda, ...filtros.produtos].length;

  if (isMobile) {
    return (
      <Card className="border-2 border-primary/20">
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Período</p>
              <p className="font-medium text-sm truncate">{periodoFormatado}</p>
            </div>
            <Drawer>
              <DrawerTrigger asChild>
                <Button variant="outline" size="sm" className="relative">
                  <SlidersHorizontal className="h-4 w-4 mr-2" />Filtros
                  {filtrosAtivos > 0 && <Badge className="absolute -top-2 -right-2 h-5 w-5 p-0 flex items-center justify-center">{filtrosAtivos}</Badge>}
                </Button>
              </DrawerTrigger>
              <DrawerContent>
                <DrawerHeader><DrawerTitle>Filtros</DrawerTitle></DrawerHeader>
                <div className="p-4 max-h-[70vh] overflow-y-auto">
                  <FiltrosContent filtros={filtros} opcoesFiltros={opcoesFiltros} onAtualizarFiltros={onAtualizarFiltros} onResetarFiltros={onResetarFiltros} />
                </div>
              </DrawerContent>
            </Drawer>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2"><Filter className="h-5 w-5" />Filtros</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{periodoFormatado}</p>
          </div>
          {filtrosAtivos > 0 && (
            <Button variant="ghost" size="sm" onClick={onResetarFiltros}>
              <X className="h-4 w-4 mr-2" />Limpar filtros
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <FiltrosContent filtros={filtros} opcoesFiltros={opcoesFiltros} onAtualizarFiltros={onAtualizarFiltros} onResetarFiltros={onResetarFiltros} />
      </CardContent>
    </Card>
  );
}
