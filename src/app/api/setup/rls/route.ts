import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST() {
  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Verificar se o usuário master existe
    const { data: usuarios, error: checkError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', 'baisinextel@gmail.com')
      .single();

    if (checkError) {
    } else {
    }

    // O RLS precisa ser configurado diretamente no Supabase SQL Editor
    // Vamos retornar instruções e verificar se a conexão está ok

    // Testar se consegue ler com service role
    const { data: allUsers, error: listError } = await supabase
      .from('usuarios')
      .select('*');

    if (listError) {
      return NextResponse.json({
        success: false,
        message: 'Erro ao acessar tabela usuarios: ' + listError.message
      });
    }

    // Instrução para configurar RLS
    const sqlInstrucoes = `
-- Execute este SQL no SQL Editor do Supabase:

-- 1. Habilitar RLS
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas (se existirem)
DROP POLICY IF EXISTS "Usuarios podem ler proprio registro" ON usuarios;
DROP POLICY IF EXISTS "Service role acesso total" ON usuarios;

-- 3. Criar política para usuários lerem próprio registro
CREATE POLICY "Usuarios podem ler proprio registro" ON usuarios
FOR SELECT USING (auth_user_id = auth.uid());

-- 4. Política para service role (admin)
CREATE POLICY "Service role acesso total" ON usuarios
FOR ALL USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- 5. Repetir para empresas
ALTER TABLE empresas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Empresas leitura por usuarios" ON empresas
FOR SELECT USING (true);

-- 6. Para funcionarios
ALTER TABLE funcionarios ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Funcionarios leitura" ON funcionarios
FOR SELECT USING (true);
`;

    return NextResponse.json({
      success: true,
      message: `${allUsers?.length || 0} usuário(s) encontrado(s). RLS precisa ser configurado manualmente.`,
      usuarios: allUsers,
      sqlInstrucoes: sqlInstrucoes.trim(),
      instrucao: 'Execute o SQL abaixo no SQL Editor do Supabase para configurar o RLS'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Erro interno: ' + (error instanceof Error ? error.message : 'Erro desconhecido')
    });
  }
}
