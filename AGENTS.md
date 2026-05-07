# Sistema de Gestão - Cafeterias e Restaurantes

> **Contexto para Agentes IA:** Este arquivo contém toda informação necessária para entender, navegar e modificar o projeto.

---

## 🛠️ Stack Tecnológico

| Tecnologia | Versão | Uso |
|---|---|---|
| **Next.js** | 16.2.3 | Framework com App Router, Turbopack |
| **TypeScript** | - | Tipagem estática |
| **Tailwind CSS** | 4 | Estilização utilitária |
| **Supabase** | - | Auth + Database (PostgreSQL) |
| **shadcn/ui** | - | Componentes UI (Radix UI base) |
| **Framer Motion** | - | Animações |
| **next-themes** | - | Tema claro/escuro |
| **lucide-react** | - | Ícones |

---

## 📁 Estrutura de Pastas

```
src/
├── app/                          # Rotas (App Router)
│   ├── admin/                    # Páginas administrativas (role: admin)
│   │   ├── dashboard/            # Dashboard com KPIs
│   │   ├── cadastros/            # Clientes, fornecedores, funcionários
│   │   ├── categorias/           # Categorias de produtos
│   │   ├── clientes/             # CRUD clientes
│   │   ├── caixa/                # Gestão de caixa (abertura/fechamento)
│   │   ├── configuracoes/        # Configurações gerais
│   │   ├── cupons-nfes/          # Cupons fiscais / NF-e
│   │   ├── delivery/             # Configuração delivery
│   │   ├── dispositivos/         # Dispositivos autorizados
│   │   ├── estoque/              # Controle de inventário
│   │   ├── financeiro/           # Fluxo de caixa, contas a pagar/receber
│   │   ├── funcionarios/         # Gestão de funcionários
│   │   ├── integracoes/          # Integrações (iFood, etc)
│   │   ├── logs/                 # Logs de atividades
│   │   ├── mesas/                # Gestão de mesas
│   │   ├── nfe/                  # Emissão e importação de NF-e
│   │   │   └── importar/         # Importar XML de NF-e de entrada
│   │   ├── ordens-servico/       # OS (lavanderia)
│   │   └── produtos/             # Catálogo de produtos
│   ├── api/                      # API Routes (Server Actions)
│   │   ├── clientes/             # CRUD clientes
│   │   ├── produtos/             # CRUD produtos
│   │   ├── vendas/               # Operações de venda
│   │   ├── caixa/                # Gestão de caixa
│   │   ├── nfe/importar/         # Importação de NF-e
│   │   ├── os-lavanderia/        # OS lavanderia + exclusão em cascata
│   │   ├── setup/                # Setup inicial do sistema
│   │   └── webhooks/             # Webhooks (iFood)
│   ├── cardapio/                 # Cardápio online (público)
│   ├── login/                    # Página de login
│   ├── master/                   # Painel Master (super admin)
│   ├── pdv/                      # PDV Restaurante (balcão/mesa/comanda/delivery)
│   ├── pdv-garcom/               # PDV mobile para garçons
│   ├── pdv-varejo/               # PDV varejo (sem mesas)
│   ├── recuperar-senha/          # Recuperação de senha
│   ├── setup/                    # Setup inicial
│   ├── globals.css               # Temas + utilitários CSS
│   └── layout.tsx                # Layout raiz + ThemeProvider
├── components/
│   ├── auth/                     # ProtectedRoute, LoginForm
│   ├── layout/                   # AppSidebar, MainLayout
│   ├── pdv/                      # BuscaCliente, CupomFiscal
│   └── ui/                       # Componentes shadcn/ui (button, card, dialog, etc)
├── contexts/
│   └── AuthContext.tsx           # Auth com cache em memória
├── hooks/                        # Custom hooks (useProdutos, useCategorias, etc)
├── lib/
│   ├── supabase/                 # Cliente Supabase (client + server)
│   └── nfe-parser.ts             # Parser de XML de NF-e
└── types/                        # Definições de TypeScript
```

