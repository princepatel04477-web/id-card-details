/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  StudentCardRecord,
  CardTemplate,
  CardIssue,
} from '../../types/idcard';
import { ProcessedPhoto, TextFieldKey } from '../../types/icard';
import { analyzeCardIssues } from '../../utils/cardRenderer';
import { AdjustCropModal } from '../AdjustCropModal';
import {
  CheckCircle2,
  AlertTriangle,
  Upload,
  Crop,
  Trash2,
  Check,
  ShieldAlert,
} from 'lucide-react';

interface CardStudentEditorProps {
  student: StudentCardRecord;
  template: CardTemplate;
  allStudents: StudentCardRecord[];
  originalScanUrl?: string;
  imageWidth?: number;
  imageHeight?: number;
  onUpdateStudent: (updated: StudentCardRecord) => void;
  onUpdateFormPhotos?: (photos: ProcessedPhoto[]) => void;
  onShowToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

export const CardStudentEditor: React.FC<CardStudentEditorProps> = ({
  student,
  template,
  allStudents,
  originalScanUrl,
  imageWidth = 1000,
  imageHeight = 1400,
  onUpdateStudent,
  onShowToast,
}) => {
  // Modal for adjusting crop
  const [cropModalPhoto, setCropModalPhoto] = useState<ProcessedPhoto | null>(null);

  const issues = analyzeCardIssues(student, template, allStudents);
  const errorCount = issues.filter((i) => i.level === 'error').length;
  const warningCount = issues.filter((i) => i.level === 'warning').length;

  // Handle direct text updates
  const handleFieldChange = (key: keyof StudentCardRecord, value: string) => {
    const updated: StudentCardRecord = {
      ...student,
      [key]: value,
    };

    // Recompute addressFull if address fields changed
    if (key === 'addressLine1' || key === 'addressLine2' || key === 'city') {
      const parts = [
        key === 'addressLine1' ? value : student.addressLine1,
        key === 'addressLine2' ? value : student.addressLine2,
        key === 'city' ? value : student.city,
      ].filter((p) => Boolean(p && p.trim()));
      updated.addressFull = parts.join(', ');
    }

    onUpdateStudent(updated);
  };

  // Handle photo replace from local file upload
  const handlePhotoUpload = (roleKey: 'student' | 'father' | 'mother' | 'pickup3', file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const updatedPhotos = { ...student.photos, [roleKey]: dataUrl };
      const updatedConfirmations = { ...student.photoConfirmations, [roleKey]: true };

      onUpdateStudent({
        ...student,
        photos: updatedPhotos,
        photoConfirmations: updatedConfirmations,
      });
      onShowToast(`Uploaded new photo for ${roleKey}`, 'success');
    };
    reader.readAsDataURL(file);
  };

  // Handle photo removal
  const handlePhotoRemove = (roleKey: 'student' | 'father' | 'mother' | 'pickup3') => {
    const updatedPhotos = { ...student.photos };
    delete updatedPhotos[roleKey];
    const updatedConfirmations = { ...student.photoConfirmations, [roleKey]: false };

    onUpdateStudent({
      ...student,
      photos: updatedPhotos,
      photoConfirmations: updatedConfirmations,
    });
    onShowToast(`Removed ${roleKey} photo`, 'info');
  };

  // Handle explicit photo role confirmation
  const handleConfirmPhotoRole = (roleKey: 'student' | 'father' | 'mother' | 'pickup3') => {
    const updatedConfirmations = { ...student.photoConfirmations, [roleKey]: true };
    onUpdateStudent({
      ...student,
      photoConfirmations: updatedConfirmations,
    });
    onShowToast(`Confirmed role for ${roleKey} photo`, 'success');
  };

  // Open adjust crop modal
  const handleOpenAdjustCrop = (roleKey: 'student' | 'father' | 'mother' | 'pickup3') => {
    const dataUrl = student.photos[roleKey];
    if (!dataUrl) return;

    const pseudoPhoto: ProcessedPhoto = {
      id: `photo_${student.uid}_${roleKey}`,
      originalBox2d: [150, 150, 750, 750],
      currentBox2d: [150, 150, 750, 750],
      role: roleKey === 'pickup3' ? 'guardian' : roleKey,
      roleGuess: roleKey === 'pickup3' ? 'guardian' : roleKey,
      roleConfidence: 1.0,
      confirmed: true,
      reason: 'Manual adjustment',
      dataUrl,
      rotation: 0,
    };

    setCropModalPhoto(pseudoPhoto);
  };

