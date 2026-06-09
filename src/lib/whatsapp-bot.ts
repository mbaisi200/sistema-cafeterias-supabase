import { createAdminClient } from '@/lib/supabase/server';
import { sendWhatsAppMessage } from '@/lib/whatsapp';
import {
  sendInteractiveMessage,
  buildTextMessage,
  buildCategoryList,
  buildProductList,
  buildQuantityButtons,
  buildCartActions,
  buildCheckoutType,
  buildConfirmation,
} from '@/lib/whatsapp-templates';

interface WaConfig {
  id: string;
  empresa_id: string;
  phone_number_id: string;
  access_token: string;
  mensagem_boas_vindas: string;
  mensagem_categorias: string;
  categorias_ativas: string[];
  criar_pedido_auto: boolean;
}

interface Session {
  id: string;
  empresa_id: string;
  wa_phone: string;
  etapa: string;
  dados: any;
  conversa_id: string | null;
}

const TRIGGER_PALAVRAS = ['cardápio', 'cardapio', 'menu', 'quero pedir', 'fazer pedido', 'comprar'];

export function isMenuTrigger(text: string): boolean {
  const t = text.toLowerCase().trim();
  return TRIGGER_PALAVRAS.some((p) => t.includes(p));
}

export function extractReplyId(body: any): string | null {
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return null;

  if (msg.type === 'interactive') {
    return (
      msg.interactive?.button_reply?.id ||
      msg.interactive?.list_reply?.id ||
      null
    );
  }

  if (msg.type === 'text') {
    return msg.text?.body || null;
  }

  return null;
}

export function extractTextBody(body: any): string | null {
  const msg = body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
  if (!msg) return null;

  if (msg.type === 'text') {
    return msg.text?.body || null;
  }

  return null;
}

async function getConfig(supabase: any, empresaId: string): Promise<WaConfig | null> {
  const { data } = await supabase
    .from('whatsapp_config')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('ativo', true)
    .eq('menu_ativo', true)
    .maybeSingle();
  return data;
}

async function getOrCreateSession(
  supabase: any,
  empresaId: string,
  waPhone: string,
  conversaId?: string,
): Promise<Session | null> {
  const { data: existing } = await supabase
    .from('whatsapp_sessoes')
    .select('*')
    .eq('empresa_id', empresaId)
    .eq('wa_phone', waPhone)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const { data: newSession } = await supabase
    .from('whatsapp_sessoes')
    .insert({
      empresa_id: empresaId,
      wa_phone: waPhone,
      etapa: 'idle',
      dados: { carrinho: [] },
      conversa_id: conversaId || null,
    })
    .select()
    .single();

  return newSession;
}

async function updateSession(
  supabase: any,
  sessionId: string,
  etapa: string,
  dados?: any,
) {
  const update: any = {
    etapa,
    ultima_interacao: new Date().toISOString(),
  };
  if (dados !== undefined) {
    update.dados = dados;
  }
  await supabase.from('whatsapp_sessoes').update(update).eq('id', sessionId);
}

function formatEmpresaName(nome: string): string {
  return nome || 'nossa loja';
}

export async function handleMenuFlow(
  body: any,
  waPhone: string,
  empresaId: string,
  conversaId: string,
): Promise<void> {
  const supabase = createAdminClient();
  const config = await getConfig(supabase, empresaId);
  if (!config) return;

  const text = extractTextBody(body);
  const replyId = extractReplyId(body);
  const input = replyId || text || '';

  const session = await getOrCreateSession(supabase, empresaId, waPhone, conversaId);
  if (!session) return;

  await processInput(supabase, config, session, input);
}

