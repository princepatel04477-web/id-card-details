/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  X,
  FileText,
  FileSpreadsheet,
  Archive,
  CheckCircle2,
  Download,
  Settings2,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import { ExportDialogOptions, FormRecord } from '../types/icard';
import { exportSingleStudentDocx, exportAllApprovedDocx } from '../utils/docxExport';
import { exportApprovedStudentsToExcel } from '../utils/excelExport';
import { exportCsvAndPhotosZip } from '../utils/csvExport';

interface ExportModalProps {
  currentForm: FormRecord | null;
  approvedForms: FormRecord[];
  allFormsCount: number;
  onClose: () => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  currentForm,
  approvedForms,
  allFormsCount,
  onClose,
  onShowToast,
}) => {
  const [options, setOptions] = useState<ExportDialogOptions>({
    includeOriginalScan: true,
    highlightUncertainFields: true,
  });
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);

  const handleExportExcel = async () => {
    if (approvedForms.length === 0) {
      onShowToast('No approved forms available to export. Approve forms first.', 'warning');
      return;
    }
    try {
      setIsExporting(true);
      setExportingType('excel');
      await exportApprovedStudentsToExcel(approvedForms);
      onShowToast(`Exported Excel (.xlsx) with photos for ${approvedForms.length} approved students`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export Excel: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleExportSingleDocx = async () => {
    if (!currentForm) return;
    try {
      setIsExporting(true);
      setExportingType('single-docx');
      await exportSingleStudentDocx(currentForm, options);
      onShowToast(`Exported DOCX for ${currentForm.fields.studentName.value || 'Student'}`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export DOCX: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleExportAllApprovedDocx = async () => {
    if (approvedForms.length === 0) {
      onShowToast('No approved forms available to export. Approve forms first.', 'warning');
      return;
    }
    try {
      setIsExporting(true);
      setExportingType('batch-docx');
      await exportAllApprovedDocx(approvedForms, options);
      onShowToast(`Exported batch DOCX for ${approvedForms.length} approved students`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export batch DOCX: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  const handleExportCsvZip = async () => {
    if (approvedForms.length === 0) {
      onShowToast('No approved forms available to export to CSV. Approve forms first.', 'warning');
      return;
    }
    try {
      setIsExporting(true);
      setExportingType('csv');
      await exportCsvAndPhotosZip(approvedForms);
      onShowToast(`Exported CSV (text only) + Photos ZIP for ${approvedForms.length} approved students`, 'success');
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to export CSV: ${msg}`, 'error');
    } finally {
      setIsExporting(false);
      setExportingType(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Export I-Card Records</h3>
              <p className="text-xs text-slate-400">
                Generate formatted Excel spreadsheets with embedded photos, Word DOCX, and CSV archives.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          {/* Main Action: Excel Export with Photos */}
          <button
            type="button"
            disabled={isExporting || approvedForms.length === 0}
            onClick={handleExportExcel}
            className="w-full flex items-center justify-between p-4 bg-emerald-950/50 hover:bg-emerald-900/50 border-2 border-emerald-600/70 hover:border-emerald-500 rounded-xl transition-all text-left disabled:opacity-40 disabled:hover:border-emerald-600/70 group shadow-lg shadow-emerald-950/40"
          >
            <div className="flex items-center gap-3.5">
              <div className="p-2.5 bg-emerald-500/20 text-emerald-300 rounded-xl group-hover:scale-105 transition-transform">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div>
                <div className="text-sm font-bold text-white flex items-center gap-2">
                  <span>Export Excel (with photos)</span>
                  <span className="bg-emerald-500/30 text-emerald-300 text-[11px] px-2 py-0.5 rounded-full font-mono">
                    {approvedForms.length} approved
                  </span>
                </div>
                <div className="text-xs text-emerald-200/80 mt-0.5 leading-relaxed">
                  Excel .xlsx with cropped photos in cells (oneCell editAs, 90pt height), frozen headers, auto-filters &amp; full scan reference sheet.
                </div>
              </div>
            </div>
            {exportingType === 'excel' ? (
              <Loader2 className="w-5 h-5 animate-spin text-emerald-300 shrink-0" />
            ) : (
              <Download className="w-5 h-5 text-emerald-300 group-hover:text-white transition-colors shrink-0" />
            )}
          </button>

          {/* DOCX Settings */}
          <div className="bg-slate-800/40 border border-slate-700/70 rounded-xl p-3.5 space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-300">
              <Settings2 className="w-3.5 h-3.5 text-indigo-400" />
              <span>DOCX Options</span>
            </div>

            <div className="space-y-2">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={options.includeOriginalScan}
                  onChange={(e) => setOptions((o) => ({ ...o, includeOriginalScan: e.target.checked }))}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Include original scan reference in DOCX (16cm width)</span>
              </label>

              <label className="flex items-center gap-2.5 cursor-pointer text-xs text-slate-300">
                <input
                  type="checkbox"
                  checked={options.highlightUncertainFields}
                  onChange={(e) => setOptions((o) => ({ ...o, highlightUncertainFields: e.target.checked }))}
                  className="rounded border-slate-600 bg-slate-800 text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                />
                <span>Highlight uncertain AI fields with Word comments</span>
              </label>
            </div>
          </div>

          {/* Secondary Actions */}
          <div className="space-y-2">
            {/* Single DOCX */}
            {currentForm && (
              <button
                type="button"
                disabled={isExporting}
                onClick={handleExportSingleDocx}
                className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl transition-all text-left group"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-500/10 text-blue-400 rounded-lg">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-medium text-slate-200">
                      Export Current Student (DOCX)
                    </div>
                    <div className="text-[11px] text-slate-400">
                      {currentForm.fields.studentName.value || 'Student'} &bull; S.No: {currentForm.fields.serialNumber.value || 'N/A'}
                    </div>
                  </div>
                </div>
                {exportingType === 'single-docx' ? (
                  <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                ) : (
                  <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
                )}
              </button>
            )}

            {/* Batch DOCX */}
            <button
              type="button"
              disabled={isExporting || approvedForms.length === 0}
              onClick={handleExportAllApprovedDocx}
              className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl transition-all text-left disabled:opacity-40 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-lg">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    Export All Approved Students (DOCX)
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Editable Word document with page break per student
                  </div>
                </div>
              </div>
              {exportingType === 'batch-docx' ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
              )}
            </button>

            {/* CSV (text only) + Photos ZIP */}
            <button
              type="button"
              disabled={isExporting || approvedForms.length === 0}
              onClick={handleExportCsvZip}
              className="w-full flex items-center justify-between p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700 hover:border-slate-600 rounded-xl transition-all text-left disabled:opacity-40 group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500/10 text-amber-400 rounded-lg">
                  <Archive className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-medium text-slate-200">
                    Export CSV (text only) + Photos ZIP
                  </div>
                  <div className="text-[11px] text-slate-400">
                    UTF-8 BOM CSV with photo filenames and photos archive
                  </div>
                </div>
              </div>
              {exportingType === 'csv' ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
              ) : (
                <Download className="w-4 h-4 text-slate-400 group-hover:text-white" />
              )}
            </button>
          </div>

          {approvedForms.length < allFormsCount && (
            <div className="flex items-center gap-2 text-xs text-amber-300/90 bg-amber-950/30 border border-amber-800/50 p-2.5 rounded-lg">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-amber-400" />
              <span>
                {approvedForms.length} of {allFormsCount} forms approved. Only approved forms are included in batch exports.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
