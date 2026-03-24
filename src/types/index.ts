// User Types
export type UserRole = 'master' | 'admin' | 'funcionario';

export interface User {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  empresaId?: string;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Empresa Types
export type PlanoType = 'basico' | 'profissional' | 'premium';
export type StatusEmpresa = 'ativo' | 'inativo' | 'bloqueado';

export interface Empresa {
  id: string;
  nome: string;
  cnpj: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  telefone: string;
  email: string;
  plano: PlanoType;
  status: StatusEmpresa;
  validade: Date;
  configuracoes: {
    moeda: string;
    imposto: number;
    taxaServico: number;
  };
  criadoEm: Date;
  atualizadoEm: Date;
}

// Categoria Types
export interface Categoria {
  id: string;
  empresaId: string;
  nome: string;
  cor: string;
  ordem: number;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Produto Types
export type UnidadeMedida = 'un' | 'kg' | 'lt' | 'ml' | 'g' | 'mg';

export interface Produto {
  id: string;
  empresaId: string;
  categoriaId: string;
  nome: string;
  descricao: string;
  codigo: string;
  preco: number;
  custo: number;
  unidade: UnidadeMedida;
  foto?: string;
  estoqueAtual: number;
  estoqueMinimo: number;
  destaque: boolean;
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Mesa Types
export type StatusMesa = 'livre' | 'ocupada' | 'reservada' | 'manutencao';

export interface Mesa {
  id: string;
  empresaId: string;
  numero: number;
  capacidade: number;
  status: StatusMesa;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Funcionario Types
export interface Funcionario {
  id: string;
  empresaId: string;
  nome: string;
  cargo: string;
  email?: string; // Opcional - não precisa mais de email para login
  telefone?: string;
  pin: string; // PIN de 4-6 dígitos para login do funcionário
  permissoes: {
    pdv: boolean;
    estoque: boolean;
    financeiro: boolean;
    relatorios: boolean;
    cancelarVenda: boolean;
    darDesconto: boolean;
  };
  ativo: boolean;
  criadoEm: Date;
  atualizadoEm: Date;
}

// Estoque Types
export type TipoMovimento = 'entrada' | 'saida' | 'ajuste' | 'venda';

export interface EstoqueMovimento {
  id: string;
  empresaId: string;
  produtoId: string;
  tipo: TipoMovimento;
  quantidade: number;
  precoUnitario: number;
  observacao?: string;
  usuarioId: string;
  criadoEm: Date;
}

// Venda Types
export type StatusVenda = 'aberta' | 'fechada' | 'cancelada';
export type TipoVenda = 'mesa' | 'balcao' | 'delivery';
export type CanalVenda = 'balcao' | 'mesa' | 'delivery' | 'ifood' | 'rappi' | 'uber_eats' | 'whatsapp';
export type FormaPagamento = 'dinheiro' | 'cartao_credito' | 'cartao_debito' | 'pix' | 'voucher' | 'ifood_online';

export interface ItemVenda {
  id: string;
  vendaId: string;
  produtoId: string;
  quantidade: number;
  precoUnitario: number;
  desconto: number;
  observacao?: string;
  criadoEm: Date;
}

export interface Venda {
  id: string;
  empresaId: string;
  mesaId?: string;
  funcionarioId: string;
  tipo: TipoVenda;
  canal: CanalVenda;              // Canal de venda: balcao, mesa, ifood, rappi, etc.
  status: StatusVenda;
  subtotal: number;
  desconto: number;
  taxaServico: number;
  total: number;
  observacao?: string;
  
  // Campos para integração iFood/delivery
  pedidoExternoId?: string;       // ID do pedido na plataforma externa (iFood, Rappi, etc.)
  nomeCliente?: string;           // Nome do cliente para delivery
  telefoneCliente?: string;       // Telefone do cliente
  enderecoEntrega?: {             // Endereço de entrega para delivery
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
    referencia?: string;
  };
  taxaEntrega?: number;           // Taxa de entrega
  tempoEstimadoEntrega?: number;  // Tempo estimado em minutos
  
  criadoEm: Date;
  atualizadoEm: Date;
}

export interface Pagamento {
  id: string;
  empresaId: string;
  vendaId: string;
  formaPagamento: FormaPagamento;
  valor: number;
  troco: number;
  observacao?: string;
  criadoEm: Date;
}

// Dashboard Types
export interface DashboardStats {
  vendasHoje: number;
  vendasMes: number;
  pedidosHoje: number;
  ticketMedio: number;
  produtosMaisVendidos: { produtoId: string; quantidade: number }[];
  vendasPorDia: { data: string; valor: number }[];
}

// Form Types for validation
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RecuperarSenhaFormData {
  email: string;
}

export interface EmpresaFormData {
  nome: string;
  cnpj: string;
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    cidade: string;
    estado: string;
    cep: string;
  };
  telefone: string;
  email: string;
  plano: PlanoType;
  validade: string;
}

export interface ProdutoFormData {
  nome: string;
  descricao: string;
  codigo: string;
  categoriaId: string;
  preco: number;
  custo: number;
  unidade: UnidadeMedida;
  foto?: string;
  estoqueMinimo: number;
  destaque: boolean;
  ativo: boolean;
}

export interface CategoriaFormData {
  nome: string;
  cor: string;
}

export interface MesaFormData {
  numero: number;
  capacidade: number;
  status: StatusMesa;
}

export interface FuncionarioFormData {
  nome: string;
  cargo: string;
  email: string;
  telefone: string;
  password?: string;
  permissoes: {
    pdv: boolean;
    estoque: boolean;
    financeiro: boolean;
    relatorios: boolean;
    cancelarVenda: boolean;
    darDesconto: boolean;
  };
  ativo: boolean;
}
