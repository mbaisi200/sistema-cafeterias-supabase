-- ============================================================
-- MIGRATION: Dispositivos e Segurança (Device Binding)
-- Execute no SQL Editor do Supabase Dashboard
-- ============================================================

-- 1. Adicionar coluna restringir_dispositivos na tabela empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS restringir_dispositivos BOOLEAN DEFAULT false;

-- 2. Tabela de Dispositivos do Usuário
CREATE TABLE IF NOT EXISTS dispositivos_usuario (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES empresas(id) ON DELETE CASCADE,
  usuario_id UUID,
  usuario_nome VARCHAR(200),
  device_id VARCHAR(255) NOT NULL,
  device_name VARCHAR(255),
  user_agent TEXT,
  ip_address VARCHAR(45),
  ativo BOOLEAN DEFAULT true,
  ultimo_acesso TIMESTAMPTZ DEFAULT now(),
  criado_em TIMESTAMPTZ DEFAULT now(),
  atualizado_em TIMESTAMPTZ DEFAULT now()
);

-- 3. Criar índices
CREATE INDEX IF NOT EXISTS idx_dispositivos_empresa ON dispositivos_usuario(empresa_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_device ON dispositivos_usuario(device_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_usuario ON dispositivos_usuario(usuario_id);
CREATE INDEX IF NOT EXISTS idx_dispositivos_empresa_device ON dispositivos_usuario(empresa_id, device_id);

-- 4. RLS
ALTER TABLE dispositivos_usuario ENABLE ROW LEVEL SECURITY;

-- Políticas para dispositivos_usuario
CREATE POLICY "dispositivos_select_empresa" ON dispositivos_usuario
  FOR SELECT
  USING (
    empresa_id = get_user_empresa_id()
    OR is_master()
  );

CREATE POLICY "dispositivos_insert_empresa" ON dispositivos_usuario
  FOR INSERT
  WITH CHECK (
    empresa_id = get_user_empresa_id()
    OR is_master()
  );

CREATE POLICY "dispositivos_update_empresa" ON dispositivos_usuario
  FOR UPDATE
  USING (
    empresa_id = get_user_empresa_id()
    OR is_master()
  );

CREATE POLICY "dispositivos_delete_empresa" ON dispositivos_usuario
  FOR DELETE
  USING (
    empresa_id = get_user_empresa_id()
    OR is_master()
  );

-- 5. Trigger para atualizar o campo atualizado_em
CREATE OR REPLACE FUNCTION dispositivos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_dispositivos_updated_at ON dispositivos_usuario;
CREATE TRIGGER set_dispositivos_updated_at
  BEFORE UPDATE ON dispositivos_usuario
  FOR EACH ROW
  EXECUTE FUNCTION dispositivos_updated_at();

-- 6. Inserir seção de menu para 'Dispositivos'
INSERT INTO secoes_menu (chave, nome, descricao, icone, url, grupo, ordem, ativo, obrigatoria, visivel_para) VALUES
  ('dispositivos', 'Dispositivos', 'Segurança de dispositivos e controle de acesso', 'Shield', '/admin/dispositivos', 'principal', 20, true, false, ARRAY['admin'])
ON CONFLICT (chave) DO NOTHING;
