/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker
if (typeof window !== 'undefined') {
  try {
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;
  } catch {
    // Fallback if needed
  }
}

export interface RenderedPdfPage {
  pageIndex: number;
  totalPages: number;
  dataUrl: string;
  width: number;
  height: number;
}

/**
 * Renders each page of a PDF file to high-resolution PNG image (scale 2).
 */
export async function renderPdfToImages(file: File): Promise<RenderedPdfPage[]> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdfDocument = await loadingTask.promise;
  const numPages = pdfDocument.numPages;

  const pages: RenderedPdfPage[] = [];

  for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    const page = await pdfDocument.getPage(pageNum);
    const scale = 2.0; // Render at high resolution scale 2
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error(`Failed to create 2D canvas context for PDF page ${pageNum}`);
    }

    // Render PDF page to canvas
    await page.render({
      canvas: canvas,
      canvasContext: context,
      viewport: viewport,
    }).promise;

    const dataUrl = canvas.toDataURL('image/png');
    pages.push({
      pageIndex: pageNum,
      totalPages: numPages,
      dataUrl,
      width: viewport.width,
      height: viewport.height,
    });
  }

  return pages;
}
