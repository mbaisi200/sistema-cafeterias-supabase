-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'produto-imagens',
  'produto-imagens',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
) ON CONFLICT (id) DO NOTHING;

-- RLS: Allow authenticated users to upload/manage images
CREATE POLICY "Imagens publicas para leitura" ON storage.objects
  FOR SELECT USING (bucket_id = 'produto-imagens');

CREATE POLICY "Admin pode inserir imagens" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'produto-imagens' AND auth.role() = 'authenticated');

CREATE POLICY "Admin pode atualizar imagens" ON storage.objects
  FOR UPDATE USING (bucket_id = 'produto-imagens' AND auth.role() = 'authenticated');

CREATE POLICY "Admin pode deletar imagens" ON storage.objects
  FOR DELETE USING (bucket_id = 'produto-imagens' AND auth.role() = 'authenticated');
