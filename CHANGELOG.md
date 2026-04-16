# Changelog

Todas as alterações significativas do projeto são documentadas aqui.

## [Em Desenvolvimento]

### 🎨 Tema Futurista
- **Adicionado tema claro/escuro** com cores cyan (#00F2FE) e purple (#8A2BE2)
- **Tema claro:** Background gradiente suave, cards brancos com bordas
- **Tema escuro:** Background gradiente escuro (#121212 → #1a1a2e → #16213e)
- **Glassmorphism:** Sidebar com backdrop-filter blur e transparência
- **Efeitos glow:** Sombras coloridas em cyan e purple
- **Scrollbar estilizada:** Com gradiente cyan→purple
- **Input focus:** Borda cyan com glow no tema escuro

### 📁 Arquivos Alterados
- `src/app/globals.css` - Novo tema e classes utilitárias
- `src/app/layout.tsx` - Adicionado ThemeProvider do next-themes

### 🔘 Toggle de Tema
- **Adicionado botão toggle** no header da sidebar
- Ícone Sun (claro) / Moon (escuro)
- Transição suave entre temas
- Persistência via next-themes

### 📁 Arquivos Alterados
- `src/components/layout/AppSidebar.tsx` - Toggle de tema integrado
- `src/app/layout.tsx` - ThemeProvider configurado

### 🧩 Componente AppLayout
- **Criado novo componente** `AppLayout.tsx` com sidebar completa
- Layout responsivo com sidebar fixa
- Sidebar com glassmorphism no tema escuro
- Animações de navegação com framer-motion
- Status de conexão com banco
- User info com avatar e role
- Botões de logout e configurações

### 📁 Arquivos Criados
- `src/components/layout/AppLayout.tsx` - Novo layout completo

### 🔍 Busca de Clientes
- **Corrigida busca por CPF** para aceitar com ou sem pontuação
- Ex: `296.125.098-67` e `29612509867` funcionam
- Normalização do termo de busca removendo `.`, `-`, `/`, `(`, `)`
- Timeout de 10 segundos para evitar requests travados

### 📁 Arquivos Alterados
- `src/components/pdv/BuscaCliente.tsx` - Lógica de normalização

### ⚡ Cache de Autenticação
- **Adicionado cache em memória** para dados do usuário
- Evita chamadas duplicadas simultâneas para `/api/fetch-user`
- Refs utilizados: `userCache` e `fetchingRef`
- Performance melhorada significativamente

### 📁 Arquivos Alterados
- `src/contexts/AuthContext.tsx` - Sistema de cache implementado

### 🗑️ Exclusão em Cascata - OS Lavanderia
- **Nova API** `/api/os-lavanderia` para exclusão completa
- Ao excluir OS faturada, remove também:
  - `itens_venda` (itens da venda)
  - `vendas` (a venda)
  - `caixas` (registros de caixa vinculados)
- Soft delete da OS (`ativo: false`)
- Mensagem de confirmação com aviso sobre venda relacionada

### 📁 Arquivos Criados
- `src/app/api/os-lavanderia/route.ts` - API DELETE

### 📁 Arquivos Alterados
- `src/app/admin/os-lavanderia/page.tsx` - handleDeleteOS usa nova API

---

## Histórico de Commits

### Commit 81e104a (Atual)
```
feat: adicionar tema futurista com glassmorphism, toggle de tema e melhorias na exclusão de OS Lavanderia

- Tema claro/escuro com cores cyan e purple
- Sidebar com glassmorphism e toggle de tema
- Busca de clientes aceita CPF com/sem pontuação
- Cache de usuários para evitar chamadas duplicadas
- API para exclusão em cascata de OS faturada (vendas, itens_venda, caixas)
```

### Commit 7fb908f
```
fix: correção no z-index do dropdown de clientes no PDV-Varejo
```

### Commit 94ff78a
```
feat: melhorias no PDV-Varejo e correções
```

### Commit 1eb717d
```
feat: adiciona gerenciamento de categorias no catálogo de lavanderia
```

---

## Notas para Desenvolvedores/IA

### Como Continuar o Desenvolvimento

1. **Para adicionar novas páginas:**
   - Criar em `src/app/admin/[modulo]/page.tsx`
   - Usar `MainLayout` como wrapper
   - Adicionar link no AppSidebar.tsx

2. **Para criar novas APIs:**
   - Criar em `src/app/api/[nome]/route.ts`
   - Usar `createClient()` do Supabase server
   - Seguir formato de resposta padrão

3. **Para modificar o tema:**
   - Editar `src/app/globals.css`
   - Variáveis CSS em `:root` e `.dark`
   - Adicionar novas classes se necessário

4. **Para debugar autenticação:**
   - Ver `src/contexts/AuthContext.tsx`
   - Logs no console: "Buscando usuário via API"
   - Verificar cache em `userCache.current`

5. **Para entender estrutura de OS Lavanderia:**
   - Ver `src/app/admin/os-lavanderia/page.tsx`
   - API em `src/app/api/os-lavanderia/route.ts`
   - Metadata da OS armazenado em `observacoes` (formato JSON)

### Banco de Dados
- Acessar Supabase Dashboard para ver schemas
- Tabelas principais documentadas no README.md
- RLS (Row Level Security) ativo nas tabelas
- Service Role Key usado em APIs para bypass RLS

### Variáveis de Ambiente Necessárias
```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```
