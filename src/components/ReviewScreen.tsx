/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  Check,
  RotateCcw,
  SkipForward,
  Crop,
  Upload,
  AlertTriangle,
  CheckCircle,
  FileDown,
  ChevronLeft,
  ChevronRight,
  UserCheck,
  CreditCard,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FormRecord, ProcessedPhoto, TextFieldKey, PhotoRole } from '../types/icard';
import { StudentCardRecord } from '../types/idcard';
import { BAL_BHAVAN_DEFAULT_TEMPLATE } from '../utils/cardTemplates';
import { drawCardFace, CARD_PX_WIDTH, CARD_PX_HEIGHT } from '../utils/cardRenderer';
import { ScanViewer } from './ScanViewer';
import { AdjustCropModal } from './AdjustCropModal';
import { AddCropModal } from './AddCropModal';
import { canApproveForm, isFieldFlagged } from '../utils/validation';

interface ReviewScreenProps {
  form: FormRecord;
  formsList: FormRecord[];
  onUpdateForm: (updated: FormRecord) => void;
  onApproveForm: (formId: string) => void;
  onSkipForm: () => void;
  onReExtractForm: (formId: string) => void;
  onOpenExport: () => void;
  onSelectFormById: (id: string) => void;
  onShowToast: (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
}

interface FieldGroup {
  groupTitle: string;
  fields: Array<{ key: TextFieldKey; label: string; placeholder?: string; type?: string }>;
}

const FIELD_GROUPS: FieldGroup[] = [
  {
    groupTitle: 'Basic Information & Identification',
    fields: [
      { key: 'serialNumber', label: 'Serial Number', placeholder: 'e.g. 7692' },
      { key: 'academicSession', label: 'Academic Session', placeholder: 'e.g. 2024-2025' },
      { key: 'formDate', label: 'Form Date', placeholder: 'DD/MM/YYYY' },
    ],
  },
  {
    groupTitle: 'Student Details',
    fields: [
      { key: 'studentName', label: "Student's Full Name (CAPITALS)", placeholder: 'AARAV SHARMA' },
      { key: 'dateOfBirth', label: 'Date of Birth (DD/MM/YYYY)', placeholder: '15/08/2014' },
      { key: 'classSection', label: 'Class & Section', placeholder: '5-B' },
      { key: 'bloodGroup', label: 'Blood Group', placeholder: 'B+' },
    ],
  },
  {
    groupTitle: 'Parents & Contact Details',
    fields: [
      { key: 'fatherName', label: "Father's Name (CAPITALS)", placeholder: 'RAJESH SHARMA' },
      { key: 'fatherMobile', label: "Father's Mobile (10 Digits)", placeholder: '9811234567' },
      { key: 'motherName', label: "Mother's Name (CAPITALS)", placeholder: 'PRIYA SHARMA' },
      { key: 'motherMobile', label: "Mother's Mobile (10 Digits)", placeholder: '9811987654' },
      { key: 'residencePhone', label: 'Residence Landline Phone', placeholder: '01127894561' },
    ],
  },
  {
    groupTitle: 'Address & Transport',
    fields: [
      { key: 'addressLine1', label: 'Address Line 1', placeholder: 'Flat / House No., Building' },
      { key: 'addressLine2', label: 'Address Line 2', placeholder: 'Locality / Area' },
      { key: 'city', label: 'City', placeholder: 'New Delhi' },
      { key: 'pincode', label: 'Pincode (6 Digits)', placeholder: '110001' },
      { key: 'modeOfTransport', label: 'Mode of Transport', placeholder: 'Walker / Van / Bus' },
    ],
  },
];

export const ReviewScreen: React.FC<ReviewScreenProps> = ({
  form,
  formsList,
  onUpdateForm,
  onApproveForm,
  onSkipForm,
  onReExtractForm,
  onOpenExport,
  onSelectFormById,
  onShowToast,
}) => {
  const [activeField, setActiveField] = useState<TextFieldKey | null>(null);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [cropModalPhoto, setCropModalPhoto] = useState<ProcessedPhoto | null>(null);
  const [showAddCropModal, setShowAddCropModal] = useState(false);
  const [showLiveCardPreview, setShowLiveCardPreview] = useState(false);

  const reviewFrontRef = useRef<HTMLCanvasElement>(null);
  const reviewBackRef = useRef<HTMLCanvasElement>(null);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const approvalCheck = canApproveForm(form.fields, form.photos);

  // Render collapsible live card proof on canvas
  useEffect(() => {
    if (!showLiveCardPreview) return;
    const photoMap: Record<string, string> = {};
    const confirmMap = { student: false, father: false, mother: false, pickup3: false };
    for (const p of form.photos || []) {
      if (p.role === 'student') {
        photoMap.student = p.dataUrl;
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
      form.fields.addressLine1?.value,
      form.fields.addressLine2?.value,
      form.fields.city?.value,
    ].filter((p) => Boolean(p && p.trim()));

    const stuRecord: StudentCardRecord = {
      uid: form.id,
      formId: form.id,
      serialNumber: form.fields.serialNumber?.value || '',
      studentName: form.fields.studentName?.value || '',
      fatherName: form.fields.fatherName?.value || '',
      motherName: form.fields.motherName?.value || '',
      dateOfBirth: form.fields.dateOfBirth?.value || '',
      classSection: form.fields.classSection?.value || '',
      addressLine1: form.fields.addressLine1?.value || '',
      addressLine2: form.fields.addressLine2?.value || '',
      city: form.fields.city?.value || '',
      pincode: form.fields.pincode?.value || '',
      fatherMobile: form.fields.fatherMobile?.value || '',
      motherMobile: form.fields.motherMobile?.value || '',
      bloodGroup: form.fields.bloodGroup?.value || '',
      academicSession: form.fields.academicSession?.value || '2026-27',
      addressFull: addressParts.join(', '),
      photos: photoMap,
      photoConfirmations: confirmMap,
      includeInPrint: true,
    };

    const previewWidth = 240;
    const previewHeight = Math.round((previewWidth * 58) / 90);

    if (reviewFrontRef.current) {
      const c = reviewFrontRef.current;
      c.width = CARD_PX_WIDTH;
      c.height = CARD_PX_HEIGHT;
      c.style.width = `${previewWidth}px`;
      c.style.height = `${previewHeight}px`;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawCardFace(ctx, 'front', stuRecord, BAL_BHAVAN_DEFAULT_TEMPLATE, CARD_PX_WIDTH / 90);
      }
    }

    if (reviewBackRef.current) {
      const c = reviewBackRef.current;
      c.width = CARD_PX_WIDTH;
      c.height = CARD_PX_HEIGHT;
      c.style.width = `${previewWidth}px`;
      c.style.height = `${previewHeight}px`;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        drawCardFace(ctx, 'back', stuRecord, BAL_BHAVAN_DEFAULT_TEMPLATE, CARD_PX_WIDTH / 90);
      }
    }
  }, [showLiveCardPreview, form]);