---

## 🔐 Autenticação

### Provedor: Supabase Auth

### Roles
| Role | Descrição |
|---|---|
| `master` | Super admin (acesso a `/master/*`) |
| `admin` | Administrador da empresa (acesso a `/admin/*` e PDV) |
| `funcionario` | Funcionário (acesso apenas ao PDV) |

### AuthContext
```typescript
const {
  user,              // Dados do usuário (nome, email, etc)
  empresaId,         // ID da empresa vinculada
  role,              // 'master' | 'admin' | 'funcionario'
  secoesPermitidas,  // Array de seções permitidas
  nomeMarca,         // Nome da marca/empresa
  loading,           // Carregando auth
  isConfigured,      // Supabase configurado
  login,             // Login por email/senha
  loginFuncionario,  // Login por código empresa + PIN
  logout,
  resetPassword,
  refreshUser,
} = useAuth();
```

### Cache
- **userCache**: `Map<string, User>` — evita chamadas duplicadas para `/api/fetch-user`
- **fetchingRef**: `Set<string>` — evita requisições concorrentes para o mesmo usuário

### Funcionário (PIN)
- Sessão armazenada em `localStorage` (`funcionario_session`)
- Login rápido por código da empresa + PIN numérico

---

## 🎨 Tema Visual

### Tema Claro
- **Background:** Branco/cinza suave
- **Sidebar:** Azul petróleo (`#0f4c5c`) com gradiente
- **Cards:** Branco com bordas sutis
- **Acentos:** Purple (`#8A2BE2`), Cyan (`#00F2FE`)

### Tema Escuro
- **Background:** Gradiente `#1a1a2e` → `#16213e`
- **Sidebar:** Azul petróleo (`#0f4c5c`) sólido
- **Cards:** `#1e1e32` com `backdrop-blur-sm` e opacidade
- **Glow effects:** Cyan e Purple para bordas e sombras

### PDV Dark Mode
- **Fundo principal:** `#1a1a2e`
- **Cards/Painéis:** `#1e1e32`
- **Bordas:** `rgba(255,255,255,0.08)` / `white/10`
- **Texto:** `#e2e8f0` (primary), `#94a3b8` (muted)

### Classes CSS Úteis (globals.css)
```css
.glass              /* Glassmorphism geral */
.glass-light        /* Glass tema claro */
.glass-dark         /* Glass tema escuro */
.glass-sidebar      /* Glass para sidebar */
.btn-gradient       /* Botão gradiente cyan→purple */
.glow-cyan          /* Brilho cyan */
.glow-purple        /* Brilho purple */
.animate-slide-up   /* Animação bottom sheet */
.scrollbar-hide     /* Esconder scrollbar */
```

### Theme Toggle
- Usar `useTheme()` do `next-themes`
- `resolvedTheme` → `'light'` | `'dark'`
- `setTheme('light' | 'dark')`

---

## 📊 Banco de Dados (Supabase)

### Tabelas Principais
| Tabela | Descrição |
|---|---|
| `usuarios` | Usuários do sistema |
| `empresas` | Empresas/negócios SaaS |
| `produtos` | Catálogo de produtos (com dados fiscais: NCM, CEST, CFOP, CST, etc) |
| `categorias` | Categorias de produtos (com cor) |
| `clientes` | Cadastro de clientes (PF/PJ) |
| `vendas` | Vendas realizadas |
| `itens_venda` | Itens das vendas |
| `caixas` | Registros de caixa (abertura/fechamento/movimentação) |
| `mesas` | Mesas do restaurante (livre/ocupada) |
| `comandas` | Comandas abertas |
| `nfe` | Notas fiscais eletrônicas |
| `fornecedores` | Fornecedores |
| `ordens_servico` | OS (lavanderia) |
| `pagamentos` | Formas de pagamento |
| `lavanderia_itens_catalogo` | Catálogo de peças (lavanderia) |
| `lavanderia_servicos_catalogo` | Catálogo de serviços (lavanderia) |
| `lavanderia_precos` | Tabela de preços Item×Serviço |

