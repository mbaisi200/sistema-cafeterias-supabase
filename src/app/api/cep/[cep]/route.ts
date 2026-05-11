import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ cep: string }> }
) {
  const { cep } = await params;
  const cepLimpo = cep.replace(/\D/g, '');

  if (cepLimpo.length !== 8) {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '400', mensagem: 'CEP deve ter 8 dígitos' } },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`, {
      next: { revalidate: 86400 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'VIA_CEP_ERRO', mensagem: 'Erro ao consultar ViaCEP' } },
        { status: 502 }
      );
    }

    const data = await res.json();

    if (data.erro) {
      return NextResponse.json(
        { sucesso: false, erro: { codigo: 'CEP_NAO_ENCONTRADO', mensagem: 'CEP não encontrado' } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      sucesso: true,
      cep: data.cep,
      logradouro: data.logradouro || '',
      complemento: data.complemento || '',
      bairro: data.bairro || '',
      localidade: data.localidade || '',
      uf: data.uf || '',
      ibge: data.ibge || '',
    });
  } catch {
    return NextResponse.json(
      { sucesso: false, erro: { codigo: '500', mensagem: 'Erro ao consultar ViaCEP' } },
      { status: 500 }
    );
  }
}
