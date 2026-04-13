'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportColumn {
  header: string;
  accessor: (row: any) => string | number;
  width?: number;
  /** If true, this column will be automatically totalized (accessor must return number) */
  totalize?: boolean;
  /** Alignment for this column */
  align?: 'left' | 'center' | 'right';
}

export interface PDFExportOptions {
  title: string;
  subtitle?: string;
  columns: PDFExportColumn[];
  data: any[];
  filename?: string;
  orientation?: 'portrait' | 'landscape';
  logo?: string;
  companyInfo?: {
    name: string;
    cnpj?: string;
    phone?: string;
    email?: string;
  };
  summary?: { label: string; value: string | number }[];
  footerText?: string;
  /**
   * Total footer row configuration.
   * If provided, a styled "TOTAL" row is added at the bottom of the table.
   * - `label`: Text for the first column (e.g. "TOTAL GERAL")
   * - `columnTotals`: Explicit totals per column index. Format: Record<columnIndex, string|number>
   * - If columnTotals is omitted, columns with `totalize: true` are auto-summed from numeric accessor values
   */
  totals?: {
    label?: string;
    columnTotals?: Record<number, string | number>;
  };
}

/**
 * Helper: fetches an image URL and returns a base64 data-URI string
 * along with the natural width and height of the image (in pixels).
 * Returns `null` if the fetch fails or the response is not a valid image.
 */
async function loadLogoAsBase64(url: string): Promise<{ dataUrl: string; width: number; height: number } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const contentType = res.headers.get('content-type')?.split(';')[0] ?? '';
    if (!contentType.startsWith('image/')) return null;
    const blob = await res.blob();

    // Get base64 data-URI
    const dataUrl = await new Promise<string | null>((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string | null);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
    if (!dataUrl) return null;

    // Get natural dimensions of the image
    const dims = await new Promise<{ width: number; height: number } | null>((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    });
    if (!dims) return null;

    return { dataUrl, ...dims };
  } catch {
    return null;
  }
}

export async function exportToPDF(options: PDFExportOptions): Promise<void> {
  const {
    title,
    subtitle,
    columns,
    data,
    filename = 'relatorio',
    orientation = 'portrait',
    logo,
    companyInfo,
    summary,
    footerText,
    totals,
  } = options;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Logo or company name
  if (companyInfo) {
    let logoLoaded = false;
    let logoDrawH = 0;

    // Try to load and render the logo image if a URL was provided
    if (logo) {
      const logoResult = await loadLogoAsBase64(logo);
      if (logoResult) {
        const maxW = 18;
        const maxH = 18;
        // Calculate aspect-ratio-preserving dimensions within max bounds
        const ratio = logoResult.width / logoResult.height;
        let drawW: number;
        let drawH: number;
        if (ratio >= 1) {
          // Landscape or square: fit to max width
          drawW = maxW;
          drawH = maxW / ratio;
        } else {
          // Portrait: fit to max height
          drawH = maxH;
          drawW = maxH * ratio;
        }
        // Detect image format from the data-URI (e.g. "data:image/png;…")
        const imgFormat = logoResult.dataUrl.match(/data:image\/(\w+);/)?.[1]?.toUpperCase() as 'JPEG' | 'PNG' | 'WEBP' | 'GIF' | undefined;
        doc.addImage(logoResult.dataUrl, imgFormat ?? 'JPEG', 14, 12, drawW, drawH);
        logoLoaded = true;
        logoDrawH = drawH;
      }
    }

    // When a logo is rendered, shift the text block to the right
    const textX = logoLoaded ? 36 : 14;
    // Vertically center the text with the logo
    const textStartY = logoLoaded ? 12 + logoDrawH / 2 + 1 : y;
    let textY = textStartY;

    if (companyInfo.name) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(companyInfo.name, textX, textY);
      textY += 5;
    }
    if (companyInfo.cnpj || companyInfo.phone || companyInfo.email) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const infoParts = [companyInfo.cnpj, companyInfo.phone, companyInfo.email].filter(Boolean);
      if (infoParts.length > 0) {
        doc.text(infoParts.join('  |  '), textX, textY);
        textY += 2;
      }
      doc.setTextColor(0, 0, 0);
    }
    // Set y to below the logo block, ensuring no overlap
    y = logoLoaded ? Math.max(textY + 3, 12 + logoDrawH + 3) : textY + 3;
  }

  // Separator line
  doc.setDrawColor(200, 200, 200);
  doc.line(14, y, pageWidth - 14, y);
  y += 6;

  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  y += 6;

  // Subtitle
  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(subtitle, 14, y);
    doc.setTextColor(0, 0, 0);
    y += 6;
  }

  // Date/Time
  doc.setFontSize(8);
  doc.setTextColor(130, 130, 130);
  const now = new Date();
  doc.text(
    `Gerado em: ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR')}`,
    14, y
  );
  doc.setTextColor(0, 0, 0);
  y += 2;

  // Summary section
  if (summary && summary.length > 0) {
    y += 4;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo', 14, y);
    y += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    summary.forEach((item) => {
      doc.setFont('helvetica', 'bold');
      doc.text(`${item.label}:`, 14, y);
      doc.setFont('helvetica', 'normal');
      doc.text(String(item.value), 70, y, { align: 'left' });
      y += 5;
    });
    y += 2;
  }

  // Build table data
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((c) => c.accessor(row)));

  // Build footer row for totals
  let footRows: any[][] | undefined;
  if (totals) {
    const footerRow = columns.map((col, i) => {
      // Explicit columnTotals take priority
      if (totals.columnTotals && totals.columnTotals[i] !== undefined) {
        return String(totals.columnTotals[i]);
      }
      // Auto-sum for totalize columns (accessor must return number)
      if (col.totalize) {
        const sum = data.reduce((acc, row) => {
          const val = col.accessor(row);
          return acc + (typeof val === 'number' ? val : 0);
        }, 0);
        // Format with 2 decimal places
        return sum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      }
      // First column gets the label
      if (i === 0 && totals.label) {
        return totals.label;
      }
      return '';
    });
    footRows = [footerRow];
  }

  // Build column styles
  const columnStyles: Record<number, any> = {};
  columns.forEach((col, i) => {
    const style: any = {};
    if (col.width) style.cellWidth = col.width;
    if (col.align) style.halign = col.align;
    columnStyles[i] = style;
  });

  // Table
  autoTable(doc, {
    head: [headers],
    body: rows,
    foot: footRows,
    startY: y,
    margin: { left: 14, right: 14 },
    styles: {
      fontSize: 8,
      cellPadding: 2,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [41, 98, 255],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    footStyles: totals ? {
      fillColor: [220, 235, 255],
      textColor: [0, 40, 100],
      fontStyle: 'bold',
      fontSize: 8,
      lineWidth: 0.3,
      lineColor: [41, 98, 255],
    } : undefined,
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles,
    didDrawPage: (data) => {
      // Footer on each page
      if (footerText) {
        doc.setFontSize(7);
        doc.setTextColor(150, 150, 150);
        doc.text(
          footerText,
          doc.internal.pageSize.getWidth() / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: 'center' }
        );
      }
      // Page number
      doc.setFontSize(7);
      doc.setTextColor(150, 150, 150);
      const pageCount = doc.getNumberOfPages();
      doc.text(
        `Página ${data.pageNumber} de ${pageCount}`,
        doc.internal.pageSize.getWidth() - 14,
        doc.internal.pageSize.getHeight() - 8,
        { align: 'right' }
      );
    },
  });

  doc.save(`${filename}.pdf`);
}