### Segurança
- **RLS (Row Level Security)** ativo nas tabelas
- **Service Role Key** usado em APIs para bypass RLS
- Isolamento por `empresa_id` em todas as tabelas

---

## 🚀 Scripts

```bash
npm install          # Instalar dependências
npm run dev          # Desenvolvimento (porta 3000)
npm run build        # Build produção
npm start            # Produção
```

---

## 📝 Convenções de Código

### Nomenclatura
- **Componentes:** PascalCase (`BuscaCliente.tsx`, `AppSidebar.tsx`)
- **Funções/Variáveis:** camelCase
- **API Routes:** kebab-case (`fetch-user/route.ts`)
- **Hooks:** prefixo `use` (`useProdutos`, `useCaixa`)

### Componentes
- Sempre `'use client'` para componentes com interatividade
- Usar `ProtectedRoute` com `allowedRoles` para proteger rotas
- Usar `MainLayout` com `breadcrumbs` para páginas admin

### API Routes
```typescript
// Sucesso
return NextResponse.json({ sucesso: true, data: ... });

// Erro
return NextResponse.json({
  sucesso: false,
  erro: { codigo: 'ERRO_001', mensagem: 'Descrição' }
}, { status: 400 });
```

### Dark Mode em Componentes
```tsx
import { useTheme } from 'next-themes';

const { resolvedTheme } = useTheme();
const darkMode = resolvedTheme === 'dark';

// Usar classes condicionais
<div className={`${darkMode ? 'bg-[#1e1e32] border-white/10' : 'bg-white border-gray-200'}`}>
```

---

## 📱 Módulos do Sistema

| # | Módulo | Descrição |
|---|---|---|
| 1 | **Dashboard** | KPIs (vendas, produtos mais vendidos, faturamento) |
| 2 | **PDV Restaurante** | Balcão, mesa, comanda, delivery com pagamento |
| 3 | **PDV Varejo** | Venda rápida sem mesas (carrinho) |
| 4 | **PDV Garçom** | Mobile-first para garçons (mesas → produtos → pedido) |
| 5 | **Caixa** | Abertura/fechamento, sangria, movimentações |
| 6 | **Produtos** | CRUD completo + dados fiscais (NCM, CEST, CFOP, etc) |
| 7 | **Estoque** | Inventário, entradas, saídas |
| 8 | **NF-e Entrada** | Importação de XML de nota fiscal de entrada |
| 9 | **NF-e Saída** | Emissão de notas fiscais de saída |
| 10 | **Financeiro** | Fluxo de caixa, contas a pagar/receber |
| 11 | **Cadastros** | Clientes, fornecedores, funcionários |
| 12 | **Mesas** | Gestão de mesas (status, capacidade) |
| 13 | **Comandas** | Gestão de comandas abertas |
| 14 | **Delivery** | Configuração e pedidos delivery |
| 15 | **OS Lavanderia** | Ordem de serviço com tabela de preços |
| 16 | **Integrações** | iFood e outros |
| 17 | **Configurações** | Ajustes gerais do sistema |
| 18 | **Logs** | Log de atividades do sistema |
| 19 | **Cardápio Online** | Cardápio público com checkout |
| 20 | **Painel Master** | Super admin (multi-tenant) |

---

## 🔧 Como Continuar o Desenvolvimento

### Adicionar nova página admin
1. Criar em `src/app/admin/[modulo]/page.tsx`
2. Usar `MainLayout` com `breadcrumbs`
3. Adicionar link no `AppSidebar.tsx`
4. Proteger com `<ProtectedRoute allowedRoles={['admin']}>`