async function processInput(
  supabase: any,
  config: WaConfig,
  session: Session,
  input: string,
): Promise<void> {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;
  const trimmed = input.trim().toLowerCase();

  switch (session.etapa) {
    case 'idle':
    case 'saudacao':
      if (isMenuTrigger(input)) {
        await sendCategories(supabase, config, session);
      }
      break;

    case 'categoria':
      if (trimmed.startsWith('cat_') || trimmed.startsWith('categoria_')) {
        const catId = trimmed.replace(/^(cat_|categoria_)/, '');
        await sendProducts(supabase, config, session, catId);
      } else if (
        trimmed === '__voltar_categorias__' ||
        isMenuTrigger(input)
      ) {
        await sendCategories(supabase, config, session);
      } else if (trimmed === '__ver_carrinho__') {
        await sendCartSummary(supabase, config, session);
      } else {
        await sendCategories(supabase, config, session);
      }
      break;

    case 'produto':
      if (trimmed.startsWith('prod_') || trimmed.startsWith('produto_')) {
        const prodId = trimmed.replace(/^(prod_|produto_)/, '');
        await askQuantity(supabase, config, session, prodId);
      } else if (trimmed === '__voltar_categorias__') {
        await sendCategories(supabase, config, session);
      } else if (trimmed === '__ver_carrinho__') {
        await sendCartSummary(supabase, config, session);
      } else if (trimmed.startsWith('__proxima_pagina__')) {
        const paginaAtual = session.dados?.pagina || 1;
        await sendProducts(supabase, config, session, session.dados?.categoria_id, paginaAtual + 1);
      } else {
        await sendText(phone_number_id, access_token, to, 'Escolha um produto da lista acima.');
      }
      break;

    case 'quantidade':
      if (trimmed.startsWith('qtd_')) {
        const qtd = parseInt(trimmed.replace('qtd_', ''), 10);
        if (qtd > 0) {
          await addToCart(supabase, config, session, qtd);
        }
      } else {
        const qtdManual = parseInt(trimmed, 10);
        if (qtdManual > 0 && qtdManual <= 999) {
          await addToCart(supabase, config, session, qtdManual);
        } else {
          await sendText(
            phone_number_id,
            access_token,
            to,
            'Por favor, informe um número válido (ex: 1, 2, 3...).',
          );
        }
      }
      break;

    case 'carrinho':
      if (trimmed === '__add_more__') {
        await sendCategories(supabase, config, session);
      } else if (trimmed === '__view_cart__') {
        await sendCartSummary(supabase, config, session);
      } else if (trimmed === '__checkout__') {
        await sendCheckoutType(supabase, config, session);
      } else {
        await sendCartActions(supabase, config, session);
      }
      break;

    case 'endereco':
      if (trimmed === '__delivery__') {
        await updateSession(supabase, session.id, 'endereco', {
          ...session.dados,
          tipo_entrega: 'delivery',
        });
        await sendText(
          phone_number_id,
          access_token,
          to,
          '📍 Informe seu *endereço completo* para entrega:\n\nEx: Rua Exemplo, 123 - Bairro, Cidade',
        );
      } else if (trimmed === '__pickup__') {
        const dados = { ...session.dados, tipo_entrega: 'retirada', endereco: null };
        await updateSession(supabase, session.id, 'forma_pagamento', dados);
        await sendPaymentMethods(supabase, config, session, dados);
      } else {
        const dados = { ...session.dados, tipo_entrega: 'delivery', endereco: input };
        await updateSession(supabase, session.id, 'forma_pagamento', dados);
        await sendPaymentMethods(supabase, config, session, dados);
      }
      break;

    case 'forma_pagamento':
      if (trimmed.startsWith('__payment_')) {
        const idx = parseInt(trimmed.replace('__payment_', ''), 10);
        const methods = ['dinheiro', 'cartao_credito', 'cartao_debito', 'pix', 'vale_refeicao'];
        const method = methods[idx] || 'dinheiro';
        const dados = { ...session.dados, forma_pagamento: method };
        await updateSession(supabase, session.id, 'confirmacao', dados);
        await sendConfirmation(supabase, config, session, dados);
      } else {
        await sendText(
          phone_number_id,
          access_token,
          to,
          'Escolha uma opção de pagamento válida.',
        );
      }
      break;

    case 'confirmacao':
      if (trimmed === '__confirm__') {
        await finalizeOrder(supabase, config, session);
      } else if (trimmed === '__cancel__') {
        await updateSession(supabase, session.id, 'idle', { carrinho: [] });
        await sendText(
          phone_number_id,
          access_token,
          to,
          '❌ Pedido cancelado. Envie *"cardápio"* para começar novamente.',
        );
      } else {
        await sendText(
          phone_number_id,
          access_token,
          to,
          'Confirme ou cancele o pedido usando os botões acima.',
        );
      }
      break;

    default:
      if (isMenuTrigger(input)) {
        await sendCategories(supabase, config, session);
      }
      break;
  }
}

