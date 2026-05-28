import { NextRequest, NextResponse } from 'next/server';
import { notifyIntegration, getAcaoFromStatus } from '@/services/integrations/notify-integration';

export async function POST(request: NextRequest) {
  try {
    const { empresaId, vendaId, orderExternalId, origem, status, motivo } = await request.json();

    if (!empresaId || !origem || !status) {
      return NextResponse.json({ notified: false, error: 'Parâmetros obrigatórios: empresaId, origem, status' }, { status: 400 });
    }

    if (origem === 'cardapio') {
      return NextResponse.json({ notified: false, motivo: 'Cardápio Online não tem API externa' });
    }

    const acao = getAcaoFromStatus(status);
    if (!acao) {
      return NextResponse.json({ notified: false, error: `Status sem ação mapeada: ${status}` });
    }

    const result = await notifyIntegration({
      empresaId,
      vendaId,
      orderExternalId: orderExternalId || vendaId,
      origem,
      acao,
      motivo,
    });

    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ notified: false, error: String(error) }, { status: 500 });
  }
}
