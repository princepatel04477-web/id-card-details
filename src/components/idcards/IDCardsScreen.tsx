/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  CardTemplate,
  StudentCardRecord,
  CardElement,
  CardPrintConfig,
} from '../../types/idcard';
import { FormRecord, ProcessedPhoto } from '../../types/icard';
import {
  loadCurrentTemplate,
  saveCurrentTemplate,
  BAL_BHAVAN_DEFAULT_TEMPLATE,
} from '../../utils/cardTemplates';
import {
  exportA4SheetsPdf,
  exportSingleCardPdfsZip,
  exportCardPngsZip,
} from '../../utils/cardPrintExport';
import { analyzeCardIssues } from '../../utils/cardRenderer';
import { importStudentsFromExcel } from '../../utils/excelImport';
import { CardCanvasPreview } from './CardCanvasPreview';
import { CardStudentEditor } from './CardStudentEditor';
import { CardDesignInspector } from './CardDesignInspector';
import { DuplicatesModal } from './DuplicatesModal';
import {
  Search,
  ArrowUpDown,
  Download,
  Upload,
  User,
  Palette,
  Printer,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  FileSpreadsheet,
  CheckCircle,
} from 'lucide-react';

interface IDCardsScreenProps {
  forms: FormRecord[];
  onUpdateForm: (updated: FormRecord) => Promise<void>;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  academicSessionOverride?: string;
  onImportForms?: (newForms: FormRecord[]) => void;
}