async function sendText(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  text: string,
) {
  return sendWhatsAppMessage({ phone_number_id: phoneNumberId, access_token: accessToken }, to, text);
}

async function sendCategories(
  supabase: any,
  config: WaConfig,
  session: Session,
) {
  const { phone_number_id, access_token, mensagem_categorias, categorias_ativas } = config;
  const to = session.wa_phone;

  await updateSession(supabase, session.id, 'categoria', {
    ...session.dados,
    pagina: 1,
  });

  const query = supabase
    .from('categorias')
    .select('id, nome, descricao')
    .eq('empresa_id', config.empresa_id)
    .eq('ativo', true)
    .order('nome');

  if (categorias_ativas && categorias_ativas.length > 0) {
    query.in('id', categorias_ativas);
  }

  const { data: categorias } = await query;

  if (!categorias || categorias.length === 0) {
    await sendText(
      phone_number_id,
      access_token,
      to,
      '📭 Nenhuma categoria disponível no momento. Um atendente vai ajudar você em breve!',
    );
    return;
  }

  const categoriesList = categorias.map((c: any) => ({
    id: c.id,
    nome: c.nome,
    descricao: c.descricao,
  }));

  const msgPayload = buildCategoryList(
    categoriesList,
    '📋 Cardápio',
    mensagem_categorias.replace('{empresa}', config.empresa_id?.[0] || ''),
  );

  await sendInteractiveMessage(phone_number_id, access_token, to, msgPayload);
}

async function sendProducts(
  supabase: any,
  config: WaConfig,
  session: Session,
  categoriaId: string,
  pagina = 1,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;
  const PAGE_SIZE = 10;

  const { data: categoria } = await supabase
    .from('categorias')
    .select('nome')
    .eq('id', categoriaId)
    .single();

  const { count } = await supabase
    .from('produtos')
    .select('*', { count: 'exact', head: true })
    .eq('empresa_id', config.empresa_id)
    .eq('categoria_id', categoriaId)
    .eq('ativo', true);

  const totalPaginas = Math.max(1, Math.ceil((count || 0) / PAGE_SIZE));
  const from = (pagina - 1) * PAGE_SIZE;
  const toRow = from + PAGE_SIZE - 1;

  const { data: produtos } = await supabase
    .from('produtos')
    .select('id, nome, preco_venda, descricao')
    .eq('empresa_id', config.empresa_id)
    .eq('categoria_id', categoriaId)
    .eq('ativo', true)
    .order('nome')
    .range(from, toRow);

  if (!produtos || produtos.length === 0) {
    await sendText(
      phone_number_id,
      access_token,
      to,
      '📭 Nenhum produto nesta categoria. Escolha outra.',
    );
    return;
  }

  await updateSession(supabase, session.id, 'produto', {
    ...session.dados,
    categoria_id: categoriaId,
    pagina,
  });

  const productList = produtos.map((p: any) => ({
    id: p.id,
    nome: p.nome,
    preco: Number(p.preco_venda) || 0,
    descricao: p.descricao,
  }));

  const msgPayload = buildProductList(
    productList,
    categoria?.nome || 'Produtos',
    pagina,
    totalPaginas,
  );

  await sendInteractiveMessage(phone_number_id, access_token, to, msgPayload);
}

async function askQuantity(
  supabase: any,
  config: WaConfig,
  session: Session,
  produtoId: string,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;

  const { data: produto } = await supabase
    .from('produtos')
    .select('id, nome, preco_venda')
    .eq('id', produtoId)
    .single();

  if (!produto) {
    await sendText(phone_number_id, access_token, to, 'Produto não encontrado.');
    return;
  }

  await updateSession(supabase, session.id, 'quantidade', {
    ...session.dados,
    produto_selecionado: {
      id: produto.id,
      nome: produto.nome,
      preco: Number(produto.preco_venda) || 0,
    },
  });

  const max = Math.min(10, 10);
  const msgPayload = buildQuantityButtons(produto.nome, max);
  await sendInteractiveMessage(phone_number_id, access_token, to, msgPayload);
}

