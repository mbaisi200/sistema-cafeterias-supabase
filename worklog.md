---
Task ID: 1
Agent: Main
Task: Preços por Item + Tipo de Serviço na Lavanderia

Work Log:
- Analisou o modelo atual: `lavanderia_itens_catalogo` (peças) e `lavanderia_servicos_catalogo` (tipos de serviço com preço genérico)
- Identificou a necessidade de preço por combinação Item × Serviço (ex: Avental de Couro + Lavar/Passar = R$ 15,00)
- Criou migration SQL `add_lavanderia_precos.sql` com tabela `lavanderia_precos` (item_id, servico_id, preco, UNIQUE constraint)
- Atualizou catálogo (`catalogo/page.tsx`) com nova aba "Tabela de Preços" — matriz de itens × serviços com inputs de preço editáveis e salvamento automático (debounced + blur)
- Atualizou OS page (`page.tsx`) com `precosMap` state, `lookupPreco()` helper, `itemCatalogoId` rastreamento, e auto-preenchimento de preço ao selecionar item + serviço

Stage Summary:
- Nova tabela: `lavanderia_precos` (migration SQL criada)
- Catálogo: 3ª aba "Tabela de Preços" com matriz editável
- OS: Preço auto-preenchido baseado no item + serviço selecionados
- Arquivos alterados: catalogo/page.tsx, page.tsx, add_lavanderia_precos.sql
