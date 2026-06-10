-- Manual do Sistema - Tabela para armazenar o conteúdo do manual
CREATE TABLE IF NOT EXISTS manual_sistema (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  categoria VARCHAR(100) NOT NULL,
  titulo VARCHAR(200) NOT NULL,
  conteudo TEXT NOT NULL,
  ordem INTEGER DEFAULT 0,
  icone VARCHAR(50) DEFAULT 'FileText',
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_sistema_categoria ON manual_sistema(categoria, ordem);

ALTER TABLE manual_sistema ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Manual - todos veem ativos" ON manual_sistema;
DROP POLICY IF EXISTS "Manual - Master full access" ON manual_sistema;

CREATE POLICY "Manual - todos veem ativos" ON manual_sistema
  FOR SELECT USING (ativo = true);

CREATE POLICY "Manual - Master full access" ON manual_sistema
  FOR ALL USING (
    (SELECT role FROM usuarios WHERE auth_user_id = auth.uid()) = 'master'
  );

grant select, insert, update, delete on public.manual_sistema to authenticated;
grant select, insert, update, delete on public.manual_sistema to service_role;

-- ============================================================
-- CONTEÚDO DO MANUAL
-- ============================================================
-- Limpa dados existentes para permitir re-execução
DELETE FROM manual_sistema;

-- Cada categoria tem um INSERT próprio com múltiplas seções.

-- ============================================================
-- CATEGORIA: Visão Geral
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Visão Geral', 'Sobre o Sistema', E'## Sobre o Sistema\n\nEste sistema ajuda você a gerenciar seu restaurante, cafeteria ou outro negócio. Com ele você controla vendas, estoque, clientes, contas a pagar e receber, notas fiscais e muito mais.\n\nTudo funciona pela internet, direto do navegador do seu computador ou celular. Não precisa instalar nada.\n\nO sistema é feito para ser simples de usar no dia a dia, tanto no balcão (PDV) quanto na parte administrativa.', 1, 'Info', NULL),

('Visão Geral', 'Estrutura do Sistema', E'## Estrutura do Sistema\n\nO sistema tem três áreas principais:\n\n1. **Admin** - Onde você gerencia o negócio: produtos, estoque, clientes, finanças, relatórios e configurações. Só o gerente (admin) acessa esta área.\n\n2. **PDV** - Onde você faz as vendas no balcão, nas mesas ou por delivery. O operador (funcionário) usa esta área.\n\n3. **Cardápio Online** - O cliente acessa pelo celular, vê o cardápio e faz o pedido. Não precisa de login.', 2, 'FolderTree', NULL),

('Visão Geral', 'Papéis e Permissões', E'## Papéis e Permissões\n\nExistem três tipos de usuário no sistema:\n\n**Master** - O dono do sistema. Vê todas as empresas cadastradas. Cria planos, gerencia assinaturas e tem acesso a tudo.\n\n**Admin** - O gerente do seu estabelecimento. Vê e faz tudo da sua empresa: vendas, estoque, finanças, relatórios, cadastros.\n\n**Funcionário** - O operador do PDV. Só faz vendas e opera o caixa. Não vê relatórios, finanças nem configurações. Faz login rápido com PIN.', 3, 'Shield', NULL),

('Visão Geral', 'Empresas no Sistema', E'## Empresas no Sistema\n\nO sistema pode atender várias empresas ao mesmo tempo. Cada empresa tem seus próprios dados separados: produtos, clientes, vendas, finanças.\n\nSe você é Admin, vê apenas os dados da sua empresa. Não vê os dados de outras empresas.\n\nSe você é Master (super admin), pode navegar entre todas as empresas e ver os dados de cada uma.', 4, 'Building2', NULL);

-- ============================================================
-- CATEGORIA: Autenticação e Acesso
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Autenticação e Acesso', 'Como Fazer Login', E'## Como Fazer Login\n\n**Passo a passo:**\n\n1. Abra o sistema pelo navegador do seu computador ou celular\n2. Digite seu email e senha\n3. Clique em **Entrar**\n\nPronto! Você está logado.\n\n**Para sair:** clique no seu nome no canto superior direito e depois em **Sair**.', 1, 'LogIn', NULL),

('Autenticação e Acesso', 'Login do Funcionário (PIN)', E'## Login do Funcionário (PIN)\n\nO funcionário não precisa de email para acessar o sistema. Ele usa:\n\n- **Código da empresa** - fornecido pelo gerente (admin)\n- **PIN numérico** - senha de 4 a 6 dígitos cadastrada pelo gerente\n\n**Passo a passo:**\n\n1. Na tela de login, clique em **Acesso Funcionário**\n2. Digite o código da empresa\n3. Digite seu PIN\n4. Clique em **Entrar**\n\nPronto! Você entra direto no PDV.', 2, 'KeyRound', NULL),

('Autenticação e Acesso', 'Recuperar Senha', E'## Recuperar Senha\n\nEsqueceu sua senha?\n\n1. Na tela de login, clique em **Esqueceu sua senha?**\n2. Digite seu email\n3. Você vai receber um email com um link para criar nova senha\n4. Clique no link e crie uma nova senha\n\nSe não receber o email, verifique a caixa de spam.', 3, 'Shield', NULL);

-- ============================================================
-- CATEGORIA: Dashboard
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Dashboard', 'Visão Geral', E'## Dashboard - Visão Geral\n\nO Dashboard é a primeira tela que aparece depois do login. Aqui você vê os números mais importantes do seu negócio de uma só vez.\n\n**O que você encontra no Dashboard:**\n- Quanto faturou hoje e no mês\n- Quantas vendas foram feitas\n- Qual o valor médio por venda (ticket médio)\n- Gráficos de evolução do faturamento\n- Ranking dos produtos mais vendidos\n- Informações do caixa', 1, 'LayoutDashboard', 'dashboard'),

('Dashboard', 'Filtrar por Período', E'## Filtrar por Período\n\nVocê pode escolher qual período quer ver no Dashboard:\n\n- **Atual** - Dados de hoje (mostra as informações detalhadas do dia)\n- **Este Mês** - Dados do mês inteiro\n- **Últimos 30 Dias** - Comparação com o mês anterior\n- **Personalizado** - Você escolhe a data de início e fim\n\nBasta clicar no seletor de período no topo da página.', 2, 'Calendar', 'dashboard'),

('Dashboard', 'Indicadores do Topo', E'## Indicadores (KPIs)\n\nOs cards coloridos no topo mostram os principais números do seu negócio:\n\n**Faturamento Hoje** (verde) - Total de vendas do dia de hoje\n**Faturamento Mês** (verde) - Total de vendas do mês\n**Qtd. Vendas** (azul) - Quantas vendas foram feitas no período\n**Ticket Médio** (roxo) - Valor médio gasto por cliente em cada venda\n\nEsses números ajudam você a ter uma visão rápida do desempenho.', 3, 'BarChart3', 'dashboard'),

('Dashboard', 'Gráficos', E'## Gráficos\n\nOs gráficos ajudam a visualizar o desempenho do seu negócio:\n\n**Evolução Mensal** - Barras mostrando o faturamento mês a mês. Assim você vê se está crescendo.\n\n**Produtos Mais Vendidos** - Ranking do produto mais vendido para o menos vendido. Assim você sabe o que investir.\n\n**Dias da Semana** - Quais dias da semana vendem mais. Útil para planejar escala de funcionários.\n\n**Turnos** - Vendas por período (manhã, tarde, noite).\n\nClique em qualquer barra ou fatia do gráfico para ver os detalhes daquela venda.', 4, 'BarChart4', 'dashboard'),

('Dashboard', 'Atualizar e Backup', E'## Atualizar e Backup\n\n**Atualizar** - Clique no botão **Atualizar** para recarregar os dados mais recentes (vendas, estoque). O ícone fica girando enquanto carrega.\n\n**Backup** - Clique em **Backup** para baixar uma cópia dos dados do seu sistema em formato JSON. Guarde este arquivo em um local seguro.\n\n**Dica:** Faça backup regularmente para não perder informações importantes.', 5, 'RefreshCw', 'dashboard');

-- ============================================================
-- CATEGORIA: PDV (Ponto de Venda)
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('PDV (Ponto de Venda)', 'PDV Restaurante - Visão Geral', E'## PDV Restaurante\n\nO PDV é o coração do sistema - é onde você faz as vendas do dia a dia.\n\n**Quatro modos de venda:**\n\n1. **Balcão** - Venda direta para o cliente que chega no balcão\n2. **Mesa** - Cliente sentado em uma mesa específica\n3. **Comanda** - Conta aberta para ir adicionando produtos durante o consumo\n4. **Delivery** - Venda para entrega em domicílio\n\nEscolha o modo no topo da tela do PDV antes de começar a vender.', 1, 'ShoppingCart', 'pdv'),

('PDV (Ponto de Venda)', 'Como Fazer uma Venda', E'## Como Fazer uma Venda\n\n**Passo a passo:**\n\n1. Escolha o modo (Balcão, Mesa, Comanda ou Delivery)\n2. Selecione a **categoria** do produto na barra da esquerda\n3. Clique nos **produtos** que o cliente quer - eles vão para o carrinho\n4. No carrinho, ajuste as **quantidades** se precisar\n5. Se quiser, busque o **cliente** pelo nome (opcional)\n6. Escolha a **forma de pagamento**: Dinheiro, Cartão, Pix, etc.\n7. Clique em **Finalizar**\n\nPronto! A venda está registrada. O sistema dá baixa no estoque automaticamente.', 2, 'ShoppingCart', 'pdv'),

('PDV (Ponto de Venda)', 'Atalhos do Teclado', E'## Atalhos do Teclado\n\nPara agilizar as vendas, use as teclas de atalho:\n\n| Tecla | O que faz |\n|---|---|\n| **F2** | Buscar cliente |\n| **F3** | Buscar produto |\n| **F4** | Finalizar a venda |\n| **Ctrl+F5** | Atualizar a tela |\n| **F8** | Escolher forma de pagamento |\n| **F10** | Abrir o caixa |\n| **Ctrl+F12** | Fechar o caixa |\n\nOs atalhos funcionam mesmo com janelas abertas na tela.', 3, 'Keyboard', 'pdv'),

('PDV (Ponto de Venda)', 'PDV Varejo (Sem Mesas)', E'## PDV Varejo (Sem Mesas)\n\nEsta versão é para lojas que não trabalham com mesas, como padarias, mercados e lojas de conveniência.\n\n**Diferenças do PDV Restaurante:**\n- Não tem modo Mesa nem Comanda\n- Apenas venda direta (como Balcão)\n- Tela mais simples e enxuta\n- Os mesmos atalhos de teclado funcionam\n\n**Acesso:** `/pdv-varejo`', 4, 'Store', 'pdv'),

('PDV (Ponto de Venda)', 'PDV Garçom (Celular)', E'## PDV Garçom (Celular)\n\nEsta versão é feita para o garçom usar no celular ou tablet.\n\n**Como usar:**\n\n1. Veja o mapa das **mesas** na tela (livre ou ocupada)\n2. Toque na mesa do cliente\n3. Escolha os **produtos** que o cliente pediu\n4. Confirme o pedido - ele vai para a cozinha\n5. Para fechar a conta, finalize a venda\n\n**Acesso:** `/pdv-garcom` (pelo celular)', 5, 'UtensilsCrossed', 'pdv'),

('PDV (Ponto de Venda)', 'Buscar Cliente na Venda', E'## Buscar Cliente na Venda\n\nDurante a venda, você pode buscar um cliente cadastrado:\n\n1. Clique no campo de **busca de cliente**\n2. Digite o **nome**, **CPF/CNPJ** ou **telefone**\n3. Selecione o cliente na lista que aparece\n4. Os dados do cliente aparecem no resumo da venda\n\n**Não é obrigatório** - você pode vender sem identificar o cliente.\n\n**Cadastro rápido:** se o cliente não existir, você pode cadastrar na hora sem sair da tela de venda.', 6, 'Users', 'pdv');

-- ============================================================
-- CATEGORIA: Caixa
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Caixa', 'Abrir e Fechar Caixa', E'## Abrir e Fechar Caixa\n\n**Abrir o Caixa:**\n\n1. Vá em **Caixa** no menu\n2. Clique em **Abrir Caixa**\n3. Digite o valor inicial que tem no caixa\n4. Confirme\n\nPronto! O caixa está aberto para receber vendas.\n\n**Fechar o Caixa:**\n\n1. Clique em **Fechar Caixa**\n2. O sistema mostra o total de vendas e movimentações\n3. Confira o valor\n4. Digite o valor final que você apurou\n5. Confirme o fechamento\n\n**Movimentações:** Você também pode registrar **sangria** (retirar dinheiro) ou **suprimento** (colocar dinheiro) no caixa.', 1, 'Wallet', 'caixa'),

('Caixa', 'Cupom Fiscal (NFC-e)', E'## Cupom Fiscal (NFC-e)\n\nAo finalizar uma venda, o sistema pode emitir um cupom fiscal (NFC-e) para o cliente.\n\n**Para emitir cupom fiscal, precisa:**\n\n1. Ter um certificado digital configurado\n2. Ter configurado a série da NFC-e nas Configurações\n3. Estar em ambiente de produção (ou homologação para testes)\n\n**Impressão:** O cupom pode ser:\n- Impresso em impressora térmica\n- Gerado em PDF para enviar ao cliente por email/WhatsApp\n\n**Cancelamento:** Dá para cancelar o cupom em até 30 minutos após a emissão.', 2, 'Receipt', 'caixa');

-- ============================================================
-- CATEGORIA: Cadastros
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Cadastros', 'Cadastrar Clientes', E'## Cadastrar Clientes\n\n**Acesso:** Clientes no menu ou Cadastros > Clientes\n\n**Passo a passo:**\n\n1. Clique em **Novo Cliente**\n2. Preencha:\n   - **Nome** (obrigatório)\n   - **Telefone** e/ou **Email**\n   - **CPF/CNPJ** (não é obrigatório)\n   - **Endereço** (CEP, rua, número, bairro, cidade)\n3. Clique em **Salvar**\n\nPronto! O cliente está cadastrado.\n\n**Para editar:** clique no ícone de ações ao lado do cliente.\n\n**Para inativar:** o cliente fica oculto mas não é excluído. Só pode ser excluído de verdade se não tiver vendas.', 1, 'UserPlus', 'cadastros'),

('Cadastros', 'Cadastrar Funcionários', E'## Cadastrar Funcionários\n\n**Acesso:** Funcionários no menu\n\n**Passo a passo:**\n\n1. Clique em **Novo Funcionário**\n2. Preencha:\n   - **Nome completo**\n   - **Email** (para login)\n   - **PIN** - senha numérica de 4 a 6 dígitos\n   - **Telefone** e **Cargo**\n3. Escolha quais PDVs o funcionário pode acessar\n4. Clique em **Salvar**\n\n**Login do funcionário:** Ele acessa digitando o código da empresa + o PIN. Não precisa de email para entrar no dia a dia.', 2, 'UserCog', 'cadastros'),

('Cadastros', 'Cadastrar Fornecedores', E'## Cadastrar Fornecedores\n\n**Acesso:** Cadastros > Fornecedores\n\n**Passo a passo:**\n\n1. Clique em **Novo Fornecedor**\n2. Preencha:\n   - **Nome / Razão Social**\n   - **CPF/CNPJ**\n   - **Telefone** e **Email**\n   - **Endereço** completo\n   - **Contato** (nome da pessoa com quem falar)\n3. Clique em **Salvar**\n\nOs fornecedores são usados nos pedidos de compra e nas notas fiscais de entrada.', 3, 'Truck', 'cadastros');

-- ============================================================
-- CATEGORIA: Produtos
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Produtos', 'Cadastrar Produtos', E'## Cadastrar Produtos\n\n**Acesso:** Produtos no menu\n\n**Passo a passo:**\n\n1. Clique em **Novo Produto**\n2. Preencha as informações:\n   - **Nome** (obrigatório)\n   - **Categoria** (selecione uma ou crie nova)\n   - **Preço de Venda** (obrigatório)\n   - **Preço de Custo**\n   - **Unidade** (UN, KG, L, etc.)\n3. Configure o **estoque** se o produto tiver controle\n4. Informe os **dados fiscais** (NCM, CFOP, CST) para emitir notas\n5. Clique em **Salvar**\n\nPronto! O produto aparece no PDV para ser vendido.', 1, 'Package', 'produtos'),

('Produtos', 'Criar Combos', E'## Criar Combos\n\n**O que é um Combo?**\n\nÉ um produto que contém outros produtos. Ex: "Combo Café + Pão de Queijo" = 1 café + 1 pão de queijo.\n\n**Como criar:**\n\n1. Cadastre um produto normal com o nome do combo\n2. Vá na aba **Combos**\n3. Clique em **Adicionar Item**\n4. Selecione os produtos que fazem parte do combo\n5. Defina a quantidade de cada um\n6. Defina o preço do combo\n\n**Na hora da venda:** O sistema separa o combo nos itens individuais para dar baixa no estoque certinho.', 2, 'Layers', 'produtos'),

('Produtos', 'Categorias de Produtos', E'## Categorias de Produtos\n\n**Acesso:** Categorias no menu\n\nAs categorias ajudam a organizar os produtos. Ex: Bebidas, Salgados, Doces, Lanches.\n\n**Como criar:**\n\n1. Clique em **Nova Categoria**\n2. Digite o **nome** (ex: Bebidas)\n3. Escolha uma **cor** para identificar no PDV\n4. Salve\n\n**No PDV:** as categorias aparecem como botões na barra lateral para filtrar os produtos.\n\n**Inativar:** se você inativar uma categoria, os produtos dela continuam existindo.', 3, 'FolderTree', 'produtos'),

('Produtos', 'Unidades de Medida', E'## Unidades de Medida\n\n**Acesso:** Configurações > Unidades\n\nAs unidades definem como o produto é vendido:\n- **UN** - Unidade (produto vendido por peça)\n- **KG** - Quilograma (vendido por peso)\n- **L** - Litro (vendido por volume)\n- **CX** - Caixa (vendido por caixa)\n\n**Como criar:**\n\n1. Clique em **Nova Unidade**\n2. Digite a **sigla** (ex: PC para pacote)\n3. Digite a **descrição** (ex: Pacote)\n4. Salve', 4, 'Ruler', 'produtos'),

('Produtos', 'Serviços', E'## Serviços\n\n**Acesso:** Produtos > Serviços\n\nVocê pode cadastrar serviços para cobrar dos clientes. Ex:\n- Taxa de entrega\n- Serviço de lavanderia\n- Talher descartável\n\n**Como criar:**\n\n1. Clique em **Novo Serviço**\n2. Digite o **nome** e o **preço**\n3. Selecione a **categoria**\n4. Salve', 5, 'Wrench', 'produtos');

-- ============================================================
-- CATEGORIA: Estoque
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Estoque', 'Consultar Estoque', E'## Consultar Estoque\n\n**Acesso:** Estoque no menu\n\nA tela de estoque mostra todos os produtos e suas quantidades.\n\n**O que você vê:**\n- Nome do produto\n- Categoria\n- Quantidade atual\n- Estoque mínimo (alerta quando abaixo disso)\n- Status: **Normal** (verde) ou **Baixo** (vermelho)\n\n**Filtros:** você pode buscar por nome do produto ou filtrar por categoria.\n\n**Cards no topo:** mostram entradas do dia, saídas do dia e produtos com estoque baixo. Clique neles para ver os detalhes.', 1, 'Warehouse', 'estoque'),

('Estoque', 'Movimentar Estoque', E'## Movimentar Estoque\n\nVocê pode registrar movimentações manuais no estoque:\n\n**Entrada** - Quando chega mercadoria:\n1. Clique em **Entrada**\n2. Selecione o produto\n3. Digite a quantidade\n4. Informe o fornecedor (opcional)\n5. Salve\n\n**Saída** - Quando precisa retirar do estoque:\n1. Clique em **Saída**\n2. Selecione o produto\n3. Digite a quantidade e o motivo\n4. Salve\n\n**Automático:** Quando uma venda é feita no PDV, o estoque já é atualizado sozinho.', 2, 'ArrowUpDown', 'estoque'),

('Estoque', 'Reserva de Estoque', E'## Reserva de Estoque\n\nQuando você cria um **pedido de compra** para um fornecedor, o sistema pode reservar os produtos no estoque.\n\n**Como funciona:**\n- Pedido criado como **Pendente** - os produtos ficam reservados\n- Pedido **Cancelado** - a reserva é liberada (volta ao estoque)\n- Pedido **Entregue** - a reserva vira saída definitiva\n\nIsso evita que você venda um produto que já está reservado para um pedido.', 3, 'Lock', 'estoque'),

('Estoque', 'Relatório de Estoque', E'## Relatório de Estoque\n\n**Acesso:** Estoque > Relatório\n\nAqui você vê o histórico completo de tudo que entrou e saiu do estoque.\n\n**Filtros disponíveis:**\n- Período (data início e fim)\n- Tipo de movimentação (entrada, saída, venda)\n- Produto específico\n\nVocê pode exportar o relatório em **PDF** para imprimir ou arquivar.', 4, 'FileSpreadsheet', 'estoque');

-- ============================================================
-- CATEGORIA: Financeiro
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Financeiro', 'Contas a Pagar e Receber', E'## Contas a Pagar e Receber\n\n**Acesso:** Financeiro no menu\n\n**Contas a Pagar:**\n- Registre as contas que você precisa pagar (aluguel, água, luz, fornecedores)\n- Informe: descrição, valor, data de vencimento, fornecedor\n- Acompanhe o status: Pendente, Pago, Vencido\n\n**Contas a Receber:**\n- Registre valores que você vai receber (vendas a prazo, serviços)\n- Informe: descrição, valor, data de recebimento, cliente\n- Acompanhe o status: Pendente, Recebido, Vencido\n\n**Filtros:** filtre por período, status, cliente ou fornecedor.', 1, 'DollarSign', 'financeiro'),

('Financeiro', 'Extração de Dados', E'## Extração de Dados\n\nVocê pode exportar os dados financeiros em PDF:\n\n1. Aplique os filtros desejados (período, status)\n2. Clique em **Exportar PDF**\n3. O relatório sai com o logo da sua empresa\n\n**Indicadores:** a tela mostra o total a pagar, total a receber e saldo previsto.', 2, 'Download', 'financeiro');

-- ============================================================
-- CATEGORIA: Pedidos
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Pedidos', 'Pedidos de Compra', E'## Pedidos de Compra\n\n**Acesso:** Pedidos no menu\n\n**Para criar um pedido de compra:**\n\n1. Clique em **Novo Pedido**\n2. Selecione o **fornecedor**\n3. Adicione os **produtos** e suas quantidades\n4. Informe a **condição de pagamento**\n5. Defina a previsão de **entrega**\n6. Clique em **Salvar**\n\n**Status do pedido:**\n- **Pendente** - aguardando o fornecedor (estoque fica reservado)\n- **Aprovado** - pedido confirmado\n- **Entregue** - mercadoria chegou (estoque é atualizado)\n- **Cancelado** - pedido cancelado (reserva é liberada)\n- **Faturado** - convertido em venda', 1, 'ClipboardList', 'pedidos'),

('Pedidos', 'Tabela de Pedidos', E'## Tabela de Pedidos\n\nA tabela mostra todos os pedidos de compra com:\n- Número do pedido\n- Fornecedor\n- Quantidade de itens\n- Valor total\n- Status (com cores: amarelo = pendente, verde = aprovado, etc.)\n- Data\n\n**Ações:** você pode visualizar, editar, aprovar, cancelar ou faturar cada pedido.\n\n**Filtros:** filtre por período, status ou busque por texto.', 2, 'Table', 'pedidos');

-- ============================================================
-- CATEGORIA: Ordens de Serviço
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Ordens de Serviço', 'OS Lavanderia', E'## OS Lavanderia\n\n**Acesso:** OS Lavanderia no menu\n\nEste módulo é para lavanderias. Você cria ordens de serviço (OS) com as peças e serviços do cliente.\n\n**Como criar uma OS:**\n\n1. Selecione o **cliente**\n2. Defina a **data de entrada** e **previsão de retirada**\n3. Adicione as **peças** (camisa, calça, toalha, etc.)\n4. Selecione os **serviços** para cada peça (lavar, passar, etc.)\n5. Informe a **quantidade** de cada peça\n6. O sistema calcula o **valor** automaticamente\n7. Selecione o **vendedor** responsável\n8. Escolha a **forma de pagamento**\n9. Salve\n\n**Faturamento:** ao faturar, o sistema cria uma venda e registra no caixa.\n\n**Impressão:** você pode imprimir a OS com os termos de serviço.', 1, 'WashingMachine', 'ordens-servico'),

('Ordens de Serviço', 'OS Geral', E'## OS Geral\n\n**Acesso:** Ordens de Serviço no menu\n\nPara criar ordens de serviço genéricas (não lavanderia):\n\n1. Clique em **Nova OS**\n2. Selecione o **cliente**\n3. Descreva o **serviço** a ser feito\n4. Informe o **valor**\n5. Defina o **status** (Pendente, Em Andamento, Concluído)\n6. Salve', 2, 'Wrench', 'ordens-servico');

-- ============================================================
-- CATEGORIA: NF-e (Notas Fiscais)
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('NF-e (Notas Fiscais)', 'Importar NF-e de Entrada', E'## Importar NF-e de Entrada\n\n**Acesso:** Notas Fiscais de Entrada > Importar\n\nQuando você compra de um fornecedor, ele emite uma nota fiscal (NF-e). Você pode importar o XML desta nota para o sistema.\n\n**Passo a passo:**\n\n1. Clique em **Importar NF-e**\n2. Selecione o arquivo **XML** da nota\n3. O sistema lê os dados automaticamente:\n   - Dados do fornecedor\n   - Produtos comprados\n   - Valores\n4. Confira os dados e clique em **Confirmar**\n\nPronto! Os produtos são adicionados ao estoque com os preços de custo.', 1, 'FileInput', 'nfe'),

('NF-e (Notas Fiscais)', 'Emitir NF-e de Saída', E'## Emitir NF-e de Saída\n\n**Acesso:** Notas Fiscais de Saída\n\nPara emitir nota fiscal para o cliente:\n\n1. Selecione a **venda** que vai emitir a nota\n2. Confira os **dados do cliente**\n3. Verifique os **produtos** e seus dados fiscais\n4. Adicione **informações complementares** se precisar\n5. Clique em **Emitir NF-e**\n\n**Importante:** Para emitir em produção, você precisa ter um **certificado digital** configurado.', 2, 'FileOutput', 'nfe'),

('NF-e (Notas Fiscais)', 'Configurar NF-e', E'## Configurar NF-e\n\n**Acesso:** Configurações > NF-e\n\nAntes de emitir notas fiscais, você precisa configurar:\n\n- **Certificado Digital** - arquivo do certificado A1 (.pfx ou .p12)\n- **Série da NF-e** - numeração das notas\n- **Ambiente** - homologação (testes) ou produção (válido)\n- **CFOP Padrão** - código padrão para suas operações\n- **Regime Tributário** - Simples Nacional, Lucro Presumido, etc.\n\n**Informações Adicionais:** você pode cadastrar mensagens que vão aparecer nas notas, como "Nota emitida por MEI" ou avisos ao cliente.', 3, 'Settings', 'nfe');

-- ============================================================
-- CATEGORIA: Cupons Fiscais / NFC-e
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Cupons Fiscais / NFC-e', 'Cupons Fiscais', E'## Cupons Fiscais\n\n**Acesso:** Cupons e Notas Fiscais no menu\n\nAqui você vê todos os cupons fiscais (NFC-e) que foram emitidos.\n\n**O que você pode fazer:**\n- Ver a lista de cupons emitidos\n- Visualizar o DANFE (documento do cupom)\n- Reimprimir um cupom\n- Cancelar um cupom (em até 30 minutos)\n\n**Colunas da lista:** Número, Data, Cliente, Valor, Status.', 1, 'FileText', 'cupons-nfes');

-- ============================================================
-- CATEGORIA: Delivery
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Delivery', 'Gerenciar Delivery', E'## Gerenciar Delivery\n\n**Acesso:** Delivery no menu\n\n**Para configurar o delivery:**\n\n1. Vá em **Configurações do Delivery**\n2. Defina:\n   - **Taxa de entrega** - valor cobrado pela entrega\n   - **Distância máxima** - até onde você entrega\n   - **Horário de funcionamento** - quando aceita pedidos\n   - **Formas de pagamento** aceitas\n   - **Áreas de cobertura** - bairros atendidos\n\n**Pedidos Delivery:** você vê todos os pedidos com status: Pendente, Confirmado, Em Preparação, Pronto, Saiu para Entrega, Entregue.', 1, 'Bike', 'delivery'),

('Delivery', 'Entregadores', E'## Entregadores\n\n**Acesso:** Cadastros > Entregadores\n\n**Para cadastrar um entregador:**\n\n1. Clique em **Novo Entregador**\n2. Informe:\n   - **Nome**\n   - **Telefone**\n   - **Veículo** (moto, carro, bicicleta, a pé)\n   - **Placa** do veículo\n3. Salve\n\nVocê pode vincular entregadores aos pedidos delivery e controlar as entregas.', 2, 'Truck', 'delivery');

-- ============================================================
-- CATEGORIA: Integrações
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Integrações', 'iFood', E'## iFood\n\n**Acesso:** Integrações > iFood\n\nPara integrar seu sistema com o iFood:\n\n1. Você precisa ter uma conta no iFood como parceiro\n2. No sistema, vá em **Integrações > iFood**\n3. Configure as chaves de acesso (Client ID, Client Secret, Merchant ID)\n4. Ative a integração\n\n**O que a integração faz:**\n- Os pedidos do iFood chegam automaticamente no sistema\n- O cardápio do iFood é sincronizado com seus produtos\n- O status do pedido é atualizado automaticamente\n\n**Produtos:** no cadastro do produto, você ativa "Disponível no iFood" para enviar para o iFood.', 1, 'Plug', 'integracoes'),

('Integrações', 'Uber Eats', E'## Uber Eats\n\n**Acesso:** Integrações > Uber Eats\n\nA integração com Uber Eats funciona de forma parecida com o iFood:\n\n1. Configure as chaves de acesso (Client ID, Client Secret, Store ID)\n2. Ative a integração\n\n**Produtos:** no cadastro do produto, você ativa "Enviar para Uber Eats". O sistema gera um código automaticamente e mostra o status da sincronização (sincronizado, pendente, erro).', 2, 'Plug', 'integracoes'),

('Integrações', 'WhatsApp Business', E'## WhatsApp Business\n\n**Acesso:** Integrações > WhatsApp\n\nA integração com WhatsApp permite:\n\n- Enviar **notificações** de pedidos para os clientes\n- Enviar **confirmação** de entrega\n- **Atendimento** ao cliente via WhatsApp\n- Mensagens **automáticas** configuráveis\n\n**Configuração:** você precisa configurar o token da API do WhatsApp Business.', 3, 'MessageCircle', 'integracoes'),

('Integrações', 'Stripe (Assinaturas)', E'## Stripe - Assinaturas\n\n**Para o Admin:**\n\n**Acesso:** Assinatura no menu\n\nAqui você vê:\n- Seu **plano** atual (Mensal, Anual, etc.)\n- O **valor** que paga\n- **Histórico de faturas**\n- Opção de fazer upgrade ou cancelar\n\n**Se a assinatura vencer,** o sistema avisa no topo da tela e você precisa renovar para continuar usando.\n\n**Para o Master:**\n- Gerencia os planos disponíveis\n- Vê a lista de empresas assinantes\n- Acompanha as estatísticas de assinatura', 4, 'CreditCard', 'integracoes');

-- ============================================================
-- CATEGORIA: Atendimento
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Atendimento', 'Atendimento Virtual', E'## Atendimento Virtual\n\n**Acesso:** Atendimento no menu\n\n**Funcionalidades:**\n\n- **Chat** em tempo real com os clientes\n- **Histórico** de conversas anteriores\n- **Notificações** de novas mensagens\n- **Recuperação de carrinhos** - identifica clientes que abandonaram o pedido no cardápio online\n\n**Auto-respostas:** você pode configurar mensagens automáticas para responder perguntas comuns (horário de funcionamento, formas de pagamento, etc.).', 1, 'MessageCircle', 'atendimento'),

('Atendimento', 'Cardápio Online', E'## Cardápio Online\n\n**Acesso público:** `/cardapio` (não precisa de login)\n\nSeus clientes acessam o cardápio pelo celular e fazem pedidos.\n\n**O que aparece no cardápio online:**\n- Categorias de produtos\n- Fotos dos produtos\n- Preços\n- Descrição\n\n**Configuração:** em Delivery > Configurações, você pode:\n- Colocar o **logo** da sua empresa\n- Definir **cores** do cardápio\n- Destacar **produtos em destaque**\n- Definir **horário de funcionamento**\n\n**Checkout:** o cliente monta o carrinho, coloca o endereço e finaliza o pedido.', 2, 'Menu', 'atendimento');

-- ============================================================
-- CATEGORIA: Fidelidade
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Fidelidade', 'Programa de Fidelidade', E'## Programa de Fidelidade\n\n**Acesso:** Configurações > Fidelidade\n\nCrie um programa de fidelidade para seus clientes voltarem mais.\n\n**Modelos disponíveis:**\n\n| Modelo | Como funciona |\n|---|---|\n| **Pontos** | Cliente acumula pontos a cada compra |\n| **Selos** | Cliente ganha selos (ex: 10 selos = 1 brinde) |\n| **Visitas** | Cliente acumula visitas (ex: 5a visita ganha desconto) |\n| **Cashback** | Cliente recebe de volta um percentual do valor em créditos |\n\n**Recompensas:** você pode oferecer:\n- **Desconto** em reais na próxima compra\n- **Produto grátis** (ex: 1 café expresso)\n\n**Acúmulo automático:** o PDV já acumula pontos automaticamente quando o cliente faz uma compra.', 1, 'Heart', 'fidelidade');

-- ============================================================
-- CATEGORIA: Mesas e Comandas
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Mesas e Comandas', 'Gerenciar Mesas', E'## Gerenciar Mesas\n\n**Acesso:** Mesas no menu\n\nAqui você gerencia as mesas do seu restaurante.\n\n**O que você pode fazer:**\n\n- **Cadastrar mesas** - defina o número e a capacidade de lugares\n- **Ver o status** - Livre (verde), Ocupada (vermelho), Reservada (amarelo)\n- **Visualizar em grid** - mapa visual de todas as mesas\n- **Ativar/Inativar** mesas\n\nNo PDV, ao escolher o modo Mesa, você seleciona qual mesa está atendendo.', 1, 'UtensilsCrossed', 'mesas'),

('Mesas e Comandas', 'Comandas', E'## Comandas\n\n**Acesso:** Direto no PDV, modo Comanda\n\nA comanda é uma conta aberta para ir adicionando produtos durante o consumo.\n\n**Como funciona:**\n\n1. No PDV, selecione o modo **Comanda**\n2. Abra uma comanda para a mesa ou balcão\n3. Vá adicionando os produtos que o cliente pede\n4. Quando o cliente for embora, **finalize a comanda**\n\n**Divisão de conta:** você pode dividir a comanda entre várias pessoas.', 2, 'ClipboardList', 'mesas');

-- ============================================================
-- CATEGORIA: Dispositivos
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Dispositivos', 'Dispositivos Autorizados', E'## Dispositivos Autorizados\n\n**Acesso:** Dispositivos no menu\n\nO sistema controla quais dispositivos podem acessar a conta.\n\n**Como funciona:**\n\n1. Um funcionário faz login de um celular ou computador novo\n2. Este dispositivo aparece como **Pendente** na lista\n3. O admin **aprova** ou **rejeita** o dispositivo\n4. Se aprovado, o funcionário pode usar normalmente\n\n**Para o admin:** você é aprovado automaticamente em qualquer dispositivo.\n\n**Badge na sidebar:** um número vermelho mostra quantos dispositivos estão pendentes.', 1, 'Shield', 'dispositivos');

-- ============================================================
-- CATEGORIA: Logs
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Logs', 'Registro de Atividades', E'## Registro de Atividades\n\n**Acesso:** Logs no menu\n\nO sistema registra tudo que acontece para você consultar depois.\n\n**O que é registrado:**\n- Logins e logouts\n- Vendas realizadas\n- Alterações em cadastros (clientes, produtos, etc.)\n- Emissão de notas fiscais\n- Abertura e fechamento de caixa\n- Movimentações de estoque\n\n**Filtros:** você pode filtrar por tipo de atividade, data ou usuário.\n\nOs logs ajudam a resolver problemas e fazer auditoria.', 1, 'FileText', NULL);

-- ============================================================
-- CATEGORIA: Configurações
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Configurações', 'Configurações Gerais', E'## Configurações Gerais\n\n**Acesso:** Configurações no menu\n\nAqui você configura os dados da sua empresa:\n\n- **Nome da Empresa** - razão social ou nome fantasia\n- **CNPJ/CPF** - documento da empresa\n- **Endereço** completo\n- **Telefone** e **Email** de contato\n- **Logo** - imagem que aparece em relatórios e notas fiscais\n- **Alterar Senha** - trocar a senha do admin\n\n**Abas disponíveis:**\n- **Geral** - dados da empresa\n- **NFC-e** - configuração do cupom fiscal\n- **NF-e** - configuração da nota fiscal\n- **Stripe** - informações da assinatura', 1, 'Settings', 'configuracoes'),

('Configurações', 'Unidades', E'## Unidades\n\n**Acesso:** Configurações > Unidades\n\nAqui você gerencia as unidades de medida dos produtos.\n\n**Exemplos:** UN (unidade), KG (quilo), L (litro), PC (pacote), CX (caixa)\n\n**Como cadastrar:**\n\n1. Clique em **Nova Unidade**\n2. Digite a **sigla** e a **descrição**\n3. Salve\n\nAs unidades são usadas no cadastro de produtos e nas notas fiscais.', 2, 'Ruler', 'configuracoes'),

('Configurações', 'Fidelidade', E'## Configuração de Fidelidade\n\n**Acesso:** Configurações > Fidelidade\n\nAqui você ativa e configura o programa de fidelidade:\n\n- **Ativar/Desativar** o programa\n- Escolher o **modelo** (pontos, selos, visitas, cashback)\n- Definir as **regras** (ex: 1 ponto a cada R$ 10)\n- Gerenciar as **recompensas**\n\nVeja a seção **Fidelidade** deste manual para mais detalhes.', 3, 'Heart', 'configuracoes');

-- ============================================================
-- CATEGORIA: Relatórios
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Relatórios', 'Relatórios e BI', E'## Relatórios e BI\n\n**Acesso:** Relatórios no menu\n\n**Tipos de relatório:**\n\n**Produtos Mais Vendidos** - Ranking dos produtos que mais vendem. Útil para saber o que sempre ter em estoque.\n\n**Lucro Bruto por Produto** - Quanto cada produto lucra (preço de venda - preço de custo).\n\n**Vendas por Item no Dia** - Itens vendidos no dia com detalhes.\n\n**Filtros:** você pode filtrar por:\n- Período (data início e fim)\n- Cliente\n- Fornecedor\n- Categoria\n\n**Exportação:** clique em **Exportar PDF** para baixar o relatório com logo da sua empresa.', 1, 'BarChart3', 'relatorios'),

('Relatórios', 'Relatório de Estoque', E'## Relatório de Estoque\n\n**Acesso:** Estoque > Relatório\n\nRelatório completo de movimentações de estoque:\n- Filtro por período\n- Filtro por tipo (entrada, saída, venda)\n- Filtro por produto\n- Exportação em PDF\n\nVeja a seção **Estoque** deste manual para mais detalhes.', 2, 'FileSpreadsheet', 'relatorios');

-- ============================================================
-- CATEGORIA: Tema Visual
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Tema Visual', 'Tema Claro e Escuro', E'## Tema Claro e Escuro\n\nO sistema tem dois temas: claro e escuro.\n\n**Para alternar:** clique no ícone de Sol/Lua no canto superior direito.\n\n**Tema Claro:** fundo claro, ideal para ambientes bem iluminados.\n**Tema Escuro:** fundo escuro, mais confortável para usar em ambientes com pouca luz.\n\n**No PDV:** você também pode alternar o tema no topo da tela de vendas.\n\nA escolha fica salva para a próxima vez que você acessar.', 1, 'Sun', NULL),

('Tema Visual', 'Interface do Sistema', E'## Interface do Sistema\n\nA interface do sistema é composta por:\n\n**Sidebar (barra lateral):** menu de navegação com todos os módulos. Fica à esquerda.\n\n**Topo:** mostra o nome da sua empresa, botão de tema e seu usuário.\n\n**Área principal:** onde o conteúdo de cada módulo aparece.\n\n**Breadcrumbs:** mostra onde você está (ex: Admin > Produtos > Novo Produto).\n\n**Responsivo:** o sistema funciona em computador, tablet e celular.', 2, 'Monitor', NULL);

-- ============================================================
-- CATEGORIA: Painel Master
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Painel Master', 'Painel do Master', E'## Painel do Master\n\n**Acesso:** Apenas para usuários Master (super admin)\n\nO Master tem acesso a tudo no sistema:\n\n**Dashboard Master:** visão geral de todas as empresas, total de empresas ativas, faturamento consolidado.\n\n**Clientes (Empresas):** cadastra, edita, ativa ou inativa empresas. Gerencia assinaturas de cada uma.\n\n**Segmentos:** cria segmentos (cafeteria, restaurante, padaria) que definem quais menus cada empresa vê.\n\n**Consumo de Dados:** monitora quanto cada empresa está usando do banco de dados.\n\n**Assinatura:** gerencia planos e lista de assinantes.\n\n**Configurações:** exporta dados do sistema, faz backup completo e restaura backup de empresas.', 1, 'Crown', NULL),

('Painel Master', 'Popular Dados de Exemplo', E'## Popular Dados de Exemplo\n\n**Acesso:** Master > Popular Dados\n\nUse esta função para preencher o sistema com dados de exemplo para testar.\n\n**O que é criado:**\n- Categorias de produtos\n- Produtos\n- Clientes\n- Fornecedores\n- Funcionários\n- Vendas de exemplo\n- Pedidos delivery\n\n**Importante:** use apenas para testes. Não use em produção com dados reais.', 2, 'Database', NULL);

-- ============================================================
-- CATEGORIA: Atalhos de Teclado
-- ============================================================
INSERT INTO manual_sistema (categoria, titulo, conteudo, ordem, icone) VALUES
('Atalhos de Teclado', 'Atalhos do PDV', E'## Atalhos do PDV\n\n| Tecla | O que faz |\n|---|---|\n| **F2** | Buscar cliente |\n| **F3** | Buscar produto |\n| **F4** | Finalizar venda |\n| **Ctrl+F5** | Atualizar tela |\n| **F8** | Escolher forma de pagamento |\n| **F10** | Abrir caixa |\n| **Ctrl+F12** | Fechar caixa |\n\nOs atalhos funcionam mesmo com janelas abertas.', 1, 'Keyboard', NULL),

('Atalhos de Teclado', 'Atalhos Gerais', E'## Atalhos Gerais\n\n- **Enter** - confirmar / salvar\n- **Esc** - fechar janela / voltar\n- **Tab** - pular para o próximo campo\n\n**Navegação:** use o menu lateral para ir entre os módulos. Os breadcrumbs no topo mostram onde você está e permitem voltar.', 2, 'Keyboard', NULL);