  // Keyboard shortcut: Ctrl+Enter = approve and jump to next Needs Review form
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (approvalCheck.allowed) {
          onApproveForm(form.id);
        } else {
          onShowToast(approvalCheck.blockingReasons[0] || 'Cannot approve: please resolve issues.', 'warning');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [approvalCheck, form.id, onApproveForm, onShowToast]);

  const handleFieldChange = (key: TextFieldKey, newValue: string) => {
    const prevField = form.fields[key];
    const updatedForm: FormRecord = {
      ...form,
      fields: {
        ...form.fields,
        [key]: {
          ...prevField,
          value: newValue,
        },
      },
      userEditedFields: {
        ...form.userEditedFields,
        [key]: true,
      },
      updatedAt: Date.now(),
    };
    onUpdateForm(updatedForm);
  };

  const handlePhotoRoleChange = (photoId: string, newRole: PhotoRole) => {
    const updatedPhotos = form.photos.map((p) => {
      if (p.id === photoId) {
        return {
          ...p,
          role: newRole,
          confirmed: true, // changing role counts as explicit confirmation
        };
      }
      return p;
    });

    onUpdateForm({
      ...form,
      photos: updatedPhotos,
      updatedAt: Date.now(),
    });
  };

  const handleConfirmPhoto = (photoId: string) => {
    const updatedPhotos = form.photos.map((p) => {
      if (p.id === photoId) {
        return { ...p, confirmed: true };
      }
      return p;
    });

    onUpdateForm({
      ...form,
      photos: updatedPhotos,
      updatedAt: Date.now(),
    });
  };

