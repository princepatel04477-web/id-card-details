/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  Printer,
  FileArchive,
  FileSpreadsheet,
  FileText,
  FileDown,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle2,
  Settings2,
  RefreshCw,
  Info,
} from 'lucide-react';
import {
  StudentCardRecord,
  CardTemplate,
  CardPrintConfig,
} from '../../types/idcard';
import { FormRecord } from '../../types/icard';
import {
  exportA4SheetsPdf,
  exportSingleCardPdfsZip,
  exportCardPngsZip,
} from '../../utils/cardPrintExport';
import { exportApprovedStudentsToExcel } from '../../utils/excelExport';
import { exportAllApprovedDocx } from '../../utils/docxExport';
import { exportCsvAndPhotosZip } from '../../utils/csvExport';

interface PrintScreenProps {
  students: StudentCardRecord[];
  forms: FormRecord[];
  template: CardTemplate;
  onGoBackToCheck: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const PrintScreen: React.FC<PrintScreenProps> = ({
  students,
  forms,
  template,
  onGoBackToCheck,
  onShowToast,
}) => {
  const [printConfig, setPrintConfig] = useState<CardPrintConfig>({
    rows: 5,
    rowGap: 1.0,
    colGap: 0.0,
    cardPdf: 'pair',
    pattern: '{n}_{serialNumber}_{studentName}',
  });

  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState('');
  const [dataFilesOpen, setDataFilesOpen] = useState(false);

  // Ready vs unready counts
  const readyStudents = students.filter((s) => s.includeInPrint);
  const unreadyCount = students.length - readyStudents.length;

  // Render a live preview thumbnail of the first sheet onto a canvas
  const sheetCanvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    async function drawSheetPreview() {
      const canvas = sheetCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Draw portrait A4 sheet preview (scaled to canvas 420 x 594 px)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw faint page border and margins
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);

      // Render miniature representation of up to 5 rows of cards
      const sampleStudents = students.slice(0, 5);
      const rowHeight = 100;
      const startY = 15;

      for (let i = 0; i < sampleStudents.length; i++) {
        const y = startY + i * (rowHeight + 4);
        // Front card placeholder
        ctx.fillStyle = '#f8fafc';
        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 0.8;
        ctx.fillRect(30, y, 170, 95);
        ctx.strokeRect(30, y, 170, 95);

        // Back card placeholder
        ctx.fillRect(210, y, 170, 95);
        ctx.strokeRect(210, y, 170, 95);

        // Text preview
        ctx.fillStyle = '#1e3a8a';
        ctx.font = 'bold 9px sans-serif';
        ctx.fillText(sampleStudents[i].studentName || `Student ${i + 1}`, 40, y + 25);
        ctx.fillStyle = '#64748b';
        ctx.font = '8px sans-serif';
        ctx.fillText(`Adm: ${sampleStudents[i].serialNumber || '—'}`, 40, y + 42);
        ctx.fillText(`Class: ${sampleStudents[i].classSection || '—'}`, 40, y + 55);

        // Back card preview
        ctx.fillStyle = '#475569';
        ctx.fillText('Authorised Pick-up', 220, y + 25);
      }
    }
    drawSheetPreview();
  }, [students, printConfig, template]);

  // Handlers for Exports
  const handleExportA4Pdf = async () => {
    setIsExporting(true);
    setExportMessage('Generating A4 Sheets PDF at 300 DPI…');
    try {
      await exportA4SheetsPdf(
        readyStudents,
        template,
        printConfig,
        (curr, tot) => setExportMessage(`Rendering card ${curr} of ${tot}…`)
      );
      onShowToast('A4 Sheets PDF downloaded successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export PDF: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportMessage('');
    }
  };

  const handleExportSinglePdfs = async () => {
    setIsExporting(true);
    setExportMessage('Generating Individual Card PDFs…');
    try {
      await exportSingleCardPdfsZip(
        readyStudents,
        template,
        printConfig,
        (curr, tot) => setExportMessage(`Generating PDF ${curr} of ${tot}…`)
      );
      onShowToast('Single Card PDFs ZIP downloaded!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export ZIP: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportMessage('');
    }
  };

  const handleExportPngZip = async () => {
    setIsExporting(true);
    setExportMessage('Generating PNG images ZIP…');
    try {
      await exportCardPngsZip(readyStudents, template, (curr, tot) =>
        setExportMessage(`Rendering image ${curr} of ${tot}…`)
      );
      onShowToast('PNG images ZIP downloaded!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export PNGs: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportMessage('');
    }
  };

  const handleExportExcelWithPhotos = async () => {
    setIsExporting(true);
    setExportMessage('Generating Excel spreadsheet with embedded photos…');
    try {
      await exportApprovedStudentsToExcel(forms);
      onShowToast('Excel file downloaded successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export Excel: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportMessage('');
    }
  };

  const handleExportDocx = async () => {
    setIsExporting(true);
    setExportMessage('Generating editable Word DOCX…');
    try {
      await exportAllApprovedDocx(forms, {
        includeOriginalScan: true,
        highlightUncertainFields: false,
      });
      onShowToast('DOCX document downloaded successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export DOCX: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportMessage('');
    }
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    setExportMessage('Generating CSV and photos ZIP…');
    try {
      await exportCsvAndPhotosZip(forms);
      onShowToast('CSV + photos ZIP downloaded successfully!', 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export CSV: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportMessage('');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto px-4 py-8 sm:py-10 bg-slate-50 flex flex-col items-center">
      <div className="w-full max-w-4xl flex flex-col items-center">
        {/* Top Summary Banner */}
        <div className="w-full bg-white rounded-2xl border border-slate-200 p-5 shadow-xs mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900 leading-tight">
                {readyStudents.length} cards ready
                {unreadyCount > 0 ? ` · ${unreadyCount} still need checking` : ''}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Print ready at 300 DPI high-definition resolution with exact millimeter alignment.
              </p>
            </div>
          </div>

          {unreadyCount > 0 && (
            <button
              type="button"
              onClick={onGoBackToCheck}
              className="px-4 py-2 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              Fix now &rarr;
            </button>
          )}
        </div>

        {/* Export In Progress Toast / Bar */}
        {isExporting && (
          <div className="w-full mb-6 p-4 rounded-xl bg-blue-50 border border-blue-200 flex items-center gap-3 text-blue-900 text-sm font-semibold animate-pulse">
            <RefreshCw className="w-5 h-5 animate-spin text-[#1e3a8a]" />
            <span>{exportMessage}</span>
          </div>
        )}

        {/* 3 Large Option Cards */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Option 1: Print sheets (A4 PDF) - Highlighted with ONE primary button */}
          <div className="bg-white rounded-2xl border-2 border-[#1e3a8a] p-6 shadow-md flex flex-col justify-between relative">
            <div className="absolute -top-3 left-6 bg-[#1e3a8a] text-white text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full">
              Recommended
            </div>

            <div>
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center mb-4">
                <Printer className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Print sheets (A4 PDF)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Standard A4 portrait sheets. 5 students per sheet with front and back side-by-side, ready for duplex printing.
              </p>
            </div>

            <button
              type="button"
              disabled={isExporting || readyStudents.length === 0}
              onClick={handleExportA4Pdf}
              className="w-full py-3 px-4 bg-[#1e3a8a] hover:bg-blue-900 active:bg-blue-950 text-white font-bold rounded-xl text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <Printer className="w-4 h-4" />
              <span>Print sheets (A4 PDF)</span>
            </button>
          </div>

          {/* Option 2: Individual Card PDFs (ZIP) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
                <FileArchive className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Individual card PDFs
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                One PDF per student (180 &times; 58 mm) inside a single ZIP file, labeled with admission number and name.
              </p>
            </div>

            <button
              type="button"
              disabled={isExporting || readyStudents.length === 0}
              onClick={handleExportSinglePdfs}
              className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-sm border border-slate-300 transition-all flex items-center justify-center gap-2 min-h-[44px] disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>Download PDFs (ZIP)</span>
            </button>
          </div>

          {/* Option 3: Data files Menu */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs flex flex-col justify-between relative">
            <div>
              <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center mb-4">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-1">
                Data files
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed mb-6">
                Export records into Excel spreadsheet (with photos in cells), Word DOCX, or plain CSV format.
              </p>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() => setDataFilesOpen(!dataFilesOpen)}
                className="w-full py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 font-semibold rounded-xl text-sm border border-slate-300 transition-all flex items-center justify-between min-h-[44px]"
              >
                <span>Export Data files</span>
                <ChevronDown className="w-4 h-4 text-slate-400" />
              </button>

              {dataFilesOpen && (
                <div className="absolute bottom-14 left-0 right-0 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-40 text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setDataFilesOpen(false);
                      handleExportExcelWithPhotos();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                    <span>Excel with photos (.xlsx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDataFilesOpen(false);
                      handleExportDocx();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
                  >
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>Word Document (.docx)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDataFilesOpen(false);
                      handleExportCsv();
                    }}
                    className="w-full text-left px-4 py-2.5 hover:bg-slate-50 flex items-center gap-2.5 text-slate-700 font-medium"
                  >
                    <FileArchive className="w-4 h-4 text-amber-600" />
                    <span>CSV + Photos ZIP (.csv)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reminder Line */}
        <div className="w-full flex items-center gap-2 text-xs font-semibold text-amber-800 bg-amber-50/80 border border-amber-200/80 rounded-xl px-4 py-2.5 mb-8">
          <Info className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Test-print one sheet first: the top/bottom margin is only ~1.5 mm. Check printer margins before large print runs.
          </span>
        </div>

        {/* Sheet Preview & Advanced Options */}
        <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
          {/* Live Sheet Preview */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col items-center">
            <h4 className="text-sm font-bold text-slate-800 mb-3 self-start">
              A4 Sheet Preview (First 5 Students)
            </h4>
            <div className="w-full max-w-[340px] aspect-[210/297] rounded-lg shadow-sm border border-slate-200 overflow-hidden bg-white">
              <canvas
                ref={sheetCanvasRef}
                width={420}
                height={594}
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          {/* Collapsible Advanced Settings (More options) */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs">
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="w-full flex items-center justify-between text-sm font-bold text-slate-900 pb-2"
            >
              <div className="flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-slate-500" />
                <span>More options</span>
              </div>
              {showMoreOptions ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>

            {showMoreOptions && (
              <div className="pt-4 border-t border-slate-100 space-y-4 text-xs">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Rows per A4 sheet
                  </label>
                  <select
                    value={printConfig.rows}
                    onChange={(e) =>
                      setPrintConfig({ ...printConfig, rows: Number(e.target.value) })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  >
                    <option value={5}>5 students (Standard portrait, 1mm gap)</option>
                    <option value={4}>4 students (Comfortable margin)</option>
                    <option value={3}>3 students (Wide margin)</option>
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Row gap (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="10"
                    value={printConfig.rowGap}
                    onChange={(e) =>
                      setPrintConfig({ ...printConfig, rowGap: parseFloat(e.target.value) || 0 })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-slate-800"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Export high-res PNG images (ZIP)
                  </label>
                  <button
                    type="button"
                    onClick={handleExportPngZip}
                    disabled={isExporting}
                    className="w-full py-2 px-3 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg border border-slate-300 transition-colors"
                  >
                    Download Front &amp; Back PNGs
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