async function addToCart(
  supabase: any,
  config: WaConfig,
  session: Session,
  quantidade: number,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;
  const produto = session.dados?.produto_selecionado;

  if (!produto) {
    await sendText(phone_number_id, access_token, to, 'Erro: nenhum produto selecionado.');
    return;
  }

  const carrinho = [...(session.dados?.carrinho || [])];
  const existente = carrinho.findIndex((i: any) => i.id === produto.id);

  if (existente >= 0) {
    carrinho[existente].quantidade += quantidade;
  } else {
    carrinho.push({
      id: produto.id,
      nome: produto.nome,
      preco: produto.preco,
      quantidade,
    });
  }

  const dados = { ...session.dados, carrinho, produto_selecionado: null };
  await updateSession(supabase, session.id, 'carrinho', dados);

  const totalItens = carrinho.reduce((acc: number, i: any) => acc + i.quantidade, 0);

  await sendText(
    phone_number_id,
    access_token,
    to,
    `✅ *${quantidade}x ${produto.nome}* adicionado ao carrinho!\nTotal no carrinho: *${totalItens} itens*`,
  );

  await sendCartActions(supabase, config, session);
}

async function sendCartActions(
  supabase: any,
  config: WaConfig,
  session: Session,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;

  const msgPayload = buildCartActions();
  await sendInteractiveMessage(phone_number_id, access_token, to, msgPayload);
}

async function sendCartSummary(
  supabase: any,
  config: WaConfig,
  session: Session,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;
  const carrinho = session.dados?.carrinho || [];

  if (carrinho.length === 0) {
    await sendText(
      phone_number_id,
      access_token,
      to,
      '🛒 Seu carrinho está vazio. Envie *"cardápio"* para escolher produtos.',
    );
    await updateSession(supabase, session.id, 'idle', { carrinho: [] });
    return;
  }

  const total = carrinho.reduce((acc: number, i: any) => acc + i.preco * i.quantidade, 0);
  const itemsText = carrinho
    .map((i: any) => `• *${i.quantidade}x* ${i.nome} = R$ ${(i.preco * i.quantidade).toFixed(2)}`)
    .join('\n');

  await sendText(
    phone_number_id,
    access_token,
    to,
    `🛒 *SEU CARRINHO*\n\n${itemsText}\n\n*Total: R$ ${total.toFixed(2)}*`,
  );

  await sendCartActions(supabase, config, session);
}

async function sendCheckoutType(
  supabase: any,
  config: WaConfig,
  session: Session,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;
  const carrinho = session.dados?.carrinho || [];

  if (carrinho.length === 0) {
    await sendText(phone_number_id, access_token, to, 'Seu carrinho está vazio.');
    return;
  }

  await updateSession(supabase, session.id, 'endereco', session.dados);

  const msgPayload = buildCheckoutType();
  await sendInteractiveMessage(phone_number_id, access_token, to, msgPayload);
}

async function sendPaymentMethods(
  supabase: any,
  config: WaConfig,
  session: Session,
  dados: any,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;

  const { data: empresa } = await supabase
    .from('empresa_delivery_config')
    .select('aceita_dinheiro, aceita_cartao, aceita_pix')
    .eq('empresa_id', config.empresa_id)
    .maybeSingle();

  const methods: string[] = [];
  if (empresa?.aceita_pix) methods.push('💳 Pix');
  if (empresa?.aceita_cartao) methods.push('💳 Cartão');
  if (empresa?.aceita_dinheiro) methods.push('💵 Dinheiro');
  if (methods.length === 0) {
    methods.push('Pix', 'Cartão', 'Dinheiro');
  }

  const methodsPayload = methods.slice(0, 3).map((m, i) => ({
    type: 'reply' as const,
    reply: { id: `__payment_${i}__`, title: m.length > 20 ? m.substring(0, 20) : m },
  }));

  await sendInteractiveMessage(phone_number_id, access_token, to, {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: 'Escolha a forma de pagamento:' },
      action: { buttons: methodsPayload },
    },
  });
}

async function sendConfirmation(
  supabase: any,
  config: WaConfig,
  session: Session,
  dados: any,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;
  const carrinho = dados.carrinho || [];
  const total = carrinho.reduce((acc: number, i: any) => acc + i.preco * i.quantidade, 0);

  const msgs = buildConfirmation(carrinho, total, dados.endereco);

  for (const msg of msgs) {
    await sendInteractiveMessage(phone_number_id, access_token, to, msg);
  }
}

