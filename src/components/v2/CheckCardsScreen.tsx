/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  StudentCardRecord,
  CardTemplate,
  CardIssue,
} from '../../types/idcard';
import { FormRecord } from '../../types/icard';
import { CardCanvasWithEditor } from './CardCanvasWithEditor';
import { PhotoConfirmationPanel } from './PhotoConfirmationPanel';
import { ToFixChecklist } from './ToFixChecklist';
import { StudentStrip } from './StudentStrip';
import { OriginalScanDrawer } from './OriginalScanDrawer';
import { AdjustCropModal } from '../AdjustCropModal';
import { DuplicatesModal } from '../idcards/DuplicatesModal';
import { StudentFormModal } from './StudentFormModal';
import { PhotoCropModal } from './PhotoCropModal';
import { CardStylingToolbar } from './CardStylingToolbar';
import { SchoolDesignModal } from './SchoolDesignModal';
import { analyzeCardIssues } from '../../utils/cardRenderer';
import { cropImageFromBox } from '../../utils/crop';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  FileSearch,
  FileText,
  Crop,
  Upload,
  Palette,
  Building2,
  Sliders,
  CheckCircle2,
  User,
  Users,
  Trash2,
} from 'lucide-react';
import { ConfirmModal } from './ConfirmModal';

import {
  BAL_BHAVAN_DEFAULT_TEMPLATE,
  MODERN_SCHOOL_DEFAULT_TEMPLATE,
  BUILTIN_SCHOOLS,
  loadAllSchoolTemplates,
  saveCurrentTemplate,
} from '../../utils/cardTemplates';

