'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, User, MapPin } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ClienteEncontrado } from './BuscaCliente';

interface NovoClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClienteCadastrado: (cliente: ClienteEncontrado) => void;
}

const mascaraCEP = (valor: string) => valor.replace(/\D/g, '').replace(/(\d{5})(\d{0,3})/, '$1-$2');
const mascaraCPF = (valor: string) => {
  const nums = valor.replace(/\D/g, '');
  if (nums.length <= 3) return nums;
  if (nums.length <= 6) return `${nums.slice(0, 3)}.${nums.slice(3)}`;
  if (nums.length <= 9) return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6)}`;
  return `${nums.slice(0, 3)}.${nums.slice(3, 6)}.${nums.slice(6, 9)}-${nums.slice(9, 11)}`;
};
const mascaraFone = (valor: string) => {
  const nums = valor.replace(/\D/g, '');
  if (nums.length <= 2) return `(${nums}`;
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`;
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7, 11)}`;
};

export function NovoClienteDialog({ open, onOpenChange, onClienteCadastrado }: NovoClienteDialogProps) {
  const { toast } = useToast();
  const cepTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [cep, setCep] = useState('');
  const [buscandoCEP, setBuscandoCEP] = useState(false);
  const [logradouro, setLogradouro] = useState('');
  const [numero, setNumero] = useState('');
  const [complemento, setComplemento] = useState('');
  const [bairro, setBairro] = useState('');
  const [municipio, setMunicipio] = useState('');
  const [uf, setUf] = useState('');
  const [codigoMunicipio, setCodigoMunicipio] = useState('');
  const [cpfCnpj, setCpfCnpj] = useState('');
  const [nomeRazao, setNomeRazao] = useState('');
  const [telefone, setTelefone] = useState('');
  const [email, setEmail] = useState('');
  const [salvando, setSalvando] = useState(false);

  // Resetar formulário ao abrir
  useEffect(() => {
    if (open) {
      setCep('');
      setBuscandoCEP(false);
      setLogradouro('');
      setNumero('');
      setComplemento('');
      setBairro('');
      setMunicipio('');
      setUf('');
      setCodigoMunicipio('');
      setCpfCnpj('');
      setNomeRazao('');
      setTelefone('');
      setEmail('');
      setSalvando(false);
    }
  }, [open]);

  // Limpar timer ao desmontar
  useEffect(() => {
    return () => {
      if (cepTimerRef.current) clearTimeout(cepTimerRef.current);
    };
  }, []);

  const buscarCEP = async (cepLimpo: string) => {
    if (cepLimpo.length !== 8) return;
    setBuscandoCEP(true);
    try {
      const res = await fetch(`/api/cep/${cepLimpo}`);
      const data = await res.json();
      if (!data.sucesso) {
        toast({ variant: 'destructive', title: data.erro?.mensagem || 'CEP não encontrado' });
        return;
      }
      setLogradouro(data.logradouro || '');
      setComplemento(data.complemento || '');
      setBairro(data.bairro || '');
      setMunicipio(data.localidade || '');
      setUf(data.uf || '');
      setCodigoMunicipio(data.ibge || '');
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar CEP. Verifique sua conexão.' });
    } finally {
      setBuscandoCEP(false);
    }
  };

  const handleCepChange = (value: string) => {
    const masked = mascaraCEP(value);
    setCep(masked);

    if (cepTimerRef.current) clearTimeout(cepTimerRef.current);
    const cepLimpo = masked.replace(/\D/g, '');
    if (cepLimpo.length === 8) {
      cepTimerRef.current = setTimeout(() => buscarCEP(cepLimpo), 500);
    }
  };

  const handleSalvar = async () => {
    const cpfLimpo = cpfCnpj.replace(/\D/g, '');
    if (!nomeRazao.trim()) {
      toast({ variant: 'destructive', title: 'Nome/Razão Social é obrigatório' });
      return;
    }
    if (cpfLimpo.length !== 11 && cpfLimpo.length !== 14) {
      toast({ variant: 'destructive', title: 'CPF ou CNPJ inválido' });
      return;
    }

    setSalvando(true);
    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo_pessoa: cpfLimpo.length === 14 ? '1' : '2',
          cnpj_cpf: cpfLimpo,
          nome_razao_social: nomeRazao.trim(),
          logradouro,
          numero,
          complemento,
          bairro,
          municipio,
          uf,
          cep,
          codigo_municipio: codigoMunicipio,
          telefone: telefone.replace(/\D/g, ''),
          email,
        }),
      });
      const data = await res.json();
      if (!data.sucesso) {
        toast({ variant: 'destructive', title: data.erro?.mensagem || 'Erro ao cadastrar' });
        return;
      }
      const c: ClienteEncontrado = {
        id: data.cliente.id,
        tipo_pessoa: data.cliente.tipo_pessoa,
        cnpj_cpf: data.cliente.cnpj_cpf,
        nome_razao_social: data.cliente.nome_razao_social,
        nome_fantasia: data.cliente.nome_fantasia || undefined,
        email: data.cliente.email || undefined,
        telefone: data.cliente.telefone || undefined,
        celular: data.cliente.celular || undefined,
        logradouro: data.cliente.logradouro || '',
        numero: data.cliente.numero || '',
        complemento: data.cliente.complemento || undefined,
        bairro: data.cliente.bairro || '',
        codigo_municipio: data.cliente.codigo_municipio || '',
        municipio: data.cliente.municipio || '',
        uf: data.cliente.uf || '',
        cep: data.cliente.cep || '',
      };
      toast({ title: 'Cliente cadastrado com sucesso!' });
      onClienteCadastrado(c);
      onOpenChange(false);
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao cadastrar cliente' });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-blue-600" />
            Cadastrar Novo Cliente
          </DialogTitle>
          <DialogDescription>
            Preencha os dados para cadastrar um novo cliente
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* CEP - primeiro campo */}
          <div>
            <Label className="flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5" />
              CEP *
            </Label>
            <div className="relative">
              <Input
                value={cep}
                onChange={(e) => handleCepChange(e.target.value)}
                placeholder="00000-000"
                maxLength={9}
                className="text-lg font-mono"
              />
              {buscandoCEP && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>
          </div>

          {/* Logradouro + Número */}
          <div className="grid grid-cols-[1fr_100px] gap-3">
            <div>
              <Label>Logradouro *</Label>
              <Input value={logradouro} onChange={(e) => setLogradouro(e.target.value)} placeholder="Rua, Av, etc." />
            </div>
            <div>
              <Label>Número *</Label>
              <Input value={numero} onChange={(e) => setNumero(e.target.value)} placeholder="S/N" />
            </div>
          </div>

          {/* Complemento + Bairro */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Complemento</Label>
              <Input value={complemento} onChange={(e) => setComplemento(e.target.value)} placeholder="Apto, Bloco, etc" />
            </div>
            <div>
              <Label>Bairro *</Label>
              <Input value={bairro} onChange={(e) => setBairro(e.target.value)} />
            </div>
          </div>

          {/* Município + UF */}
          <div className="grid grid-cols-[1fr_80px] gap-3">
            <div>
              <Label>Município *</Label>
              <Input value={municipio} onChange={(e) => setMunicipio(e.target.value)} />
            </div>
            <div>
              <Label>UF *</Label>
              <Select value={uf} onValueChange={setUf}>
                <SelectTrigger><SelectValue placeholder="UF" /></SelectTrigger>
                <SelectContent>
                  {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-3">Dados do cliente</p>

            {/* CPF/CNPJ + Nome */}
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <div>
                <Label>CPF/CNPJ *</Label>
                <Input
                  value={cpfCnpj}
                  onChange={(e) => setCpfCnpj(mascaraCPF(e.target.value))}
                  placeholder="000.000.000-00"
                  maxLength={14}
                  className="font-mono"
                />
              </div>
              <div>
                <Label>Nome / Razão Social *</Label>
                <Input value={nomeRazao} onChange={(e) => setNomeRazao(e.target.value)} placeholder="Nome completo" />
              </div>
            </div>

            {/* Telefone + Email */}
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <Label>Telefone</Label>
                <Input value={telefone} onChange={(e) => setTelefone(mascaraFone(e.target.value))} placeholder="(00) 00000-0000" />
              </div>
              <div>
                <Label>E-mail</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemplo.com" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSalvar} disabled={salvando || !nomeRazao.trim()} className="min-w-[120px]">
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {salvando ? 'Salvando...' : 'Cadastrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
