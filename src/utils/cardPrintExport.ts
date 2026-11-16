/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import saveAs from 'file-saver';
import { CardTemplate, StudentCardRecord, CardPrintConfig } from '../types/idcard';
import { drawCardFace, CARD_PX_WIDTH, CARD_PX_HEIGHT } from './cardRenderer';

export interface ExportProgressCallback {
  (current: number, total: number, message: string): void;
}

/**
 * Format safe filename for a student
 */
export function formatStudentCardFileName(
  student: StudentCardRecord,
  index: number,
  extension: string
): string {
  const n = String(index).padStart(3, '0');
  const serial = student.serialNumber ? student.serialNumber.trim() : '0000';
  const name = (student.studentName || 'STUDENT')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

  return `${n}_${serial}_${name}.${extension}`;
}

/**
 * Render card face to a canvas and get JPEG/PNG data URL
 */
async function renderCardSideToDataUrl(
  student: StudentCardRecord,
  template: CardTemplate,
  side: 'front' | 'back',
  mimeType: 'image/jpeg' | 'image/png' = 'image/jpeg',
  quality = 0.95
): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = CARD_PX_WIDTH;
  canvas.height = CARD_PX_HEIGHT;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to get 2D canvas context');
  }

  // Scale: 1063 / 90 ~ 11.8111 px/mm
  const scale = CARD_PX_WIDTH / template.w;
  await drawCardFace(ctx, side, student, template, scale, { showGuides: false });

  return canvas.toDataURL(mimeType, quality);
}

/**
 * Compute A4 sheet layout coordinates
 */
export function calculateA4SheetLayout(
  template: CardTemplate,
  config: CardPrintConfig
): {
  leftMargin: number;
  topMargin: number;
  totalBlockWidth: number;
  totalBlockHeight: number;
  fitsOnA4: boolean;
  slots: { xFront: number; xBack: number; y: number }[];
} {
  const A4_WIDTH = 210;
  const A4_HEIGHT = 297;
  const W = template.w;
  const H = template.h;
  const rows = config.rows;
  const rowGap = config.rowGap;
  const colGap = config.colGap;

  const totalBlockWidth = W * 2 + colGap;
  const totalBlockHeight = rows * H + (rows - 1) * rowGap;

  const leftMargin = (A4_WIDTH - totalBlockWidth) / 2;
  const topMargin = (A4_HEIGHT - totalBlockHeight) / 2;

  const fitsOnA4 = leftMargin >= 0 && topMargin >= 0;

  const slots: { xFront: number; xBack: number; y: number }[] = [];
  for (let r = 0; r < rows; r++) {
    const y = topMargin + r * (H + rowGap);
    const xFront = leftMargin;
    const xBack = leftMargin + W + colGap;
    slots.push({ xFront, xBack, y });
  }

  return {
    leftMargin,
    topMargin,
    totalBlockWidth,
    totalBlockHeight,
    fitsOnA4,
    slots,
  };
}

/**
 * 1. Export A4 Sheets PDF (portrait, 5 rows per sheet, front | back side by side)
 */
export async function exportA4SheetsPdf(
  students: StudentCardRecord[],
  template: CardTemplate,
  config: CardPrintConfig,
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const layout = calculateA4SheetLayout(template, config);
  const doc = new jsPDF({
    unit: 'mm',
    format: 'a4',
    orientation: 'portrait',
    compress: true,
  });

  const rowsPerSheet = config.rows;
  const totalSheets = Math.ceil(students.length / rowsPerSheet);

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    const sheetIndex = Math.floor(i / rowsPerSheet);
    const slotInSheet = i % rowsPerSheet;

    if (slotInSheet === 0 && sheetIndex > 0) {
      doc.addPage('a4', 'portrait');
    }

    if (onProgress) {
      onProgress(
        i + 1,
        students.length,
        `Rendering card ${i + 1} of ${students.length}: ${student.studentName || 'Student'}`
      );
    }

    // Render front and back side
    const frontJpeg = await renderCardSideToDataUrl(student, template, 'front', 'image/jpeg', 0.95);
    const backJpeg = await renderCardSideToDataUrl(student, template, 'back', 'image/jpeg', 0.95);

    const slot = layout.slots[slotInSheet];
    doc.addImage(frontJpeg, 'JPEG', slot.xFront, slot.y, template.w, template.h, undefined, 'FAST');
    doc.addImage(backJpeg, 'JPEG', slot.xBack, slot.y, template.w, template.h, undefined, 'FAST');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const pdfBlob = doc.output('blob');
  const fileName = `${template.name.replace(/[^A-Za-z0-9]/g, '_')}_A4_Sheets_${dateStr}.pdf`;
  saveAs(pdfBlob, fileName);

  return pdfBlob;
}

