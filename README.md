# Sistema de Gestão - Cafeterias e Restaurantes

Sistema SaaS completo para gestão de cafeterias e restaurantes com PDV touch, controle de estoque, financeiro e muito mais.

## 🛠️ Tecnologias

- **Next.js 16** - Framework React com App Router
- **TypeScript** - Tipagem estática
- **Tailwind CSS 4** - Estilização com classes utilitárias
- **Supabase** - Backend as a Service (Auth + Database)
- **shadcn/ui** - Componentes UI baseados em Radix UI
- **Framer Motion** - Animações
- **next-themes** - Suporte a tema claro/escuro

## 📁 Estrutura do Projeto

```
src/
├── app/                      # Rotas (App Router)
│   ├── admin/               # Páginas administrativas
│   │   ├── dashboard/       # Dashboard principal
│   │   ├── caixa/          # Gestão de caixa
│   │   ├── produtos/        # Cadastro de produtos
│   │   ├── estoque/         # Controle de estoque
│   │   ├── financeiro/      # Módulo financeiro
│   │   ├── cadastros/       # Cadastros gerais
│   │   ├── nfe/            # Emissão de NF-e
│   │   ├── os-lavanderia/   # Ordem de serviço lavanderia
│   │   └── configuracoes/   # Configurações
│   ├── pdv/                 # Ponto de Venda
│   │   └── page.tsx         # PDV Restaurante
│   ├── pdv-varejo/         # PDV Varejo
│   ├── api/                 # API Routes
│   │   ├── clientes/       # CRUD de clientes
│   │   ├── produtos/        # CRUD de produtos
│   │   ├── vendas/         # Operações de venda
│   │   ├── caixa/          # Gestão de caixa
│   │   ├── fetch-user/     # Busca dados do usuário
│   │   └── os-lavanderia/  # API específica OS
│   ├── login/              # Página de login
│   ├── globals.css         # Estilos globais + tema
│   └── layout.tsx          # Layout raiz
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx   # Layout com sidebar (novo)
│   │   ├── AppSidebar.tsx  # Sidebar com navegação
│   │   └── MainLayout.tsx  # Wrapper do layout
│   ├── pdv/               # Componentes do PDV
│   │   ├── BuscaCliente.tsx  # Busca de clientes
│   │   ├── SelecionarProdutos.tsx
│   │   └── CupomFiscal.tsx
│   └── ui/                # Componentes shadcn/ui
├── contexts/
│   └── AuthContext.tsx     # Context de autenticação
├── hooks/                  # Custom hooks
├── lib/
│   └── supabase/           # Cliente Supabase
│       ├── client.ts       # Cliente browser
│       └── server.ts       # Cliente server
└── types/                  # Definições de tipos
```

## 🎨 Tema Visual

### Tema Claro
- **Cores principais:** Purple (#8A2BE2), Cyan (#00F2FE)
- **Background:** Gradiente suave de branco para cinza

### Tema Escuro (Futurista)
- **Background:** Gradiente escuro (#121212 → #1a1a2e → #16213e)
- **Sidebar:** Glassmorphism com blur
- **Glow effects:** Cyan e Purple para bordas e sombras

### Classes CSS Disponíveis
```css
.glass           /* Efeito glass para cards */
.glass-light     /* Glass para modo claro */
.glass-dark      /* Glass para modo escuro */
.glass-sidebar   /* Glass para sidebar */
.btn-gradient    /* Botão com gradiente cyan→purple */
.glow-cyan       /* Brilho cyan */
.glow-purple     /* Brilho purple */
```

## 🔐 Autenticação

- **Provedor:** Supabase Auth
- **Roles:** master, admin, funcionario
- **Context:** `useAuth()` hook em `src/contexts/AuthContext.tsx`
- **Cache:** Dados do usuário são cacheados para evitar chamadas duplicadas

```typescript
const { user, empresaId, role, nomeMarca, logout } = useAuth();
```

## 📊 Banco de Dados (Supabase)

### Tabelas Principais
- `usuarios` - Usuários do sistema
- `empresas` - Empresas/negócios
- `produtos` - Catálogo de produtos
- `categorias` - Categorias de produtos
- `clientes` - Cadastro de clientes
- `vendas` - Vendas realizadas
- `itens_venda` - Itens das vendas
- `caixas` - Registros de caixa
- `ordens_servico` - OS (ex: lavanderia)
- `nfe` - Notas fiscais eletrônicas

## 🚀 Scripts

```bash
# Instalar dependências
npm install

# Desenvolvimento
bun run dev

# Build produção
bun run build

# Iniciar produção
bun start
```

## 📝 Convenções de Código

### Nomenclatura
- Componentes: PascalCase (ex: `BuscaCliente.tsx`)
- Funções/Variáveis: camelCase
- Arquivos de API: kebab-case (ex: `fetch-user/route.ts`)

### API Routes
- GET para listar/buscar
- POST para criar
- PUT para atualizar
- DELETE para deletar (soft delete quando possível)

### Resposta de API
```typescript
// Sucesso
return NextResponse.json({ sucesso: true, data: ... });

// Erro
return NextResponse.json({
  sucesso: false,
  erro: { codigo: 'ERRO_001', mensagem: 'Descrição' }
}, { status: 400 });
```

## 🔧 Configuração

### Variáveis de Ambiente (.env)
```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

## 📱 Módulos do Sistema

1. **Dashboard** - Visão geral com métricas
2. **PDV** - Ponto de venda touch
3. **Caixa** - Gestão de caixa
4. **Produtos** - Catálogo e preços
5. **Estoque** - Controle de inventário
6. **Financeiro** - Fluxo de caixa e relatórios
7. **Cadastros** - Clientes, fornecedores, etc
8. **NF-e** - Emissão de notas fiscais
9. **OS Lavanderia** - Ordem de serviço específica
10. **Configurações** - Ajustes do sistema
