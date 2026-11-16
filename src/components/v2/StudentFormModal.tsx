/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  X,
  User,
  Users,
  Upload,
  Trash2,
  Check,
  FileText,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { StudentCardRecord } from '../../types/idcard';

interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentCardRecord;
  onSave: (updated: StudentCardRecord) => Promise<void>;
  isNewStudent?: boolean;
}

export const StudentFormModal: React.FC<StudentFormModalProps> = ({
  isOpen,
  onClose,
  student,
  onSave,
  isNewStudent = false,
}) => {
  const [formData, setFormData] = useState<StudentCardRecord>({ ...student });
  const [activeUploadRole, setActiveUploadRole] = useState<'student' | 'father' | 'mother' | 'pickup3' | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleChange = (key: keyof StudentCardRecord, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [key]: value };
      if (['addressLine1', 'addressLine2', 'city', 'pincode'].includes(key)) {
        const parts = [
          updated.addressLine1,
          updated.addressLine2,
          updated.city,
        ].filter((p) => Boolean(p && p.trim()));
        updated.addressFull = parts.join(', ');
      }
      return updated;
    });
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeUploadRole) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setFormData((prev) => ({
        ...prev,
        photos: {
          ...prev.photos,
          [activeUploadRole]: dataUrl,
        },
        photoConfirmations: {
          ...prev.photoConfirmations,
          [activeUploadRole]: true,
        },
      }));
      setActiveUploadRole(null);
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = (role: 'student' | 'father' | 'mother' | 'pickup3') => {
    setFormData((prev) => {
      const newPhotos = { ...prev.photos };
      delete newPhotos[role];
      const newConfirm = { ...prev.photoConfirmations, [role]: false };
      return {
        ...prev,
        photos: newPhotos,
        photoConfirmations: newConfirm,
      };
    });
  };

  const handleTriggerUpload = (role: 'student' | 'father' | 'mother' | 'pickup3') => {
    setActiveUploadRole(role);
    fileInputRef.current?.click();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
    onClose();
  };

  const photoSlots = [
    { role: 'student', label: 'Student Photo', url: formData.photos.student, required: true },
    { role: 'father', label: "Father's Photo", url: formData.photos.father, required: false },
    { role: 'mother', label: "Mother's Photo", url: formData.photos.mother, required: false },
    { role: 'pickup3', label: 'Authorised Pickup 3', url: formData.photos.pickup3, required: false },
  ] as const;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5">
      {/* Hidden file input for uploading photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoSelect}
      />

      <div className="bg-white rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center shadow-xs">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900">
                {isNewStudent ? 'Fill Student Form & Upload Photos' : 'Edit Student Details & Photos'}
              </h3>
              <p className="text-xs text-slate-500">
                Fill in all performa details and attach photos for printing
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-6">
          {/* SECTION 1: PHOTO UPLOADS */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-[#1e3a8a]" />
                <span>Upload Photos (Pick-up Authorization)</span>
              </h4>
              <span className="text-[11px] text-slate-500">Student + Up to 3 Guardians</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photoSlots.map((slot) => (
                <div
                  key={slot.role}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-between text-center"
                >
                  <span className="text-xs font-semibold text-slate-700 mb-2 truncate w-full">
                    {slot.label} {slot.required && <span className="text-rose-500">*</span>}
                  </span>

                  {/* Thumbnail / Empty placeholder */}
                  <div className="w-20 h-24 rounded-lg bg-white border border-slate-300 overflow-hidden flex items-center justify-center mb-2.5 shadow-2xs relative group">
                    {slot.url ? (
                      <img
                        src={slot.url}
                        alt={slot.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  {/* Upload / Remove Buttons */}
                  <div className="w-full flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleTriggerUpload(slot.role)}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-medium shadow-2xs flex items-center gap-1 min-h-[30px]"
                    >
                      <Upload className="w-3 h-3 text-blue-600" />
                      <span>{slot.url ? 'Change' : 'Upload'}</span>
                    </button>

                    {slot.url && (
                      <button
                        type="button"
                        onClick={() => handleRemovePhoto(slot.role)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200 transition-colors"
                        title="Remove photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* SECTION 2: STUDENT DETAILS */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
              <User className="w-4 h-4 text-[#1e3a8a]" />
              <span>Student Details</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.studentName}
                  onChange={(e) => handleChange('studentName', e.target.value)}
                  placeholder="e.g. AARAV SHARMA"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adm / Serial No. <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.serialNumber}
                  onChange={(e) => handleChange('serialNumber', e.target.value)}
                  placeholder="e.g. 7692"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class &amp; Section <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.classSection}
                  onChange={(e) => handleChange('classSection', e.target.value)}
                  placeholder="e.g. 5-B or V-B"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.dateOfBirth}
                  onChange={(e) => handleChange('dateOfBirth', e.target.value)}
                  placeholder="DD-MM-YYYY (e.g. 15-08-2014)"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Blood Group
                </label>
                <input
                  type="text"
                  value={formData.bloodGroup}
                  onChange={(e) => handleChange('bloodGroup', e.target.value)}
                  placeholder="e.g. B+, O+, A+"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* SECTION 3: PARENTS & PHONE NUMBERS */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
              <Phone className="w-4 h-4 text-[#1e3a8a]" />
              <span>Parents &amp; Phone Numbers</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.fatherName}
                  onChange={(e) => handleChange('fatherName', e.target.value)}
                  placeholder="e.g. RAJESH SHARMA"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's Mobile (10 Digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={formData.fatherMobile}
                  onChange={(e) => handleChange('fatherMobile', e.target.value)}
                  placeholder="e.g. 9811234567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mother's Name
                </label>
                <input
                  type="text"
                  value={formData.motherName}
                  onChange={(e) => handleChange('motherName', e.target.value)}
                  placeholder="e.g. PRIYA SHARMA"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mother's Mobile (10 Digits)
                </label>
                <input
                  type="text"
                  maxLength={10}
                  value={formData.motherMobile}
                  onChange={(e) => handleChange('motherMobile', e.target.value)}
                  placeholder="e.g. 9811987654"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-slate-200" />

          {/* SECTION 4: ADDRESS & SESSION */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5 mb-3">
              <MapPin className="w-4 h-4 text-[#1e3a8a]" />
              <span>Residential Address &amp; Session</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address Line 1 <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.addressLine1}
                  onChange={(e) => handleChange('addressLine1', e.target.value)}
                  placeholder="e.g. Flat 402, Sunshine Apartments"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Address Line 2 (Locality/Sector)
                </label>
                <input
                  type="text"
                  value={formData.addressLine2}
                  onChange={(e) => handleChange('addressLine2', e.target.value)}
                  placeholder="e.g. Sector 14, Rohini"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="e.g. New Delhi"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Pincode (6 Digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={formData.pincode}
                  onChange={(e) => handleChange('pincode', e.target.value)}
                  placeholder="e.g. 110085"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Session Year
                </label>
                <input
                  type="text"
                  value={formData.academicSession}
                  onChange={(e) => handleChange('academicSession', e.target.value)}
                  placeholder="e.g. 2026-27"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Action buttons inside form */}
          <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl border border-slate-200 hover:bg-slate-50 min-h-[40px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#1e3a8a] hover:bg-blue-900 active:bg-blue-950 text-white font-bold rounded-xl text-xs shadow-sm hover:shadow transition-all flex items-center gap-1.5 min-h-[40px]"
            >
              <Check className="w-4 h-4 stroke-[2.5]" />
              <span>{isNewStudent ? 'Add Student Card' : 'Save Details to Card'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