interface CheckCardsScreenProps {
  students: StudentCardRecord[];
  forms: FormRecord[];
  template: CardTemplate;
  selectedStudentUid: string | null;
  onSelectStudent: (uid: string) => void;
  onUpdateStudent: (updated: StudentCardRecord) => Promise<void>;
  onDeleteStudent?: (uid: string) => Promise<void>;
  onSwitchTemplate?: (newTemplate: CardTemplate) => void;
  onGoToPrint: () => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const CheckCardsScreen: React.FC<CheckCardsScreenProps> = ({
  students,
  forms,
  template,
  selectedStudentUid,
  onSelectStudent,
  onUpdateStudent,
  onDeleteStudent,
  onSwitchTemplate,
  onGoToPrint,
  onShowToast,
}) => {
  const [showOriginalScan, setShowOriginalScan] = useState(false);
  const [showFullFormModal, setShowFullFormModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [showDeleteStudentModal, setShowDeleteStudentModal] = useState(false);
  const [showStylingToolbar, setShowStylingToolbar] = useState(false);
  const [activeCropRole, setActiveCropRole] = useState<'student' | 'father' | 'mother' | 'pickup3' | null>(null);
  const [schoolsList, setSchoolsList] = useState<CardTemplate[]>(BUILTIN_SCHOOLS);
  const [showDuplicatesModal, setShowDuplicatesModal] = useState(false);
  const [highlightedElementId, setHighlightedElementId] = useState<string | null>(null);

  const photoFileInputRef = useRef<HTMLInputElement>(null);
  const [replaceTargetRole, setReplaceTargetRole] = useState<string | null>(null);

  // Load all available schools
  useEffect(() => {
    loadAllSchoolTemplates().then((list) => {
      setSchoolsList(list);
    });
  }, []);

  // Current active student
  const currentStudentIndex = useMemo(() => {
    const idx = students.findIndex((s) => s.uid === selectedStudentUid);
    return idx >= 0 ? idx : 0;
  }, [students, selectedStudentUid]);

  const currentStudent = students[currentStudentIndex] || null;
  const currentForm = forms.find((f) => f.id === currentStudent?.formId) || null;

  // Pre-print issues for all students
  const studentIssuesMap = useMemo(() => {
    const map = new Map<string, CardIssue[]>();
    for (const s of students) {
      const issues = analyzeCardIssues(s, template, students);
      map.set(s.uid, issues);
    }
    return map;
  }, [students, template]);

  const currentIssues = useMemo(() => {
    if (!currentStudent) return [];
    return studentIssuesMap.get(currentStudent.uid) || [];
  }, [currentStudent, studentIssuesMap]);

  // Determine flagged fields on the active card
  const flaggedFields = useMemo(() => {
    const set = new Set<string>();
    for (const issue of currentIssues) {
      if (issue.id === 'invalid_father_phone') set.add('fatherMobile');
      if (issue.id === 'invalid_mother_phone') set.add('motherMobile');
      if (issue.id === 'invalid_pincode') set.add('pincode');
      if (issue.id === 'invalid_dob') set.add('dateOfBirth');
      if (issue.id === 'dup_serial') set.add('serialNumber');
      if (issue.id === 'missing_student_photo' || issue.id === 'unconfirmed_student_photo') {
        set.add('student');
      }
      if (issue.id === 'unconfirmed_adult_mother') set.add('mother');
      if (issue.id === 'unconfirmed_adult_father') set.add('father');
      if (issue.id === 'unconfirmed_adult_pickup3') set.add('pickup3');
    }
    return set;
  }, [currentIssues]);

  // Check for duplicates across students
  const duplicateConflict = useMemo(() => {
    if (!currentStudent || !currentStudent.serialNumber) return null;
    const match = students.find(
      (s) => s.uid !== currentStudent.uid && s.serialNumber === currentStudent.serialNumber
    );
    return match ? { current: currentStudent, duplicate: match } : null;
  }, [currentStudent, students]);

  // Keyboard navigation: Enter = Next student when ready; Left / Right = prev / next student
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      if (e.key === 'ArrowRight') {
        if (currentStudentIndex < students.length - 1) {
          onSelectStudent(students[currentStudentIndex + 1].uid);
        }
      } else if (e.key === 'ArrowLeft') {
        if (currentStudentIndex > 0) {
          onSelectStudent(students[currentStudentIndex - 1].uid);
        }
      } else if (e.key === 'Enter') {
        if (currentIssues.length === 0) {
          if (currentStudentIndex < students.length - 1) {
            onSelectStudent(students[currentStudentIndex + 1].uid);
          } else {
            onGoToPrint();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentStudentIndex, students, currentIssues, onSelectStudent, onGoToPrint]);

  // Next student action
  const handleNextStudent = () => {
    if (currentStudentIndex < students.length - 1) {
      onSelectStudent(students[currentStudentIndex + 1].uid);
    } else {
      onGoToPrint();
    }
  };

  // Previous student action
  const handlePrevStudent = () => {
    if (currentStudentIndex > 0) {
      onSelectStudent(students[currentStudentIndex - 1].uid);
    }
  };

  // Field update handler (updates StudentCardRecord and propagates to FormRecord)
  const handleUpdateField = async (fieldKey: string, newValue: string) => {
    if (!currentStudent) return;
    const updated = { ...currentStudent, [fieldKey]: newValue };
    // Also recompute full address if street or city or pincode changed
    if (['addressLine1', 'addressLine2', 'city', 'pincode'].includes(fieldKey)) {
      const parts = [
        updated.addressLine1,
        updated.addressLine2,
        updated.city,
      ].filter((p) => Boolean(p && p.trim()));
      updated.addressFull = parts.join(', ');
    }
    await onUpdateStudent(updated);
    onShowToast('Saved', 'success');
  };

  // Photo replacement handler
  const handleReplacePhoto = async (photoKey: string, file: File) => {
    if (!currentStudent) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      const updatedPhotos = { ...currentStudent.photos, [photoKey]: dataUrl };
      const updatedConfirmations = {
        ...currentStudent.photoConfirmations,
        [photoKey]: true, // User manually uploaded it, so it's confirmed
      };
      const updated = {
        ...currentStudent,
        photos: updatedPhotos,
        photoConfirmations: updatedConfirmations,
      };
      await onUpdateStudent(updated);
      onShowToast(`Photo updated`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Photo role change handler
  const handleChangePhotoRole = async (oldRoleKey: string, newRoleKey: string) => {
    if (!currentStudent) return;
    const oldUrl = currentStudent.photos[oldRoleKey];
    if (!oldUrl) return;

    const newPhotos = { ...currentStudent.photos };
    delete newPhotos[oldRoleKey];
    newPhotos[newRoleKey] = oldUrl;

    const newConfirmations = { ...currentStudent.photoConfirmations };
    newConfirmations[newRoleKey as keyof typeof newConfirmations] = true;

    const updated = {
      ...currentStudent,
      photos: newPhotos,
      photoConfirmations: newConfirmations,
    };
    await onUpdateStudent(updated);
    onShowToast(`Role updated`, 'success');
  };

  // Photo removal handler
  const handleRemovePhoto = async (photoKey: string) => {
    if (!currentStudent) return;
    const newPhotos = { ...currentStudent.photos };
    delete newPhotos[photoKey];
    const newConfirmations = { ...currentStudent.photoConfirmations };
    newConfirmations[photoKey as keyof typeof newConfirmations] = false;

    const updated = {
      ...currentStudent,
      photos: newPhotos,
      photoConfirmations: newConfirmations,
    };
    await onUpdateStudent(updated);
    onShowToast(`Photo removed`, 'info');
  };

  // Quick confirmation from "Who is this?" panel
  const handleConfirmRole = async (
    currentKey: string,
    assignedRole: 'mother' | 'father' | 'pickup3' | 'not_needed'
  ) => {
    if (!currentStudent) return;

    if (assignedRole === 'not_needed') {
      handleRemovePhoto(currentKey);
      return;
    }

    if (currentKey === assignedRole) {
      // Just confirm the existing role
      const newConfirmations = {
        ...currentStudent.photoConfirmations,
        [assignedRole]: true,
      };
      await onUpdateStudent({
        ...currentStudent,
        photoConfirmations: newConfirmations,
      });
      onShowToast(`Confirmed ${assignedRole}`, 'success');
    } else {
      // Move photo to the newly selected role
      await handleChangePhotoRole(currentKey, assignedRole);
    }
  };

  // Click on checklist item highlights the target element
  const handleFixIssue = (issueId: string) => {
    if (issueId.includes('phone') || issueId === 'invalid_father_phone') {
      setHighlightedElementId('contact1');
    } else if (issueId === 'invalid_mother_phone') {
      setHighlightedElementId('contact2');
    } else if (issueId === 'invalid_pincode') {
      setHighlightedElementId('address');
    } else if (issueId === 'invalid_dob') {
      setHighlightedElementId('dob');
    } else if (issueId.includes('student_photo')) {
      setHighlightedElementId('photo');
    } else if (issueId.includes('adult') || issueId.includes('pickup')) {
      setHighlightedElementId('pickup');
    }
    setTimeout(() => setHighlightedElementId(null), 3000);
  };

  if (!currentStudent) {
    return (
      <div className="flex-1 flex items-center justify-center bg-slate-50 text-slate-500">
        No students loaded. Go to Upload screen to add forms.
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-slate-50">
      {/* Top Banner if duplicate serial number detected */}
      {duplicateConflict && (
        <div className="bg-amber-500 text-white px-4 py-2 flex items-center justify-between text-xs font-semibold shadow-xs shrink-0">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Serial {duplicateConflict.current.serialNumber} appears twice &bull; Compare with{' '}
              {duplicateConflict.duplicate.studentName}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowDuplicatesModal(true)}
            className="px-3 py-1 bg-white text-amber-900 rounded-lg font-bold hover:bg-amber-50 transition-colors"
          >
            Compare &bull; Keep this one
          </button>
        </div>
      )}

      {/* Main Work Area: 70% Card (Left) and 30% Checklist (Right) */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
        {/* Left 70%: THE CARD is the editor */}
        <div className="flex-1 lg:w-[70%] overflow-y-auto p-4 sm:p-6 flex flex-col items-center">
          {/* Student Header Navigation Bar */}
          <div className="w-full max-w-[620px] flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrevStudent}
                disabled={currentStudentIndex === 0}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                title="Previous Student (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <span className="text-xs font-semibold text-slate-600">
                Student {currentStudentIndex + 1} of {students.length}
              </span>

              <button
                type="button"
                onClick={handleNextStudent}
                disabled={currentStudentIndex === students.length - 1}
                className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed text-slate-700"
                title="Next Student (Right Arrow)"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* School Style & Design Selector */}
              <div className="flex items-center gap-1.5">
                <select
                  value={template.id}
                  onChange={(e) => {
                    if (e.target.value === '__upload_new__') {
                      setShowSchoolModal(true);
                      return;
                    }
                    const selected = schoolsList.find((s) => s.id === e.target.value);
                    if (selected && onSwitchTemplate) {
                      onSwitchTemplate(structuredClone(selected));
                      saveCurrentTemplate(selected);
                      onShowToast(`Switched to ${selected.schoolName || selected.name}`, 'info');
                    }
                  }}
                  className="px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-2xs hover:border-slate-400 focus:outline-hidden max-w-[210px] truncate"
                  title="Switch school card style"
                >
                  <optgroup label="School Profiles">
                    {schoolsList.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.schoolName || s.name}
                      </option>
                    ))}
                  </optgroup>
                  <option value="__upload_new__">+ Upload School Design...</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowSchoolModal(true)}
                  className="p-1.5 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg text-slate-700 hover:text-[#1e3a8a] shadow-2xs transition-all"
                  title="Manage School Profiles & Upload Design"
                >
                  <Building2 className="w-4 h-4 text-[#1e3a8a]" />
                </button>
              </div>

              {/* Customize Card & Fonts Toggle Button */}
              <button
                type="button"
                onClick={() => setShowStylingToolbar(!showStylingToolbar)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all border shadow-2xs ${
                  showStylingToolbar
                    ? 'bg-[#1e3a8a] text-white border-blue-900'
                    : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                }`}
                title="Customize font sizes, weights, colors, and layout"
              >
                <Palette className="w-3.5 h-3.5" />
                <span>Card Fonts &amp; Style</span>
              </button>

              <button
                type="button"
                onClick={() => setShowFullFormModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 border border-slate-300 rounded-lg text-xs font-semibold shadow-2xs transition-all hover:border-slate-400"
                title="Fill or edit all details and upload photos in one form"
              >
                <FileText className="w-3.5 h-3.5 text-[#1e3a8a]" />
                <span>Edit Full Form</span>
              </button>

              {onDeleteStudent && (
                <button
                  type="button"
                  onClick={() => setShowDeleteStudentModal(true)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-xs font-semibold shadow-2xs transition-all"
                  title="Delete this student record from batch"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Delete Student</span>
                </button>
              )}
            </div>
          </div>

          {/* Hidden File Input for Direct Photo Replacement */}
          <input
            ref={photoFileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file && replaceTargetRole) {
                handleReplacePhoto(replaceTargetRole, file);
                setReplaceTargetRole(null);
              }
            }}
          />

          {/* Student & Parents Photos Crop Bar (Always available when opening ID card section) */}
          <div className="w-full max-w-[620px] mb-4 bg-white rounded-2xl border border-slate-200 p-3.5 shadow-xs">
            <div className="flex items-center justify-between mb-2.5 pb-2 border-b border-slate-100">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Crop className="w-3.5 h-3.5 text-[#1e3a8a]" />
                <span>Student &amp; Parent Photos (Click to Crop / Adjust)</span>
              </span>
              <span className="text-[11px] text-slate-400">
                Zoom, pan &amp; rotate face for ID print
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {[
                { role: 'student' as const, label: 'Student Photo', side: 'Front Card', url: currentStudent.photos.student, confirmed: currentStudent.photoConfirmations.student },
                { role: 'father' as const, label: "Father's Photo", side: 'Back Card', url: currentStudent.photos.father, confirmed: currentStudent.photoConfirmations.father },
                { role: 'mother' as const, label: "Mother's Photo", side: 'Back Card', url: currentStudent.photos.mother, confirmed: currentStudent.photoConfirmations.mother },
                { role: 'pickup3' as const, label: 'Authorised Pickup', side: 'Back Card', url: currentStudent.photos.pickup3, confirmed: currentStudent.photoConfirmations.pickup3 },
              ].map((slot) => (
                <div
                  key={slot.role}
                  className={`p-2 rounded-xl border flex flex-col items-center text-center transition-all ${
                    slot.confirmed && slot.url
                      ? 'bg-emerald-50/40 border-emerald-200'
                      : slot.url
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  {/* Thumbnail */}
                  <div
                    onClick={() => {
                      if (slot.url) setActiveCropRole(slot.role);
                      else {
                        setReplaceTargetRole(slot.role);
                        photoFileInputRef.current?.click();
                      }
                    }}
                    className="w-16 h-20 rounded-lg border border-slate-300 bg-white shadow-2xs overflow-hidden mb-2 cursor-pointer relative group flex items-center justify-center"
                  >
                    {slot.url ? (
                      <>
                        <img src={slot.url} alt={slot.label} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Crop className="w-4 h-4" />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center text-slate-400 p-1">
                        <User className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px] font-semibold">No Photo</span>
                      </div>
                    )}
                  </div>

                  <span className="text-[11px] font-bold text-slate-800 truncate w-full leading-tight">
                    {slot.label}
                  </span>
                  <span className="text-[10px] text-slate-400 mb-1.5">{slot.side}</span>

                  {/* Action Buttons */}
                  <div className="w-full flex items-center gap-1">
                    <button
                      type="button"
                      disabled={!slot.url}
                      onClick={() => setActiveCropRole(slot.role)}
                      className="flex-1 py-1 px-1 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-[#1e3a8a] font-bold border border-slate-200 rounded-md text-[10px] flex items-center justify-center gap-1 transition-colors shadow-2xs"
                      title={`Crop and align ${slot.label}`}
                    >
                      <Crop className="w-3 h-3" />
                      <span>Crop</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setReplaceTargetRole(slot.role);
                        photoFileInputRef.current?.click();
                      }}
                      className="py-1 px-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md text-[10px] font-semibold transition-colors"
                      title={`Upload or replace ${slot.label}`}
                    >
                      <Upload className="w-3 h-3" />
                    </button>

                    {slot.url && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(slot.role)}
                        className="py-1 px-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-md text-[10px] font-semibold transition-colors border border-rose-200"
                        title={`Delete ${slot.label}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Toggleable Font Size and Card Styling Toolbar */}
          {showStylingToolbar && (
            <div className="w-full max-w-[620px] mb-4">
              <CardStylingToolbar
                template={template}
                onUpdateTemplate={(newTpl) => {
                  if (onSwitchTemplate) onSwitchTemplate(newTpl);
                  saveCurrentTemplate(newTpl);
                }}
                selectedElementId={highlightedElementId}
                onSelectElement={setHighlightedElementId}
                onShowToast={onShowToast}
              />
            </div>
          )}

          {/* Large Card Canvas with Interactive Overlays */}
          <CardCanvasWithEditor
            student={currentStudent}
            template={template}
            onUpdateField={handleUpdateField}
            onAdjustCrop={(photoKey) => setActiveCropRole(photoKey as any)}
            onReplacePhoto={handleReplacePhoto}
            onChangePhotoRole={handleChangePhotoRole}
            onRemovePhoto={handleRemovePhoto}
            highlightedElementId={highlightedElementId}
            flaggedFields={flaggedFields}
            onSelectElement={(id) => {
              setHighlightedElementId(id);
              setShowStylingToolbar(true);
            }}
          />

          {/* "WHO IS THIS?" Photo Confirmation Panel */}
          <div className="w-full max-w-[620px] mt-6 mb-6">
            <PhotoConfirmationPanel
              student={currentStudent}
              onConfirmRole={handleConfirmRole}
              onCropPhoto={(key) => setActiveCropRole(key)}
            />
          </div>
        </div>

        {/* Right 30%: "TO FIX" Checklist */}
        <div className="lg:w-[30%] lg:min-w-[320px] lg:max-w-[400px] border-t lg:border-t-0 lg:border-l border-slate-200 p-4 sm:p-6 overflow-y-auto bg-slate-50/50 flex flex-col justify-between">
          <ToFixChecklist
            issues={currentIssues}
            student={currentStudent}
            onFixIssue={handleFixIssue}
            onNextStudent={handleNextStudent}
            onToggleOriginalForm={() => setShowOriginalScan(true)}
            onOpenFullForm={() => setShowFullFormModal(true)}
            hasNextStudent={currentStudentIndex < students.length - 1}
          />
        </div>
      </div>

      {/* Full Student Form & Photo Upload Modal */}
      {showFullFormModal && (
        <StudentFormModal
          isOpen={showFullFormModal}
          onClose={() => setShowFullFormModal(false)}
          student={currentStudent}
          onSave={onUpdateStudent}
        />
      )}

      {/* Bottom Student Strip */}
      <StudentStrip
        students={students}
        selectedStudentUid={currentStudent.uid}
        onSelectStudent={onSelectStudent}
        studentIssuesMap={studentIssuesMap}
      />

      {/* Slide-over Original Performa Scan Drawer */}
      {currentForm && (
        <OriginalScanDrawer
          isOpen={showOriginalScan}
          onClose={() => setShowOriginalScan(false)}
          imageUrl={currentForm.originalImageDataUrl}
          studentName={currentStudent.studentName}
          fileName={currentForm.fileName}
        />
      )}

      {/* Universal Photo Crop Modal (for Student, Father, Mother, or Guardian) */}
      {activeCropRole && currentStudent && (
        <PhotoCropModal
          isOpen={Boolean(activeCropRole)}
          onClose={() => setActiveCropRole(null)}
          photoRole={activeCropRole}
          photoUrl={currentStudent.photos[activeCropRole] || ''}
          originalScanUrl={currentForm?.originalImageDataUrl}
          onDelete={() => {
            if (activeCropRole) {
              handleRemovePhoto(activeCropRole);
              setActiveCropRole(null);
            }
          }}
          onSave={async (croppedDataUrl) => {
            const updatedPhotos = {
              ...currentStudent.photos,
              [activeCropRole]: croppedDataUrl,
            };
            const updatedConfirmations = {
              ...currentStudent.photoConfirmations,
              [activeCropRole]: true,
            };
            await onUpdateStudent({
              ...currentStudent,
              photos: updatedPhotos,
              photoConfirmations: updatedConfirmations,
            });
            setActiveCropRole(null);
            onShowToast(
              `${activeCropRole === 'student' ? 'Student' : activeCropRole === 'father' ? "Father's" : activeCropRole === 'mother' ? "Mother's" : "Pickup"} photo cropped & saved`,
              'success'
            );
          }}
        />
      )}

      {/* Confirm Delete Student Modal */}
      {showDeleteStudentModal && currentStudent && onDeleteStudent && (
        <ConfirmModal
          isOpen={showDeleteStudentModal}
          title="Delete Student Record"
          message={`Are you sure you want to delete student "${currentStudent.studentName || 'Unnamed'}" (Serial #${currentStudent.serialNumber || '—'})? This card will be permanently removed from this batch.`}
          confirmLabel="Delete Student"
          onConfirm={async () => {
            await onDeleteStudent(currentStudent.uid);
            setShowDeleteStudentModal(false);
          }}
          onCancel={() => setShowDeleteStudentModal(false)}
        />
      )}

      {/* School Profiles & Upload Design Modal */}
      {showSchoolModal && (
        <SchoolDesignModal
          isOpen={showSchoolModal}
          onClose={() => setShowSchoolModal(false)}
          currentSchoolId={template.id}
          onSelectSchool={(newTpl) => {
            if (onSwitchTemplate) onSwitchTemplate(newTpl);
            saveCurrentTemplate(newTpl);
            loadAllSchoolTemplates().then((list) => setSchoolsList(list));
          }}
          onShowToast={onShowToast}
        />
      )}

      {/* Duplicates Compare Modal */}
      {showDuplicatesModal && (
        <DuplicatesModal
          students={students}
          onKeepStudent={async (winnerUid, loserUid) => {
            const winner = students.find((s) => s.uid === winnerUid);
            if (winner) {
              onSelectStudent(winnerUid);
            }
            setShowDuplicatesModal(false);
            onShowToast(`Selected primary record`, 'success');
          }}
          onClose={() => setShowDuplicatesModal(false)}
        />
      )}
    </div>
  );
};
