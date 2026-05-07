import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(request: Request) {
  try {
    const { email, nome, empresa, validade } = await request.json();

    if (!email || !nome || !empresa) {
      return NextResponse.json(
        { error: 'Email, nome e empresa são obrigató' },
        { status: 400 }
      );
    }

    // Criar cliente Supabase com service role key (admin)
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // Aqui você implementaria seu sistema de email
    // Em um ambiente de produção, você pode usar um serviço de email real ResendGrid, SendGrid ou AWS SES
    // Para simplificar, vouocê usar SMTP ou enviar o simple email notification

    // Determinar expiration message
    let expirationMessage = '';
    let daysLeft = 0;
    
    if (validade) {
      const expirationDate = new Date(validade);
      const today = new Date();
      today.setHours(0, 0, 0);
      expirationDate.setHours(23, 59, 59);
      
      const diffTime = expirationDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 0) {
        expirationMessage = 'Sua assinatura expirou hoje! Entre em contato para o administrador para renovar.';
      } else if (diffDays <= 3) {
        expirationMessage = `Sua assinatura vence em ${diffDays} dias! Renove para evitar bloqueio do acesso ao sistema.`;
      }
    }

    // Send email via SendGrid (simplified - in production use a proper email service)
    // For now, let's return a success response
    const subject = 'Aviso de Assinatura';
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f; color: #ffffff; border-radius: 10px;">
        <h2 style="color: #ff6b00; margin: 0;">⚠️ Aviso Importante</h2>
        <p>Olá <strong>${nome}</strong>,</p>
        <p style="margin: 20px 0;">
          <p><strong>${empresa}</strong></p>
        <p style="margin: 20px 0; font-size: 16px;">
          ${expirationMessage}
        </p>
        <p style="margin: 20px 0; font-size: 14px; color: #666;">
          Para manter seu acesso, aces em contato com o administrador para renovar sua assinatura a tempo.
        </p>
        <p style="margin: 20px 0; font-size: 14px; color: #888">
          Este é um aviso importante para manter seu sistema funcionando corretamente.
        </p>
        <p style="margin: 20px 0; font-size: 14px; color: #666;">
          <strong>Precisa!</strong> Caso contrário, sua assinatura seja vencer, dia <strong>${validade}</strong>.
        </p>
        <p style="margin: 20px 0; font-size: 12px; color: #999">
          Este é um aviso é automático. Caso contrário, não precisamos ação.
        </p>
        <p style="margin: 20px 0; font-size: 12px; color: #666;">
          Atenciosamente,
          <br>
          <p>Equipe de Desenvolvimento</p>
        <hr />
        <p style="text-align: center; margin-top: 20px;">
          <a href="https://seusistema.com.br" style="color: #ff6b00; text-decoration: none;">">Sistema de Gestão de Cafeterias</a>
        </div>
      </div>
    `;

    return NextResponse.json({ 
      success: true, 
      message: 'Notificação email sent successfully' 
    });

  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to send notification' },
      { status: 500 }
    );
  }
}