  const handleSaveCropModal = (updated: ProcessedPhoto) => {
    const roleKey = updated.role === 'guardian' ? 'pickup3' : (updated.role as 'student' | 'father' | 'mother' | 'pickup3');
    const updatedPhotos = { ...student.photos, [roleKey]: updated.dataUrl };
    const updatedConfirmations = { ...student.photoConfirmations, [roleKey]: true };

    onUpdateStudent({
      ...student,
      photos: updatedPhotos,
      photoConfirmations: updatedConfirmations,
    });
    setCropModalPhoto(null);
    onShowToast(`Saved adjusted crop for ${roleKey}`, 'success');
  };

  const photoCards = [
    { key: 'student', label: 'Student Photo', roleName: 'Student' },
    { key: 'mother', label: "Mother's Photo", roleName: 'Mother' },
    { key: 'father', label: "Father's Photo", roleName: 'Father' },
    { key: 'pickup3', label: 'Pickup 3 Photo', roleName: 'Authorised Pickup 3' },
  ] as const;

  return (
    <div className="flex flex-col gap-5 p-4 text-slate-100 overflow-y-auto">
      {/* 1. Print Inclusion Checkbox & Status */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between shadow-sm">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={student.includeInPrint}
            onChange={(e) => onUpdateStudent({ ...student, includeInPrint: e.target.checked })}
            className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-indigo-600 focus:ring-indigo-500 accent-indigo-600 cursor-pointer"
          />
          <span className="text-xs font-semibold text-slate-200">Include in Print Export</span>
        </label>

        <div>
          {errorCount > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {errorCount} Error{errorCount > 1 ? 's' : ''}
            </span>
          ) : warningCount > 0 ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
              {warningCount} Check{warningCount > 1 ? 's' : ''}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
              Ready to Print
            </span>
          )}
        </div>
      </div>

