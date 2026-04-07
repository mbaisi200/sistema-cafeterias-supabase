/**
 * API - Upload/Remove Product Image
 *
 * POST: Upload image to Supabase Storage and update produtos.foto
 * DELETE: Remove image from storage and clear produtos.foto
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'produto-imagens';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
  };
  return map[mimeType] || 'jpg';
}

/**
 * POST - Upload product image
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const empresaId = formData.get('empresaId') as string | null;
    const produtoId = formData.get('produtoId') as string | null;

    if (!file || !empresaId || !produtoId) {
      return NextResponse.json(
        { error: 'file, empresaId e produtoId são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use JPEG, PNG, WebP ou GIF.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 5MB.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Build storage path: {empresaId}/{produtoId}.{ext}
    const ext = getExtensionFromMimeType(file.type);
    const storagePath = `${empresaId}/${produtoId}.${ext}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload da imagem:', uploadError);
      return NextResponse.json(
        { error: 'Erro ao fazer upload da imagem' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(storagePath);

    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json(
        { error: 'Erro ao gerar URL pública' },
        { status: 500 }
      );
    }

    // Update produtos.foto with the public URL
    const { error: updateError } = await supabase
      .from('produtos')
      .update({ foto: publicUrl })
      .eq('id', produtoId)
      .eq('empresa_id', empresaId);

    if (updateError) {
      console.error('Erro ao atualizar foto do produto:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar foto do produto' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: storagePath,
    });
  } catch (error) {
    console.error('Erro no upload de imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove product image
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresaId, produtoId } = body;

    if (!empresaId || !produtoId) {
      return NextResponse.json(
        { error: 'empresaId e produtoId são obrigatórios' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current foto to know the storage path
    const { data: produto, error: fetchError } = await supabase
      .from('produtos')
      .select('foto')
      .eq('id', produtoId)
      .eq('empresa_id', empresaId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar produto:', fetchError);
      return NextResponse.json(
        { error: 'Produto não encontrado' },
        { status: 404 }
      );
    }

    // If there is a stored URL, try to remove from storage
    if (produto?.foto) {
      // Extract the path from the public URL
      // URL format: https://.../storage/v1/object/public/bucket/path
      const urlObj = new URL(produto.foto);
      const urlPath = urlObj.pathname;
      // Path starts with /storage/v1/object/public/bucketName/
      const prefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
      if (urlPath.startsWith(prefix)) {
        const storagePath = urlPath.slice(prefix.length);
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([storagePath]);
      }
    }

    // Clear foto field
    const { error: updateError } = await supabase
      .from('produtos')
      .update({ foto: null })
      .eq('id', produtoId)
      .eq('empresa_id', empresaId);

    if (updateError) {
      console.error('Erro ao remover foto do produto:', updateError);
      return NextResponse.json(
        { error: 'Erro ao remover foto do produto' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover imagem:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
