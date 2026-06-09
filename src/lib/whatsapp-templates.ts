interface CategoryItem {
  id: string;
  nome: string;
  descricao?: string;
}

interface ProductItem {
  id: string;
  nome: string;
  preco: number;
  descricao?: string;
}

export function sendInteractiveMessage(
  phoneNumberId: string,
  accessToken: string,
  to: string,
  payload: object,
): Promise<{ waMessageId: string } | null> {
  const META_API_BASE = 'https://graph.facebook.com/v22.0';

  return fetch(`${META_API_BASE}/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to.replace(/\D/g, ''),
      ...payload,
    }),
  }).then(async (res) => {
    if (!res.ok) {
      const err = await res.text();
      console.error('[WhatsApp Template] Error:', res.status, err);
      return null;
    }
    const data = await res.json();
    return { waMessageId: data.messages?.[0]?.id || '' };
  }).catch((err) => {
    console.error('[WhatsApp Template] Exception:', err);
    return null;
  });
}

export function buildTextMessage(text: string) {
  return {
    type: 'text',
    text: { preview_url: false, body: text },
  };
}

export function buildCategoryList(
  categories: CategoryItem[],
  headerText = '📋 Cardápio',
  bodyText = 'Escolha uma categoria abaixo:',
  footerText = 'Cardápio Digital',
): {
  type: 'interactive';
  interactive: {
    type: 'list';
    header: { type: 'text'; text: string };
    body: { text: string };
    footer: { text: string };
    action: { button: string; sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }> };
  };
} {
  return {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: headerText },
      body: { text: bodyText },
      footer: { text: footerText },
      action: {
        button: 'Ver categorias',
        sections: [
          {
            title: 'Categorias',
            rows: categories.map((c) => ({
              id: `cat_${c.id}`,
              title: c.nome.length > 24 ? c.nome.substring(0, 24) : c.nome,
              description: c.descricao
                ? c.descricao.length > 60 ? c.descricao.substring(0, 60) : c.descricao
                : undefined,
            })),
          },
        ],
      },
    },
  };
}

export function buildProductList(
  products: ProductItem[],
  categoriaNome: string,
  pagina = 1,
  totalPaginas = 1,
): {
  type: 'interactive';
  interactive: {
    type: 'list';
    header: { type: 'text'; text: string };
    body: { text: string };
    action: { button: string; sections: Array<{ title: string; rows: Array<{ id: string; title: string; description?: string }> }> };
  };
} {
  const rows = products.map((p) => ({
    id: `prod_${p.id}`,
    title: p.nome.length > 24 ? p.nome.substring(0, 24) : p.nome,
    description: `R$ ${p.preco.toFixed(2)}`,
  }));

  const sections: Array<{
    title: string;
    rows: Array<{ id: string; title: string; description?: string }>;
  }> = [
    {
      title: pagina > 1 ? `${categoriaNome} (pág ${pagina})` : categoriaNome,
      rows,
    },
  ];

  if (pagina < totalPaginas) {
    sections.push({
      title: 'Navegação',
      rows: [{ id: '__proxima_pagina__', title: '➡️ Próxima página' }],
    });
  }

  sections.push({
    title: 'Ações',
    rows: [
      { id: '__voltar_categorias__', title: '🔙 Voltar às categorias' },
      { id: '__ver_carrinho__', title: '🛒 Ver carrinho' },
    ],
  });

  return {
    type: 'interactive',
    interactive: {
      type: 'list',
      header: { type: 'text', text: `📋 ${categoriaNome}` },
      body: {
        text:
          products.length > 0
            ? `Clique no produto para adicionar ao carrinho:`
            : 'Nenhum produto encontrado nesta categoria.',
      },
      action: {
        button: 'Ver produtos',
        sections,
      },
    },
  };
}

export function buildQuantityButtons(produtoNome: string, max = 10) {
  const quantities = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].slice(0, max);
  const buttons = quantities.map((q) => ({
    type: 'reply' as const,
    reply: { id: `qtd_${q}`, title: `${q}x` },
  }));

  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: `Quantos *${produtoNome.substring(0, 100)}* você quer?` },
      action: { buttons },
    },
  };
}

export function buildCartActions() {
  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: 'O que deseja fazer?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: '__add_more__', title: '➕ Adicionar mais' } },
          { type: 'reply', reply: { id: '__view_cart__', title: '🛒 Ver carrinho' } },
          { type: 'reply', reply: { id: '__checkout__', title: '✅ Fechar pedido' } },
        ],
      },
    },
  };
}

export function buildCheckoutType() {
  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: 'Como você quer receber?' },
      action: {
        buttons: [
          { type: 'reply', reply: { id: '__delivery__', title: '🚗 Entrega' } },
          { type: 'reply', reply: { id: '__pickup__', title: '🏪 Retirar' } },
        ],
      },
    },
  };
}

export function buildPaymentMethods(methods: string[]) {
  const buttons = methods.slice(0, 3).map((m, i) => ({
    type: 'reply' as const,
    reply: {
      id: `__payment_${i}__`,
      title: m.length > 20 ? m.substring(0, 20) : m,
    },
  }));

  return {
    type: 'interactive',
    interactive: {
      type: 'button',
      body: { text: 'Escolha a forma de pagamento:' },
      action: { buttons },
    },
  };
}

export function buildConfirmation(carrinho: Array<{ nome: string; quantidade: number; preco: number }>, total: number, endereco?: string) {
  let itemsText = carrinho
    .map((i) => `${i.quantidade}x ${i.nome} = R$ ${(i.quantidade * i.preco).toFixed(2)}`)
    .join('\n');

  let summary = `📋 *RESUMO DO PEDIDO*\n\n${itemsText}\n\n*Total: R$ ${total.toFixed(2)}*`;

  if (endereco) {
    summary += `\n📍 *Entrega:* ${endereco}`;
  } else {
    summary += '\n🏪 *Retirada no local*';
  }

  summary += '\n\nConfirma o pedido?';

  return [
    { type: 'text', text: { preview_url: false, body: summary } },
    {
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: 'Confirmar ou cancelar?' },
        action: {
          buttons: [
            { type: 'reply', reply: { id: '__confirm__', title: '✅ Confirmar' } },
            { type: 'reply', reply: { id: '__cancel__', title: '❌ Cancelar' } },
          ],
        },
      },
    },
  ];
}

export function buildTextOnly(text: string) {
  return [{ type: 'text', text: { preview_url: false, body: text } }];
}