      {/* 2. Pre-Print Validation Checks */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <ShieldAlert className="w-3.5 h-3.5 text-indigo-400" />
          <span>Pre-Print Safety Checks</span>
        </h4>

        {issues.length === 0 ? (
          <div className="flex items-center gap-2 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>All checks passed! Ready for high-quality printing.</span>
          </div>
        ) : (
          <div className="space-y-1.5">
            {issues.map((issue) => (
              <div
                key={issue.id}
                className={`flex items-start gap-2 text-xs px-2.5 py-1.5 rounded-lg border ${
                  issue.level === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                <span className="leading-tight">{issue.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. Photos Grid with Role Confirmation & Crop Tools */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Card Photos &amp; Pick-up Authorization
          </h4>
          <span className="text-[10px] text-slate-500">
            Adult photos require manual confirmation
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {photoCards.map(({ key, label, roleName }) => {
            const photoUrl = student.photos[key];
            const isConfirmed = student.photoConfirmations[key];

            return (
              <div
                key={key}
                className={`bg-slate-900 rounded-xl border p-2.5 flex flex-col justify-between transition-all ${
                  !photoUrl
                    ? 'border-slate-800'
                    : !isConfirmed
                    ? 'border-amber-500/60 bg-amber-500/5 shadow-md shadow-amber-500/10'
                    : 'border-slate-800'
                }`}
              >
                {/* Photo Thumbnail */}
                <div className="aspect-[3/4] w-full rounded-lg bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center relative mb-2 group">
                  {photoUrl ? (
                    <img
                      src={photoUrl}
                      alt={label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-[10px] text-slate-600 text-center px-1">
                      No Photo
                    </span>
                  )}

                  {/* Confirmation Badge Overlay */}
                  {photoUrl && (
                    <div className="absolute top-1 right-1">
                      {isConfirmed ? (
                        <span className="bg-emerald-600 text-white p-0.5 rounded-full inline-flex shadow" title="Confirmed">
                          <Check className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="bg-amber-500 text-slate-950 text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Unconfirmed
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Role Caption */}
                <div className="text-center mb-2">
                  <div className="text-xs font-semibold text-slate-200 truncate">{label}</div>
                  <div className="text-[10px] text-slate-400 truncate">{roleName}</div>
                </div>

                {/* Confirm Action Button if Unconfirmed */}
                {photoUrl && !isConfirmed && (
                  <button
                    type="button"
                    onClick={() => handleConfirmPhotoRole(key)}
                    className="w-full mb-2 flex items-center justify-center gap-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] py-1 px-2 rounded-lg transition-colors shadow"
                  >
                    <Check className="w-3 h-3" />
                    <span>Confirm Role</span>
                  </button>
                )}

                {/* Actions: Replace, Adjust Crop, Remove */}
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-slate-800/80">
                  <label className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] py-1 px-1.5 rounded cursor-pointer transition-colors">
                    <Upload className="w-3 h-3" />
                    <span>{photoUrl ? 'Replace' : 'Upload'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handlePhotoUpload(key, file);
                        e.target.value = '';
                      }}
                      className="hidden"
                    />
                  </label>

                  {photoUrl ? (
                    <button
                      type="button"
                      onClick={() => handleOpenAdjustCrop(key)}
                      className="flex items-center justify-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] py-1 px-1.5 rounded transition-colors"
                      title="Adjust crop with zoom, drag, and fine tilt"
                    >
                      <Crop className="w-3 h-3" />
                      <span>Adjust</span>
                    </button>
                  ) : null}

                  {photoUrl ? (
                    <button
                      type="button"
                      onClick={() => handlePhotoRemove(key)}
                      className="col-span-2 flex items-center justify-center gap-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-[10px] py-1 px-1.5 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Remove</span>
                    </button>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Student Text Details Form */}
      <div className="space-y-3 pt-2 border-t border-slate-800">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Student &amp; School Details
        </h4>

        <div className="space-y-2.5">
          {/* Serial & Session */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Serial / Adm. No
              </label>
              <input
                type="text"
                value={student.serialNumber}
                onChange={(e) => handleFieldChange('serialNumber', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Academic Session
              </label>
              <input
                type="text"
                value={student.academicSession}
                onChange={(e) => handleFieldChange('academicSession', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Student Name */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Student Name
            </label>
            <input
              type="text"
              value={student.studentName}
              onChange={(e) => handleFieldChange('studentName', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 uppercase font-semibold"
            />
          </div>

          {/* Parents */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Father's Name
              </label>
              <input
                type="text"
                value={student.fatherName}
                onChange={(e) => handleFieldChange('fatherName', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Mother's Name
              </label>
              <input
                type="text"
                value={student.motherName}
                onChange={(e) => handleFieldChange('motherName', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
          </div>

          {/* Class, DOB, Blood Group */}
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Class &amp; Sec
              </label>
              <input
                type="text"
                value={student.classSection}
                onChange={(e) => handleFieldChange('classSection', e.target.value)}
                placeholder="5-B"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Date of Birth
              </label>
              <input
                type="text"
                value={student.dateOfBirth}
                onChange={(e) => handleFieldChange('dateOfBirth', e.target.value)}
                placeholder="DD-MM-YYYY"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Blood Group
              </label>
              <input
                type="text"
                value={student.bloodGroup}
                onChange={(e) => handleFieldChange('bloodGroup', e.target.value)}
                placeholder="B+"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 uppercase"
              />
            </div>
          </div>

          {/* Mobiles */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Father's Mobile (10 digits)
              </label>
              <input
                type="text"
                value={student.fatherMobile}
                onChange={(e) => handleFieldChange('fatherMobile', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Mother's Mobile (10 digits)
              </label>
              <input
                type="text"
                value={student.motherMobile}
                onChange={(e) => handleFieldChange('motherMobile', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>

          {/* Address Line 1 */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Address Line 1
            </label>
            <input
              type="text"
              value={student.addressLine1}
              onChange={(e) => handleFieldChange('addressLine1', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
            />
          </div>

          {/* City & Pincode */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                City
              </label>
              <input
                type="text"
                value={student.city}
                onChange={(e) => handleFieldChange('city', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-400 block mb-1">
                Pincode (6 digits)
              </label>
              <input
                type="text"
                value={student.pincode}
                onChange={(e) => handleFieldChange('pincode', e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Adjust Crop Modal */}
      {cropModalPhoto && (
        <AdjustCropModal
          photo={cropModalPhoto}
          imageSrc={originalScanUrl || cropModalPhoto.dataUrl}
          imageWidth={imageWidth}
          imageHeight={imageHeight}
          onClose={() => setCropModalPhoto(null)}
          onSave={handleSaveCropModal}
        />
      )}
    </div>
  );
};