export const IDCardsScreen: React.FC<IDCardsScreenProps> = ({
  forms,
  onUpdateForm,
  onShowToast,
  academicSessionOverride = '2026-27',
  onImportForms,
}) => {
  const [template, setTemplate] = useState<CardTemplate>(structuredClone(BAL_BHAVAN_DEFAULT_TEMPLATE));
  const [activeTab, setActiveTab] = useState<'student' | 'design' | 'print'>('student');
  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'form' | 'serial' | 'name' | 'class'>('form');

  const [showOriginalForm, setShowOriginalForm] = useState<boolean>(false);
  const [showGuides, setShowGuides] = useState<boolean>(true);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState<boolean>(false);

  // Print export configurations
  const [printConfig, setPrintConfig] = useState<CardPrintConfig>({
    rows: 5,
    rowGap: 1.0,
    colGap: 0.0,
    cardPdf: 'pair',
    pattern: '{n}_{serialNumber}_{studentName}',
  });
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgressMsg, setExportProgressMsg] = useState<string>('');

  const excelInputRef = useRef<HTMLInputElement>(null);

  // Load template from storage on mount
  useEffect(() => {
    async function initTemplate() {
      const t = await loadCurrentTemplate();
      setTemplate(t);
    }
    initTemplate();
  }, []);

  const handleUpdateTemplate = useCallback((newTemplate: CardTemplate) => {
    setTemplate(newTemplate);
    saveCurrentTemplate(newTemplate);
  }, []);

  // Map FormRecord[] into StudentCardRecord[]
  // Every correction in StudentCardRecord writes straight back into the FormRecord
  const students: StudentCardRecord[] = useMemo(() => {
    return forms.map((f, idx) => {
      // Map photos
      const photoMap: Record<string, string> = {};
      const confirmMap = {
        student: false,
        father: false,
        mother: false,
        pickup3: false,
      };

      for (const p of f.photos || []) {
        if (p.role === 'student') {
          photoMap.student = p.dataUrl;
          // Student photo needs confirmation if confidence < 0.9
          confirmMap.student = p.confirmed && p.roleConfidence >= 0.9;
        } else if (p.role === 'father') {
          photoMap.father = p.dataUrl;
          confirmMap.father = p.confirmed;
        } else if (p.role === 'mother') {
          photoMap.mother = p.dataUrl;
          confirmMap.mother = p.confirmed;
        } else if (p.role === 'guardian') {
          photoMap.pickup3 = p.dataUrl;
          confirmMap.pickup3 = p.confirmed;
        }
      }

      const addressParts = [
        f.fields.addressLine1?.value,
        f.fields.addressLine2?.value,
        f.fields.city?.value,
      ].filter((p) => Boolean(p && p.trim()));

      return {
        uid: f.id,
        formId: f.id,
        serialNumber: f.fields.serialNumber?.value || '',
        studentName: f.fields.studentName?.value || '',
        fatherName: f.fields.fatherName?.value || '',
        motherName: f.fields.motherName?.value || '',
        dateOfBirth: f.fields.dateOfBirth?.value || '',
        classSection: f.fields.classSection?.value || '',
        addressLine1: f.fields.addressLine1?.value || '',
        addressLine2: f.fields.addressLine2?.value || '',
        city: f.fields.city?.value || '',
        pincode: f.fields.pincode?.value || '',
        fatherMobile: f.fields.fatherMobile?.value || '',
        motherMobile: f.fields.motherMobile?.value || '',
        bloodGroup: f.fields.bloodGroup?.value || '',
        academicSession: academicSessionOverride || f.fields.academicSession?.value || '2026-27',
        addressFull: addressParts.join(', '),
        photos: photoMap,
        photoConfirmations: confirmMap,
        includeInPrint: f.status === 'Approved' || idx === 0, // default include approved or first
      };
    });
  }, [forms, academicSessionOverride]);

  // Set default selected student if not selected
  useEffect(() => {
    if (!selectedStudentUid && students.length > 0) {
      setSelectedStudentUid(students[0].uid);
    }
  }, [selectedStudentUid, students]);

  // Filter and sort students
  const filteredAndSortedStudents = useMemo(() => {
    let result = [...students];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.studentName.toLowerCase().includes(q) ||
          s.serialNumber.toLowerCase().includes(q) ||
          s.classSection.toLowerCase().includes(q) ||
          s.fatherName.toLowerCase().includes(q)
      );
    }

    // Sort order
    if (sortBy === 'serial') {
      result.sort((a, b) =>
        a.serialNumber.localeCompare(b.serialNumber, undefined, { numeric: true })
      );
    } else if (sortBy === 'name') {
      result.sort((a, b) => a.studentName.localeCompare(b.studentName));
    } else if (sortBy === 'class') {
      result.sort((a, b) =>
        a.classSection.localeCompare(b.classSection, undefined, { numeric: true }) ||
        a.studentName.localeCompare(b.studentName)
      );
    }

    return result;
  }, [students, searchQuery, sortBy]);

  const currentStudent =
    students.find((s) => s.uid === selectedStudentUid) || students[0] || null;
  const currentFormRecord =
    forms.find((f) => f.id === currentStudent?.formId) || null;

  // Duplicate detection across all students
  const duplicateStudentsCount = useMemo(() => {
    let dups = 0;
    for (let i = 0; i < students.length; i++) {
      const s1 = students[i];
      for (let j = i + 1; j < students.length; j++) {
        const s2 = students[j];
        if (
          (s1.serialNumber && s1.serialNumber === s2.serialNumber) ||
          (s1.studentName &&
            s1.dateOfBirth &&
            s1.studentName.trim().toLowerCase() === s2.studentName.trim().toLowerCase() &&
            s1.dateOfBirth === s2.dateOfBirth)
        ) {
          dups++;
          break;
        }
      }
    }
    return dups;
  }, [students]);

  // Write updates to the student record back to the FormRecord
  const handleUpdateStudent = async (updated: StudentCardRecord) => {
    const parentForm = forms.find((f) => f.id === updated.formId);
    if (!parentForm) return;

    // Synchronize photo updates back to FormRecord.photos
    const updatedFormPhotos: ProcessedPhoto[] = [...parentForm.photos];

    const syncRolePhoto = (
      role: 'student' | 'father' | 'mother' | 'guardian',
      url?: string,
      confirmed = false
    ) => {
      const idx = updatedFormPhotos.findIndex((p) => p.role === role);
      if (url) {
        if (idx >= 0) {
          updatedFormPhotos[idx] = {
            ...updatedFormPhotos[idx],
            dataUrl: url,
            confirmed,
          };
        } else {
          updatedFormPhotos.push({
            id: `photo_${updated.formId}_${role}`,
            originalBox2d: [150, 150, 750, 750],
            currentBox2d: [150, 150, 750, 750],
            role,
            roleGuess: role,
            roleConfidence: 0.95,
            confirmed,
            reason: 'User updated in ID card studio',
            dataUrl: url,
            rotation: 0,
          });
        }
      } else if (idx >= 0) {
        updatedFormPhotos.splice(idx, 1);
      }
    };

    syncRolePhoto('student', updated.photos.student, updated.photoConfirmations.student);
    syncRolePhoto('father', updated.photos.father, updated.photoConfirmations.father);
    syncRolePhoto('mother', updated.photos.mother, updated.photoConfirmations.mother);
    syncRolePhoto('guardian', updated.photos.pickup3, updated.photoConfirmations.pickup3);

    const updatedForm: FormRecord = {
      ...parentForm,
      fields: {
        ...parentForm.fields,
        serialNumber: {
          value: updated.serialNumber,
          raw: updated.serialNumber,
          confidence: updated.serialNumber ? 0.95 : 0,
        },
        studentName: {
          value: updated.studentName,
          raw: updated.studentName,
          confidence: updated.studentName ? 0.95 : 0,
        },
        fatherName: {
          value: updated.fatherName,
          raw: updated.fatherName,
          confidence: updated.fatherName ? 0.95 : 0,
        },
        motherName: {
          value: updated.motherName,
          raw: updated.motherName,
          confidence: updated.motherName ? 0.95 : 0,
        },
        dateOfBirth: {
          value: updated.dateOfBirth,
          raw: updated.dateOfBirth,
          confidence: updated.dateOfBirth ? 0.95 : 0,
        },
        classSection: {
          value: updated.classSection,
          raw: updated.classSection,
          confidence: updated.classSection ? 0.95 : 0,
        },
        addressLine1: {
          value: updated.addressLine1,
          raw: updated.addressLine1,
          confidence: updated.addressLine1 ? 0.95 : 0,
        },
        addressLine2: {
          value: updated.addressLine2,
          raw: updated.addressLine2,
          confidence: updated.addressLine2 ? 0.95 : 0,
        },
        city: {
          value: updated.city,
          raw: updated.city,
          confidence: updated.city ? 0.95 : 0,
        },
        pincode: {
          value: updated.pincode,
          raw: updated.pincode,
          confidence: updated.pincode ? 0.95 : 0,
        },
        fatherMobile: {
          value: updated.fatherMobile,
          raw: updated.fatherMobile,
          confidence: updated.fatherMobile ? 0.95 : 0,
        },
        motherMobile: {
          value: updated.motherMobile,
          raw: updated.motherMobile,
          confidence: updated.motherMobile ? 0.95 : 0,
        },
        bloodGroup: {
          value: updated.bloodGroup,
          raw: updated.bloodGroup,
          confidence: updated.bloodGroup ? 0.95 : 0,
        },
        academicSession: {
          value: updated.academicSession,
          raw: updated.academicSession,
          confidence: updated.academicSession ? 0.95 : 0,
        },
      },
      photos: updatedFormPhotos,
      updatedAt: Date.now(),
    };

    await onUpdateForm(updatedForm);
  };

  // Keep latest duplicate helper
  const handleKeepLatestDuplicates = () => {
    const keyMap = new Map<string, StudentCardRecord>();
    for (const s of students) {
      const key = s.serialNumber || `${s.studentName}|${s.dateOfBirth}`;
      keyMap.set(key, s);
    }

    let unselected = 0;
    for (const s of students) {
      const key = s.serialNumber || `${s.studentName}|${s.dateOfBirth}`;
      if (keyMap.get(key) !== s && s.includeInPrint) {
        handleUpdateStudent({ ...s, includeInPrint: false });
        unselected++;
      }
    }
    onShowToast(`Unselected ${unselected} older duplicate record(s) from print`, 'info');
  };

  // Navigation steps
  const handleStepStudent = (delta: number) => {
    if (filteredAndSortedStudents.length === 0) return;
    const currentIndex = filteredAndSortedStudents.findIndex(
      (s) => s.uid === selectedStudentUid
    );
    const nextIndex =
      (currentIndex + delta + filteredAndSortedStudents.length) %
      filteredAndSortedStudents.length;
    setSelectedStudentUid(filteredAndSortedStudents[nextIndex].uid);
  };

  // Check errors for all included cards
  const includedStudents = useMemo(() => {
    return students.filter((s) => s.includeInPrint);
  }, [students]);

  const cardsWithErrorsCount = useMemo(() => {
    return includedStudents.filter((s) =>
      analyzeCardIssues(s, template, students).some((i) => i.level === 'error')
    ).length;
  }, [includedStudents, template, students]);

  // Export handlers
  const handleExportA4Sheets = async () => {
    if (includedStudents.length === 0) {
      onShowToast('No students selected for print', 'warning');
      return;
    }
    if (cardsWithErrorsCount > 0) {
      onShowToast('Cannot export while selected cards have errors', 'error');
      return;
    }

    setIsExporting(true);
    try {
      await exportA4SheetsPdf(includedStudents, template, printConfig, (_cur, _tot, msg) => {
        setExportProgressMsg(msg);
      });
      onShowToast('A4 Sheets PDF generated successfully!', 'success');
    } catch {
      onShowToast('Failed to generate A4 Sheets PDF', 'error');
    } finally {
      setIsExporting(false);
      setExportProgressMsg('');
    }
  };

  const handleExportSingleCardPdfs = async () => {
    if (includedStudents.length === 0) {
      onShowToast('No students selected for print', 'warning');
      return;
    }
    if (cardsWithErrorsCount > 0) {
      onShowToast('Cannot export while selected cards have errors', 'error');
      return;
    }

    setIsExporting(true);
    try {
      await exportSingleCardPdfsZip(
        includedStudents,
        template,
        printConfig,
        (_cur, _tot, msg) => {
          setExportProgressMsg(msg);
        }
      );
      onShowToast('Single-Card PDFs ZIP downloaded successfully!', 'success');
    } catch {
      onShowToast('Failed to export Single-Card PDFs', 'error');
    } finally {
      setIsExporting(false);
      setExportProgressMsg('');
    }
  };

  const handleExportCardPngs = async () => {
    if (includedStudents.length === 0) {
      onShowToast('No students selected for print', 'warning');
      return;
    }
    if (cardsWithErrorsCount > 0) {
      onShowToast('Cannot export while selected cards have errors', 'error');
      return;
    }

    setIsExporting(true);
    try {
      await exportCardPngsZip(includedStudents, template, (_cur, _tot, msg) => {
        setExportProgressMsg(msg);
      });
      onShowToast('PNG Images ZIP downloaded successfully!', 'success');
    } catch {
      onShowToast('Failed to export card PNGs', 'error');
    } finally {
      setIsExporting(false);
      setExportProgressMsg('');
    }
  };

  // Import Excel handler
  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    onShowToast(`Parsing Excel file and extracting anchored photos: ${file.name}...`, 'info');
    try {
      const buffer = await file.arrayBuffer();
      const imported = await importStudentsFromExcel(buffer, file.name);

      if (imported.length === 0) {
        onShowToast('No valid student rows found in Excel sheet', 'warning');
        return;
      }

      if (onImportForms) {
        onImportForms(imported);
      }
      onShowToast(`Successfully loaded ${imported.length} student cards from Excel!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      onShowToast(`Failed to import Excel: ${msg}`, 'error');
    } finally {
      e.target.value = '';
    }
  };

  const currentStudentIndex = filteredAndSortedStudents.findIndex(
    (s) => s.uid === selectedStudentUid
  );

  return (
    <div className="flex-1 flex overflow-hidden bg-slate-950 text-slate-100">
      {/* LEFT COLUMN: Student List & Filtering */}
      <aside className="w-80 border-r border-slate-800 bg-slate-900/60 flex flex-col shrink-0 min-h-0">
        <div className="p-3 border-b border-slate-800 space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              <span>Students</span>
              <span className="text-xs font-mono font-normal text-slate-400">
                ({includedStudents.length}/{students.length})
              </span>
            </h3>

            {/* Import Excel Button */}
            <label className="flex items-center gap-1 text-[11px] font-semibold bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 px-2 py-1 rounded hover:bg-indigo-600/30 cursor-pointer transition-colors">
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Import Excel</span>
              <input
                ref={excelInputRef}
                type="file"
                accept=".xlsx,.xlsm"
                onChange={handleExcelImport}
                className="hidden"
              />
            </label>
          </div>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search name, serial, class..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'form' | 'serial' | 'name' | 'class')}
              className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none"
            >
              <option value="form">Order: Queue / Form order</option>
              <option value="serial">Order: Serial / Adm. No</option>
              <option value="name">Order: Student Name A-Z</option>
              <option value="class">Order: Class, then Name</option>
            </select>
          </div>

          {/* Duplicate records warning banner if any */}
          {duplicateStudentsCount > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex items-center justify-between text-xs text-amber-300">
              <div className="flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{duplicateStudentsCount} duplicates found</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleKeepLatestDuplicates}
                  className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded underline font-medium"
                >
                  Keep latest
                </button>
                <button
                  type="button"
                  onClick={() => setShowDuplicatesModal(true)}
                  className="text-[10px] bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded font-medium"
                >
                  View
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Student items scroll list */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
          {filteredAndSortedStudents.map((stu, idx) => {
            const isSelected = stu.uid === selectedStudentUid;
            const issues = analyzeCardIssues(stu, template, students);
            const hasError = issues.some((i) => i.level === 'error');
            const hasWarning = issues.some((i) => i.level === 'warning');

            return (
              <div
                key={stu.uid}
                onClick={() => setSelectedStudentUid(stu.uid)}
                className={`p-2.5 flex items-start gap-2.5 cursor-pointer transition-colors select-none ${
                  isSelected
                    ? 'bg-indigo-600/20 border-l-4 border-indigo-500'
                    : 'hover:bg-slate-800/50 border-l-4 border-transparent'
                }`}
              >
                <input
                  type="checkbox"
                  checked={stu.includeInPrint}
                  onChange={(e) => {
                    e.stopPropagation();
                    handleUpdateStudent({ ...stu, includeInPrint: e.target.checked });
                  }}
                  className="mt-1 w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 accent-indigo-600 cursor-pointer"
                />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold text-white truncate uppercase">
                      {stu.studentName || '(No Name)'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      #{String(idx + 1).padStart(3, '0')}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                    <span className="font-mono text-indigo-300">
                      {stu.serialNumber ? `No. ${stu.serialNumber}` : 'No serial'}
                    </span>
                    <span>&bull;</span>
                    <span className="truncate">{stu.classSection || 'No class'}</span>
                  </div>

                  {/* Status chip */}
                  <div className="mt-1 flex items-center gap-1">
                    {hasError ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                        Error
                      </span>
                    ) : hasWarning ? (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Needs Confirm
                      </span>
                    ) : (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        Ready
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </aside>

      {/* CENTER COLUMN: Live Card Preview */}
      <section className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-950">
        {/* Navigation Bar */}
        <div className="px-4 py-2 border-b border-slate-800 bg-slate-900/60 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleStepStudent(-1)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
              disabled={filteredAndSortedStudents.length <= 1}
              aria-label="Previous Student"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono font-bold text-slate-300">
              {currentStudentIndex >= 0 ? currentStudentIndex + 1 : 1} /{' '}
              {filteredAndSortedStudents.length}
            </span>
            <button
              type="button"
              onClick={() => handleStepStudent(1)}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30"
              disabled={filteredAndSortedStudents.length <= 1}
              aria-label="Next Student"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'design' && (
              <label className="flex items-center gap-1.5 text-xs text-slate-400 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(e) => setShowGuides(e.target.checked)}
                  className="rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-0 accent-indigo-600"
                />
                <span>Show Field Boxes</span>
              </label>
            )}

            <div className="text-xs text-slate-400">
              <span className="font-semibold text-white">
                {currentStudent?.studentName || 'Select student'}
              </span>
              {currentStudent?.serialNumber ? ` (${currentStudent.serialNumber})` : ''}
            </div>
          </div>
        </div>

        {/* Center Live Canvas Proof */}
        {currentStudent ? (
          <CardCanvasPreview
            student={currentStudent}
            template={template}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => setSelectedElementId(id)}
            onUpdateElement={(updated) => {
              const updatedElements = template.elements.map((el) =>
                el.id === updated.id ? updated : el
              );
              handleUpdateTemplate({ ...template, elements: updatedElements });
            }}
            onDeleteElement={(id) => {
              const updatedElements = template.elements.filter((el) => el.id !== id);
              handleUpdateTemplate({ ...template, elements: updatedElements });
              setSelectedElementId(null);
            }}
            showGuides={showGuides}
            isDesignMode={activeTab === 'design'}
            originalScanUrl={currentFormRecord?.originalImageDataUrl}
            showOriginalForm={showOriginalForm}
            onToggleOriginalForm={() => setShowOriginalForm(!showOriginalForm)}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
            <p>No student records available. Import an Excel file or scan performa forms.</p>
          </div>
        )}
      </section>

      {/* RIGHT COLUMN: Studio Panel with Tabs [Student | Design | Print] */}
      <aside className="w-96 border-l border-slate-800 bg-slate-900/60 flex flex-col shrink-0 min-h-0">
        {/* Tab Headers */}
        <div className="flex border-b border-slate-800 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('student')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'student'
                ? 'border-indigo-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Student</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('design')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'design'
                ? 'border-indigo-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Design</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('print')}
            className={`flex-1 py-3 text-xs font-bold border-b-2 flex items-center justify-center gap-1.5 transition-colors ${
              activeTab === 'print'
                ? 'border-indigo-500 text-white bg-slate-900'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Export</span>
          </button>
        </div>

        {/* Tab 1: Student Editor */}
        {activeTab === 'student' && currentStudent && (
          <CardStudentEditor
            student={currentStudent}
            template={template}
            allStudents={students}
            originalScanUrl={currentFormRecord?.originalImageDataUrl}
            imageWidth={currentFormRecord?.imageWidth}
            imageHeight={currentFormRecord?.imageHeight}
            onUpdateStudent={handleUpdateStudent}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 2: Design Inspector */}
        {activeTab === 'design' && (
          <CardDesignInspector
            template={template}
            selectedElementId={selectedElementId}
            onSelectElement={(id) => setSelectedElementId(id)}
            onUpdateTemplate={handleUpdateTemplate}
            onShowToast={onShowToast}
          />
        )}

        {/* Tab 3: Print Export Settings & Actions */}
        {activeTab === 'print' && (
          <div className="flex-1 flex flex-col p-4 gap-5 overflow-y-auto">
            {/* Export Summary */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Print Batch Summary
              </h4>
              <div className="text-xs text-slate-200">
                <span className="font-bold text-white text-sm font-mono">
                  {includedStudents.length}
                </span>{' '}
                students selected for print &bull;{' '}
                <span className="font-mono font-semibold">
                  {Math.ceil(includedStudents.length / printConfig.rows)}
                </span>{' '}
                A4 sheet(s)
              </div>

              {cardsWithErrorsCount > 0 ? (
                <div className="text-xs bg-rose-500/10 border border-rose-500/30 text-rose-300 p-2 rounded-lg flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>
                    {cardsWithErrorsCount} card(s) have validation errors. Export is disabled until resolved.
                  </span>
                </div>
              ) : (
                <div className="text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-2 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 shrink-0" />
                  <span>All selected cards are verified and ready to print!</span>
                </div>
              )}
            </div>

            {/* A4 Sheet Gaps Configuration */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                A4 Sheet Layout (Portrait)
              </h4>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Students per sheet
                  </label>
                  <select
                    value={printConfig.rows}
                    onChange={(e) =>
                      setPrintConfig({
                        ...printConfig,
                        rows: parseInt(e.target.value, 10),
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-white"
                  >
                    <option value="1">1 student</option>
                    <option value="2">2 students</option>
                    <option value="3">3 students</option>
                    <option value="4">4 students</option>
                    <option value="5">5 students (Standard)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-medium text-slate-400 block mb-1">
                    Row gap (mm)
                  </label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={printConfig.rowGap}
                    onChange={(e) =>
                      setPrintConfig({
                        ...printConfig,
                        rowGap: parseFloat(e.target.value) || 0,
                      })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-medium text-slate-400 block mb-1">
                  Column gap between Front &amp; Back (mm)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  value={printConfig.colGap}
                  onChange={(e) =>
                    setPrintConfig({
                      ...printConfig,
                      colGap: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-white"
                />
              </div>

              {/* Advisory note */}
              <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-[11px] text-amber-300/90 leading-relaxed">
                <strong>Advisory Note:</strong> Test-print one sheet first: the top/bottom margin is only ~1.5 mm. Check printer margins before large print runs.
              </div>
            </div>

            {/* Single Card PDFs Configuration */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Single Card PDFs
              </h4>
              <select
                value={printConfig.cardPdf}
                onChange={(e) =>
                  setPrintConfig({
                    ...printConfig,
                    cardPdf: e.target.value as 'pair' | 'two' | 'front',
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              >
                <option value="pair">Front and back side by side (1 page, 180&times;58mm)</option>
                <option value="two">Front on page 1, back on page 2 (2 pages)</option>
                <option value="front">Front only</option>
              </select>
            </div>

            {/* Print Export Buttons */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                disabled={isExporting || includedStudents.length === 0 || cardsWithErrorsCount > 0}
                onClick={handleExportA4Sheets}
                className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-lg transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>Export A4 Sheets PDF (Print-ready)</span>
              </button>

              <button
                type="button"
                disabled={isExporting || includedStudents.length === 0 || cardsWithErrorsCount > 0}
                onClick={handleExportSingleCardPdfs}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-semibold text-xs py-2.5 px-4 rounded-xl border border-slate-700 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Export Single-card PDFs (ZIP)</span>
              </button>

              <button
                type="button"
                disabled={isExporting || includedStudents.length === 0 || cardsWithErrorsCount > 0}
                onClick={handleExportCardPngs}
                className="w-full flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-slate-200 font-semibold text-xs py-2 px-4 rounded-xl border border-slate-700 transition-all"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export PNG images (ZIP)</span>
              </button>

              {isExporting && exportProgressMsg && (
                <div className="text-center text-xs text-indigo-400 font-mono pt-1 animate-pulse">
                  {exportProgressMsg}
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Duplicate Records Resolver Modal */}
      {showDuplicatesModal && (
        <DuplicatesModal
          students={students}
          onKeepStudent={(keepUid, unselectUids) => {
            const keepStudent = students.find((s) => s.uid === keepUid);
            if (keepStudent) {
              handleUpdateStudent({ ...keepStudent, includeInPrint: true });
            }
            for (const uid of unselectUids) {
              const other = students.find((s) => s.uid === uid);
              if (other) {
                handleUpdateStudent({ ...other, includeInPrint: false });
              }
            }
            onShowToast(`Kept primary record for print`, 'success');
          }}
          onClose={() => setShowDuplicatesModal(false)}
        />
      )}
    </div>
  );
};