// Helper: format currency for PDF
export function formatCurrencyPDF(value: number): string {
  return value?.toLocaleString('pt-BR', { minimumFractionDigits: 2, style: 'currency', currency: 'BRL' }) || 'R$ 0,00';
}

// Helper: format date for PDF
export function formatDatePDF(date: string | Date): string {
  if (!date) return '-';
  try {
    return new Date(date).toLocaleDateString('pt-BR');
  } catch {
    return '-';
  }
}

/**
 * Fetches empresa data from Supabase and returns PDF-ready info.
 * Use this to inject logo, companyInfo and footerText into exportToPDF calls.
 *
 * @param empresaId - The UUID of the empresa
 * @returns Object with logo, companyInfo and footerText to spread into exportToPDF options
 */
export async function fetchEmpresaPDFData(empresaId: string): Promise<{
  logo?: string;
  companyInfo?: PDFExportOptions['companyInfo'];
  footerText?: string;
}> {
  try {
    // Dynamic import to avoid issues in non-client contexts
    const { getSupabaseClient } = await import('@/lib/supabase');
    const supabase = getSupabaseClient();

    const { data } = await supabase
      .from('empresas')
      .select('nome, nome_marca, cnpj, telefone, email, logradouro, numero, complemento, bairro, cidade, estado, cep, logo_url')
      .eq('id', empresaId)
      .single();

    if (!data) return {};

    const empresaNome = data.nome_marca || data.nome || '';
    const empresaCNPJ = data.cnpj || '';
    const empresaTelefone = data.telefone || '';
    const empresaEmail = data.email || '';
    const empresaLogo = data.logo_url || '';

    const enderecoPartes = [data.logradouro, data.numero, data.complemento, data.bairro, data.cidade, data.estado].filter(Boolean);
    const empresaEndereco = enderecoPartes.join(', ');

    return {
      logo: empresaLogo || undefined,
      companyInfo: empresaNome ? {
        name: empresaNome,
        cnpj: empresaCNPJ ? `CNPJ: ${empresaCNPJ}` : undefined,
        phone: empresaTelefone,
        email: empresaEmail,
      } : undefined,
      footerText: empresaNome && empresaEndereco ? `${empresaNome} — ${empresaEndereco}` : undefined,
    };
  } catch {
    return {};
  }
}
