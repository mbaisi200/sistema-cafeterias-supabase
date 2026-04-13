/**
 * API - Upload/Remove Empresa Logo
 *
 * POST: Upload logo image to Supabase Storage and update empresas.logo_url
 * DELETE: Remove logo from storage and clear empresas.logo_url
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

const BUCKET_NAME = 'empresa-logos';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

function getExtensionFromMimeType(mimeType: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/svg+xml': 'svg',
  };
  return map[mimeType] || 'png';
}

/**
 * POST - Upload empresa logo
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const empresaId = formData.get('empresaId') as string | null;

    if (!file || !empresaId) {
      return NextResponse.json(
        { error: 'file e empresaId são obrigatórios' },
        { status: 400 }
      );
    }

    // Validate mime type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Tipo de arquivo inválido. Use JPEG, PNG, WebP, GIF ou SVG.' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Tamanho máximo: 2MB.' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Build storage path: {empresaId}/logo.{ext}
    const ext = getExtensionFromMimeType(file.type);
    const storagePath = `${empresaId}/logo.${ext}`;

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload to Supabase Storage (upsert to overwrite existing)
    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Erro ao fazer upload do logo:', uploadError);
      return NextResponse.json(
        { error: 'Erro ao fazer upload do logo' },
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

    // Update empresas.logo_url with the public URL
    const { error: updateError } = await supabase
      .from('empresas')
      .update({ logo_url: publicUrl, atualizado_em: new Date().toISOString() })
      .eq('id', empresaId);

    if (updateError) {
      console.error('Erro ao atualizar logo da empresa:', updateError);
      return NextResponse.json(
        { error: 'Erro ao atualizar logo da empresa' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      url: publicUrl,
      path: storagePath,
    });
  } catch (error) {
    console.error('Erro no upload do logo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Remove empresa logo
 */
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { empresaId } = body;

    if (!empresaId) {
      return NextResponse.json(
        { error: 'empresaId é obrigatório' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Get current logo_url to know the storage path
    const { data: empresa, error: fetchError } = await supabase
      .from('empresas')
      .select('logo_url')
      .eq('id', empresaId)
      .single();

    if (fetchError) {
      console.error('Erro ao buscar empresa:', fetchError);
      return NextResponse.json(
        { error: 'Empresa não encontrada' },
        { status: 404 }
      );
    }

    // If there is a stored URL, try to remove from storage
    if (empresa?.logo_url) {
      const urlObj = new URL(empresa.logo_url);
      const urlPath = urlObj.pathname;
      const prefix = `/storage/v1/object/public/${BUCKET_NAME}/`;
      if (urlPath.startsWith(prefix)) {
        const storagePath = urlPath.slice(prefix.length);
        await supabase.storage
          .from(BUCKET_NAME)
          .remove([storagePath]);
      }
    }

    // Clear logo_url field
    const { error: updateError } = await supabase
      .from('empresas')
      .update({ logo_url: null, atualizado_em: new Date().toISOString() })
      .eq('id', empresaId);

    if (updateError) {
      console.error('Erro ao remover logo da empresa:', updateError);
      return NextResponse.json(
        { error: 'Erro ao remover logo da empresa' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Erro ao remover logo:', error);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