### Criar nova API
1. Criar em `src/app/api/[nome]/route.ts`
2. Usar `createClient()` do Supabase server
3. Seguir formato de resposta `{ sucesso, data/erro }`
4. Usar `SUPABASE_SERVICE_ROLE_KEY` para bypass RLS

### Modificar tema
1. Editar `src/app/globals.css`
2. Variáveis em `:root` (claro) e `.dark` (escuro)
3. Para PDV: usar variável `darkMode` + classes condicionais

### Debugar autenticação
1. Ver `src/contexts/AuthContext.tsx`
2. Logs no console: "Buscando usuário via API"
3. Verificar cache: `userCache.current`

---

## ⚠️ Notas Importantes para IAs

1. **Não use `console.log` em produção** — use apenas para debug temporário
2. **Sempre verificar `empresaId`** antes de queries no Supabase (isolamento multi-tenant)
3. **PDV não usa MainLayout** — é fullscreen, sem sidebar
4. **Componentes shadcn/ui** são baseados em Radix — não modifique diretamente, edite os arquivos em `src/components/ui/`
5. **Migration SQL** ficam em raiz ou pasta `supabase/`
6. **Dark mode no PDV** usa variável `darkMode` (não usa classes `dark:` diretamente nos elementos, pois o PDV é fullscreen sem wrapper do tema)
7. **NFe parser** está em `src/lib/nfe-parser.ts` — não modifique sem entender a estrutura do XML fiscal
8. **NF-e importação** — o fluxo é: upload XML → parser → matching → preview → confirmação → API

---

## 📌 CNPJ Alfanumérico (Lei RFB nº 2.229/2024)

A partir de **julho/2026** novos CNPJs usarão letras (A-Z) + números nas 12 primeiras posições. DV continua numérico. CNPJs existentes não mudam.

### Nosso sistema — diagnóstico
- **DB**: Todos CNPJs já são `VARCHAR` — sem migration necessária.
- **Máscaras**: `maskCNPJ` em `src/lib/masks.ts` e 5+ `formatarCNPJ`/`mascaraCPFCNPJ` inlines usam `\D` / `\d` — precisam aceitar `[A-Z0-9]`.
- **Validação DV**: `src/services/nfe/nfe-service.ts` usa `parseInt()` — implementar ASCII (A=17, B=18…).
- **APIs**: `src/app/api/nfe/importar/route.ts` e `src/app/api/clientes/route.ts` usam `replace(/\D/g,'')`.
- **Duplicação**: 3+ `mascaraCPFCNPJ` inlines — centralizar em `src/lib/masks.ts`.

### Prazo
- **Homologação SEFAZ**: 06/04/2026 ✅
- **Produção**: 06/07/2026 (2 meses)
- **Simulador oficial**: https://www.gov.br/receitafederal/pt-br/acesso-a-informacao/acoes-e-programas/programas-e-atividades/cnpj-alfanumerico

---

## 🔑 Variáveis de Ambiente (.env)

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

---

## 📌 Estado Atual do Projeto (Últimas Alterações)

### PDV Dark Mode ✅
- Todos os 3 PDVs (`/pdv`, `/pdv-varejo`, `/pdv-garcom`) suportam dark mode
- Toggle de tema adicionado no header do PDV principal
- Cores: fundo `#1a1a2e`, cards `#1e1e32`, bordas `white/10`

### Importação NF-e ✅
- Dialog consolidado (sem passo separado de conversão)
- Campos "Unid/Cx" direto na tabela com destaque visual
- Markup padrão: 40% (editável)
- Cálculo de preço unitário: divide custo da caixa pela quantidade
- Arredondamento: múltiplos de R$ 0,05 (para cima)

### UI Components ✅
- Botões: formato pill (arredondado)
- Cards: glassmorphism no tema escuro
- Sidebar: azul petróleo (`#0f4c5c`)
- Dashboard: gradientes no fundo, ícones com cores dinâmicas
