'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface PDFExportColumn {
  header: string;
  accessor: (row: any) => string | number;
  width?: number;
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
}

export function exportToPDF(options: PDFExportOptions) {
  const {
    title,
    subtitle,
    columns,
    data,
    filename = 'relatorio',
    orientation = 'portrait',
    companyInfo,
    summary,
    footerText,
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
    if (companyInfo.name) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(companyInfo.name, 14, y);
      y += 5;
    }
    if (companyInfo.cnpj || companyInfo.phone || companyInfo.email) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const infoParts = [companyInfo.cnpj, companyInfo.phone, companyInfo.email].filter(Boolean);
      if (infoParts.length > 0) {
        doc.text(infoParts.join('  |  '), 14, y);
        y += 2;
      }
      doc.setTextColor(0, 0, 0);
    }
    y += 3;
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

  // Table
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((c) => c.accessor(row)));

  autoTable(doc, {
    head: [headers],
    body: rows,
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
    alternateRowStyles: {
      fillColor: [245, 247, 250],
    },
    columnStyles: columns.reduce((acc, col, i) => {
      if (col.width) acc[i] = { cellWidth: col.width };
      return acc;
    }, {} as Record<number, { cellWidth?: number }>),
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