  const handleReplacePhotoFile = (photoId: string, file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const resultDataUrl = reader.result as string;
      const updatedPhotos = form.photos.map((p) => {
        if (p.id === photoId) {
          return {
            ...p,
            dataUrl: resultDataUrl,
            confirmed: true,
            reason: 'Replaced manually from uploaded file',
          };
        }
        return p;
      });

      onUpdateForm({
        ...form,
        photos: updatedPhotos,
        updatedAt: Date.now(),
      });
      onShowToast('Photo replaced successfully', 'success');
    };
    reader.readAsDataURL(file);
  };

  const currentIndex = formsList.findIndex((f) => f.id === form.id);
  const prevForm = currentIndex > 0 ? formsList[currentIndex - 1] : null;
  const nextForm = currentIndex < formsList.length - 1 ? formsList[currentIndex + 1] : null;

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-900 overflow-hidden">
      {/* Top Review Bar */}
      <div className="bg-slate-900 border-b border-slate-800 px-6 py-3 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-lg p-0.5">
            <button
              disabled={!prevForm}
              onClick={() => prevForm && onSelectFormById(prevForm.id)}
              className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded hover:bg-slate-700 transition-colors"
              title="Previous form"
              aria-label="Previous form"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-slate-300 px-2">
              {currentIndex + 1} of {formsList.length}
            </span>
            <button
              disabled={!nextForm}
              onClick={() => nextForm && onSelectFormById(nextForm.id)}
              className="p-1.5 text-slate-300 hover:text-white disabled:opacity-30 disabled:hover:text-slate-300 rounded hover:bg-slate-700 transition-colors"
              title="Next form"
              aria-label="Next form"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <span>{form.fileName}</span>
              <span
                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                  form.status === 'Approved'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : form.status === 'Needs Review'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-slate-700 text-slate-300'
                }`}
              >
                {form.status}
              </span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Serial: <span className="font-mono text-slate-200">{form.fields.serialNumber.value || 'N/A'}</span> &bull; Student: <span className="text-slate-200 font-medium">{form.fields.studentName.value || 'N/A'}</span>
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => onReExtractForm(form.id)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="Re-run Gemini extraction on this form only"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Re-extract</span>
          </button>

          <button
            type="button"
            onClick={onSkipForm}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors"
            title="Skip to next form"
          >
            <SkipForward className="w-3.5 h-3.5" />
            <span>Skip</span>
          </button>

          <button
            type="button"
            onClick={onOpenExport}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-indigo-300 hover:text-white bg-indigo-950/60 hover:bg-indigo-900/60 border border-indigo-700/60 rounded-lg transition-colors"
          >
            <FileDown className="w-3.5 h-3.5" />
            <span>Export DOCX</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (approvalCheck.allowed) {
                onApproveForm(form.id);
              } else {
                onShowToast(approvalCheck.blockingReasons[0] || 'Please fix issues before approving.', 'warning');
              }
            }}
            disabled={!approvalCheck.allowed}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-semibold rounded-lg shadow transition-all ${
              approvalCheck.allowed
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                : 'bg-slate-800 text-slate-500 border border-slate-700/60 cursor-not-allowed opacity-60'
            }`}
            title={approvalCheck.allowed ? 'Approve this form (Ctrl+Enter)' : approvalCheck.blockingReasons.join('\n')}
          >
            <Check className="w-4 h-4" />
            <span>Approve (Ctrl+Enter)</span>
          </button>
        </div>
      </div>

      {/* Main Split Content: Left Scan, Right Editor */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden min-h-0">
        {/* Left Scan View (7 cols on lg) */}
        <div className="lg:col-span-7 h-full p-4 overflow-hidden flex flex-col">
          <ScanViewer
            imageSrc={form.originalImageDataUrl}
            imageWidth={form.imageWidth}
            imageHeight={form.imageHeight}
            photos={form.photos}
            activeField={activeField}
            selectedPhotoId={selectedPhotoId}
            onSelectPhoto={(id) => setSelectedPhotoId(id)}
            onAddPhotoClick={() => setShowAddCropModal(true)}
          />
        </div>

        {/* Right Form Editor (5 cols on lg) */}
        <div className="lg:col-span-5 h-full border-t lg:border-t-0 lg:border-l border-slate-800 flex flex-col bg-slate-900/40 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* Blocking reasons banner if any */}
            {!approvalCheck.allowed && (
              <div className="bg-amber-950/40 border border-amber-600/50 rounded-xl p-3.5 text-amber-200 text-xs space-y-1.5 shadow-sm">
                <div className="flex items-center gap-2 font-semibold text-amber-300">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Action Needed Before Approval:</span>
                </div>
                <ul className="list-disc list-inside space-y-0.5 text-amber-200/90 pl-1">
                  {approvalCheck.blockingReasons.map((reason, idx) => (
                    <li key={idx}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Collapsible Live ID Card Preview Panel */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-sm">
              <button
                type="button"
                onClick={() => setShowLiveCardPreview(!showLiveCardPreview)}
                className="w-full px-4 py-3 flex items-center justify-between text-xs font-bold text-white hover:bg-slate-800/60 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-indigo-400" />
                  <span>Live ID Card Preview (Front &amp; Back Proof)</span>
                </div>
                {showLiveCardPreview ? (
                  <ChevronUp className="w-4 h-4 text-slate-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                )}
              </button>

              {showLiveCardPreview && (
                <div className="p-4 bg-slate-950 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-4">
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Front Side</span>
                    <canvas ref={reviewFrontRef} className="rounded shadow-md border border-slate-700 bg-white" />
                  </div>
                  <div className="flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Back Side</span>
                    <canvas ref={reviewBackRef} className="rounded shadow-md border border-slate-700 bg-white" />
                  </div>
                </div>
              )}
            </div>

            {/* Photos Section */}
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Cropped Photos ({form.photos.length})
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Adult photos &amp; uncertain student photos must be confirmed.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAddCropModal(true)}
                  className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 font-medium"
                >
                  <Crop className="w-3.5 h-3.5" />
                  <span>Add Missing</span>
                </button>
              </div>

              {form.photos.length === 0 ? (
                <div className="text-center py-6 border border-dashed border-slate-700 rounded-lg text-slate-500 text-xs">
                  No photos detected. Use &quot;Add Missing Photo&quot; to crop from scan.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {form.photos.map((photo) => {
                    const isAdult = photo.role === 'father' || photo.role === 'mother' || photo.role === 'guardian';
                    const isStudentLowConf = photo.role === 'student' && photo.roleConfidence < 0.9;
                    const needsConfirm = (isAdult || isStudentLowConf || photo.roleConfidence < 0.8) && !photo.confirmed && photo.role !== 'exclude';

                    return (
                      <div
                        key={photo.id}
                        className={`bg-slate-900/90 rounded-xl p-3 border transition-all ${
                          needsConfirm
                            ? 'border-amber-500/80 ring-1 ring-amber-500/50 shadow-md'
                            : 'border-slate-700/70 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex gap-3">
                          {/* Photo Thumbnail */}
                          <div className="w-16 h-20 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shrink-0 flex items-center justify-center relative">
                            {photo.dataUrl ? (
                              <img
                                src={photo.dataUrl}
                                alt={photo.role}
                                className="max-h-full max-w-full object-cover"
                              />
                            ) : (
                              <span className="text-[9px] text-slate-600">No image</span>
                            )}
                            {photo.confirmed && (
                              <div className="absolute top-1 right-1 bg-emerald-500 text-white rounded-full p-0.5 shadow">
                                <CheckCircle className="w-3 h-3" />
                              </div>
                            )}
                          </div>

                          {/* Controls */}
                          <div className="flex-1 flex flex-col justify-between min-w-0">
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="text-xs font-semibold text-slate-200 capitalize">
                                  {photo.role === 'guardian' ? 'Authorised Pickup 3' : photo.role}
                                </span>
                                <span
                                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                                    photo.roleConfidence < 0.8
                                      ? 'bg-amber-500/20 text-amber-400'
                                      : 'bg-emerald-500/20 text-emerald-400'
                                  }`}
                                >
                                  {Math.round(photo.roleConfidence * 100)}%
                                </span>
                              </div>

                              {/* Role Selector */}
                              <select
                                value={photo.role}
                                onChange={(e) =>
                                  handlePhotoRoleChange(photo.id, e.target.value as PhotoRole)
                                }
                                className="w-full bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded p-1 mb-2 focus:ring-1 focus:ring-indigo-500"
                              >
                                <option value="student">Student</option>
                                <option value="father">Father</option>
                                <option value="mother">Mother</option>
                                <option value="guardian">Authorised Pickup 3</option>
                                <option value="other">Other</option>
                                <option value="exclude">Exclude</option>
                              </select>
                            </div>

                            {/* Actions: Confirm, Adjust crop, Replace */}
                            <div className="flex items-center gap-1 flex-wrap">
                              {needsConfirm && (
                                <button
                                  type="button"
                                  onClick={() => handleConfirmPhoto(photo.id)}
                                  className="flex items-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[11px] font-semibold px-2 py-0.5 rounded transition-colors shadow-sm"
                                  title="Confirm photo assignment"
                                >
                                  <UserCheck className="w-3 h-3" />
                                  <span>Confirm</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => setCropModalPhoto(photo)}
                                className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors text-[11px] flex items-center gap-1"
                                title="Adjust crop box"
                              >
                                <Crop className="w-3 h-3" />
                                <span>Adjust</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => fileInputRefs.current[photo.id]?.click()}
                                className="p-1 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors text-[11px] flex items-center gap-1"
                                title="Upload replacement photo"
                              >
                                <Upload className="w-3 h-3" />
                                <span>Replace</span>
                              </button>

                              <input
                                ref={(el) => {
                                  fileInputRefs.current[photo.id] = el;
                                }}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleReplacePhotoFile(photo.id, file);
                                }}
                              />
                            </div>
                          </div>
                        </div>

                        {photo.reason && (
                          <div className="mt-2 text-[10px] text-slate-400/80 truncate">
                            &bull; {photo.reason}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Form Fields Groups */}
            {FIELD_GROUPS.map((group, groupIdx) => (
              <div
                key={groupIdx}
                className="bg-slate-800/40 border border-slate-800 rounded-xl p-4 space-y-3.5"
              >
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-300 border-b border-slate-700/50 pb-2">
                  {group.groupTitle}
                </h3>

                <div className="grid grid-cols-1 gap-3.5">
                  {group.fields.map((fieldMeta) => {
                    const fieldKey = fieldMeta.key;
                    const field = form.fields[fieldKey];
                    const isEdited = form.userEditedFields[fieldKey] || false;
                    const { flagged, reason } = isFieldFlagged(fieldKey, field, isEdited);

                    return (
                      <div
                        key={fieldKey}
                        onFocus={() => setActiveField(fieldKey)}
                        className="space-y-1"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <label
                            htmlFor={`field-${fieldKey}`}
                            className="font-medium text-slate-300 flex items-center gap-1.5"
                          >
                            <span>{fieldMeta.label}</span>
                            {isEdited && (
                              <span className="text-[10px] text-emerald-400 font-mono">(Edited)</span>
                            )}
                          </label>
                          <span className="text-[11px] font-mono text-slate-500">
                            Confidence: {Math.round(field.confidence * 100)}%
                          </span>
                        </div>

                        <div className="relative">
                          <input
                            id={`field-${fieldKey}`}
                            type={fieldMeta.type || 'text'}
                            value={field.value}
                            placeholder={fieldMeta.placeholder}
                            onChange={(e) => handleFieldChange(fieldKey, e.target.value)}
                            className={`w-full bg-slate-900 text-slate-100 text-sm rounded-lg px-3 py-2 border transition-colors focus:outline-none ${
                              flagged
                                ? 'border-amber-500 bg-amber-950/10 focus:ring-2 focus:ring-amber-500'
                                : 'border-slate-700 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'
                            }`}
                          />
                        </div>

                        {/* Raw extracted text display in small grey text */}
                        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1">
                          <span className="truncate">
                            Raw as read: <span className="font-mono text-slate-400">{field.raw ? `"${field.raw}"` : '[None / Empty]'}</span>
                          </span>
                        </div>

                        {/* Amber warning message if flagged */}
                        {flagged && reason && (
                          <div className="flex items-center gap-1.5 text-xs text-amber-400 font-medium px-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>{reason}</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Adjust Crop Modal */}
      {cropModalPhoto && (
        <AdjustCropModal
          photo={cropModalPhoto}
          imageSrc={form.originalImageDataUrl}
          imageWidth={form.imageWidth}
          imageHeight={form.imageHeight}
          onClose={() => setCropModalPhoto(null)}
          onSave={(updated) => {
            const updatedPhotos = form.photos.map((p) => (p.id === updated.id ? updated : p));
            onUpdateForm({
              ...form,
              photos: updatedPhotos,
              updatedAt: Date.now(),
            });
            onShowToast('Crop adjustments applied successfully', 'success');
          }}
        />
      )}

      {/* Add Missing Photo Modal */}
      {showAddCropModal && (
        <AddCropModal
          imageSrc={form.originalImageDataUrl}
          imageWidth={form.imageWidth}
          imageHeight={form.imageHeight}
          onClose={() => setShowAddCropModal(false)}
          onAddPhoto={(newPhoto) => {
            onUpdateForm({
              ...form,
              photos: [...form.photos, newPhoto],
              updatedAt: Date.now(),
            });
            onShowToast(`Added new photo (${newPhoto.role})`, 'success');
          }}
        />
      )}
    </div>
  );
};