async function finalizeOrder(
  supabase: any,
  config: WaConfig,
  session: Session,
) {
  const { phone_number_id, access_token } = config;
  const to = session.wa_phone;
  const dados = session.dados;
  const carrinho = dados.carrinho || [];
  const total = carrinho.reduce((acc: number, i: any) => acc + i.preco * i.quantidade, 0);

  if (!carrinho.length) {
    await sendText(phone_number_id, access_token, to, 'Erro: carrinho vazio.');
    return;
  }

  try {
    const { data: configDelivery } = await supabase
      .from('empresa_delivery_config')
      .select('*')
      .eq('empresa_id', config.empresa_id)
      .maybeSingle();

    const { data: venda } = await supabase
      .from('vendas')
      .insert({
        empresa_id: config.empresa_id,
        tipo: 'delivery',
        canal: 'whatsapp',
        status: 'aberta',
        nome_cliente: dados.cliente_nome || `WhatsApp ${to}`,
        telefone_cliente: to,
        subtotal: total,
        taxa_entrega: dados.tipo_entrega === 'delivery' ? (configDelivery?.taxa_entrega_padrao || 0) : 0,
        total: total + (dados.tipo_entrega === 'delivery' ? (configDelivery?.taxa_entrega_padrao || 0) : 0),
        forma_pagamento: dados.forma_pagamento || 'dinheiro',
        entrega_logradouro: dados.tipo_entrega === 'delivery' ? (dados.endereco || '') : '',
      })
      .select()
      .single();

    if (!venda) throw new Error('Erro ao criar venda');

    const itens = carrinho.map((i: any) => ({
      venda_id: venda.id,
      empresa_id: config.empresa_id,
      produto_id: i.id,
      nome: i.nome,
      quantidade: i.quantidade,
      preco_unitario: i.preco,
      total: i.preco * i.quantidade,
    }));

    const { error: itensError } = await supabase.from('itens_venda').insert(itens);
    if (itensError) throw itensError;

    await supabase.from('logs').insert({
      empresa_id: config.empresa_id,
      acao: 'pedido_whatsapp_criado',
      detalhes: `Pedido via WhatsApp - ${to}`,
      tipo: 'venda',
    });

    await updateSession(supabase, session.id, 'finalizado', { carrinho: [] });

    const tipo = dados.tipo_entrega === 'delivery' ? '🚗 *Entrega*' : '🏪 *Retirada no local*';
    const taxa = dados.tipo_entrega === 'delivery' ? `\n🚚 Taxa: R$ ${(configDelivery?.taxa_entrega_padrao || 0).toFixed(2)}` : '';
    const enderecoStr = dados.tipo_entrega === 'delivery' ? `\n📍 Endereço: ${dados.endereco || '(informado)'}` : '';

    await sendText(
      phone_number_id,
      access_token,
      to,
      `✅ *PEDIDO CONFIRMADO!* 🎉\n\nPedido #${venda.id.substring(0, 8).toUpperCase()}\n\n📋 *Total:* R$ ${(total + (dados.tipo_entrega === 'delivery' ? (configDelivery?.taxa_entrega_padrao || 0) : 0)).toFixed(2)}${taxa}\n💳 *Pagamento:* ${dados.forma_pagamento}\n📦 *Tipo:* ${tipo}${enderecoStr}\n\nAguardamos seu pedido! ⏳`,
    );

    if (session.conversa_id) {
      await supabase
        .from('atendimento_mensagens')
        .insert({
          empresa_id: config.empresa_id,
          conversa_id: session.conversa_id,
          tipo: 'sistema',
          conteudo: `✅ Pedido #${venda.id.substring(0, 8).toUpperCase()} confirmado via WhatsApp!\nTotal: R$ ${(total + (dados.tipo_entrega === 'delivery' ? (configDelivery?.taxa_entrega_padrao || 0) : 0)).toFixed(2)}\nPagamento: ${dados.forma_pagamento}`,
        });
    }
  } catch (error) {
    console.error('[WhatsApp Bot] Error finalizing order:', error);
    await sendText(
      phone_number_id,
      access_token,
      to,
      '❌ Ocorreu um erro ao processar seu pedido. Um atendente vai ajudar você em breve!',
    );
  }
}
