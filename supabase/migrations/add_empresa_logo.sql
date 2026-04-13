-- =====================================================
-- Migration: Empresa Logo Support
-- 1. Garante colunas logo_url e nome_marca na tabela empresas
-- 2. Cria bucket de storage para logos
-- =====================================================

-- 1. Garantir colunas na tabela empresas
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE empresas ADD COLUMN IF NOT EXISTS nome_marca VARCHAR(100);

-- 2. Criar bucket de storage para logos de empresas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'empresa-logos',
  'empresa-logos',
  true,
  2097152, -- 2MB (suficiente para logos)
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- 3. RLS: Leitura pública para logos
CREATE POLICY "Logos publicos para leitura" ON storage.objects
  FOR SELECT USING (bucket_id = 'empresa-logos');

-- 4. RLS: Upload autenticado
CREATE POLICY "Autenticado pode inserir logos" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'empresa-logos' AND auth.role() = 'authenticated');

-- 5. RLS: Update autenticado
CREATE POLICY "Autenticado pode atualizar logos" ON storage.objects
  FOR UPDATE USING (bucket_id = 'empresa-logos' AND auth.role() = 'authenticated');

-- 6. RLS: Delete autenticado
CREATE POLICY "Autenticado pode deletar logos" ON storage.objects
  FOR DELETE USING (bucket_id = 'empresa-logos' AND auth.role() = 'authenticated');