/**
 * 2. Export Single-card PDFs as a ZIP (one PDF per student, 180x58 mm pair or two pages)
 */
export async function exportSingleCardPdfsZip(
  students: StudentCardRecord[],
  template: CardTemplate,
  config: CardPrintConfig,
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('ID_Cards') || zip;
  const W = template.w;
  const H = template.h;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    if (onProgress) {
      onProgress(
        i + 1,
        students.length,
        `Generating single PDF ${i + 1} of ${students.length}: ${student.studentName || 'Student'}`
      );
    }

    const frontJpeg = await renderCardSideToDataUrl(student, template, 'front', 'image/jpeg', 0.95);
    const backJpeg = await renderCardSideToDataUrl(student, template, 'back', 'image/jpeg', 0.95);

    let doc: jsPDF;
    if (config.cardPdf === 'two') {
      // Page 1: front, Page 2: back
      doc = new jsPDF({
        unit: 'mm',
        format: [W, H],
        orientation: 'landscape',
        compress: true,
      });
      doc.addImage(frontJpeg, 'JPEG', 0, 0, W, H, undefined, 'FAST');
      doc.addPage([W, H], 'landscape');
      doc.addImage(backJpeg, 'JPEG', 0, 0, W, H, undefined, 'FAST');
    } else {
      // Default 'pair': 180x58 mm side by side (front left, back right)
      doc = new jsPDF({
        unit: 'mm',
        format: [W * 2, H],
        orientation: 'landscape',
        compress: true,
      });
      doc.addImage(frontJpeg, 'JPEG', 0, 0, W, H, undefined, 'FAST');
      doc.addImage(backJpeg, 'JPEG', W, 0, W, H, undefined, 'FAST');
    }

    const fileName = formatStudentCardFileName(student, i + 1, 'pdf');
    folder.file(fileName, doc.output('arraybuffer'));
  }

  if (onProgress) {
    onProgress(students.length, students.length, 'Compressing ZIP archive...');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
  const zipFileName = `${template.name.replace(/[^A-Za-z0-9]/g, '_')}_Single_Cards_${dateStr}.zip`;
  saveAs(zipBlob, zipFileName);

  return zipBlob;
}

/**
 * 3. Export PNG images as a ZIP (front & back PNG for each student)
 */
export async function exportCardPngsZip(
  students: StudentCardRecord[],
  template: CardTemplate,
  onProgress?: ExportProgressCallback
): Promise<Blob> {
  const zip = new JSZip();
  const folder = zip.folder('ID_Card_Images') || zip;

  for (let i = 0; i < students.length; i++) {
    const student = students[i];
    if (onProgress) {
      onProgress(
        i + 1,
        students.length,
        `Rendering high-res PNGs ${i + 1} of ${students.length}`
      );
    }

    const frontPngDataUrl = await renderCardSideToDataUrl(student, template, 'front', 'image/png');
    const backPngDataUrl = await renderCardSideToDataUrl(student, template, 'back', 'image/png');

    const frontBase64 = frontPngDataUrl.split(',')[1];
    const backBase64 = backPngDataUrl.split(',')[1];

    const frontName = formatStudentCardFileName(student, i + 1, 'png').replace('.png', '_front.png');
    const backName = formatStudentCardFileName(student, i + 1, 'png').replace('.png', '_back.png');

    folder.file(frontName, frontBase64, { base64: true });
    folder.file(backName, backBase64, { base64: true });
  }

  if (onProgress) {
    onProgress(students.length, students.length, 'Compressing PNG ZIP archive...');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const zipBlob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
  const zipFileName = `${template.name.replace(/[^A-Za-z0-9]/g, '_')}_Card_PNGs_${dateStr}.zip`;
  saveAs(zipBlob, zipFileName);

  return zipBlob;
}
