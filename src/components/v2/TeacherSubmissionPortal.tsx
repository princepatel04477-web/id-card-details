/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  CreditCard,
  User,
  Users,
  Camera,
  Upload,
  Trash2,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Phone,
  MapPin,
  Calendar,
  AlertCircle,
  Building,
  ArrowLeft,
} from 'lucide-react';

interface TeacherSubmissionPortalProps {
  sessionYear: string;
  schoolName?: string;
  onExitToAdmin?: () => void;
}

export const TeacherSubmissionPortal: React.FC<TeacherSubmissionPortalProps> = ({
  sessionYear,
  schoolName = 'School ID Card System',
  onExitToAdmin,
}) => {
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form fields
  const [teacherName, setTeacherName] = useState('');
  const [classSection, setClassSection] = useState('');
  const [studentName, setStudentName] = useState('');
  const [serialNumber, setSerialNumber] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [modeOfTransport, setModeOfTransport] = useState('School Van');

  const [fatherName, setFatherName] = useState('');
  const [fatherMobile, setFatherMobile] = useState('');
  const [motherName, setMotherName] = useState('');
  const [motherMobile, setMotherMobile] = useState('');

  const [addressLine1, setAddressLine1] = useState('');
  const [addressLine2, setAddressLine2] = useState('');
  const [city, setCity] = useState('New Delhi');
  const [pincode, setPincode] = useState('');

  // Photos
  const [photos, setPhotos] = useState<{
    student?: string;
    father?: string;
    mother?: string;
    pickup3?: string;
  }>({});

  const [activePhotoRole, setActivePhotoRole] = useState<'student' | 'father' | 'mother' | 'pickup3' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePhotoRole) return;

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setPhotos((prev) => ({
        ...prev,
        [activePhotoRole]: dataUrl,
      }));
      setActivePhotoRole(null);
    };
    reader.readAsDataURL(file);
  };

  const triggerUpload = (role: 'student' | 'father' | 'mother' | 'pickup3') => {
    setActivePhotoRole(role);
    fileInputRef.current?.click();
  };

  const removePhoto = (role: 'student' | 'father' | 'mother' | 'pickup3') => {
    setPhotos((prev) => {
      const copy = { ...prev };
      delete copy[role];
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!photos.student) {
      setErrorMessage('Please upload the Student Passport Photo before submitting.');
      return;
    }

    if (fatherMobile.replace(/\D/g, '').length !== 10) {
      setErrorMessage("Father's mobile number must be exactly 10 digits.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        studentName: studentName.trim(),
        serialNumber: serialNumber.trim(),
        classSection: classSection.trim(),
        dateOfBirth: dateOfBirth.trim(),
        bloodGroup: bloodGroup.trim(),
        fatherName: fatherName.trim(),
        fatherMobile: fatherMobile.trim(),
        motherName: motherName.trim(),
        motherMobile: motherMobile.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        pincode: pincode.trim(),
        academicSession: sessionYear,
        modeOfTransport,
        teacherName: teacherName.trim(),
        photos,
      };

      const res = await fetch('/api/submissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Server returned error ' + res.status);
      }

      setSubmitted(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMessage(`Submission failed: ${msg}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetForNext = () => {
    setStudentName('');
    setSerialNumber('');
    setDateOfBirth('');
    setFatherName('');
    setFatherMobile('');
    setMotherName('');
    setMotherMobile('');
    setAddressLine1('');
    setAddressLine2('');
    setPincode('');
    setPhotos({});
    setSubmitted(false);
    setErrorMessage(null);
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-8 text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-4 shadow-sm">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Student Card Submitted!
          </h2>
          <p className="text-sm text-slate-600 mb-6 max-w-sm">
            Thank you! <strong>{studentName}</strong>'s details and photos have been received and sent to the ID card printing queue.
          </p>

          <div className="w-full bg-slate-50 rounded-xl p-4 border border-slate-200 text-left mb-6 text-xs space-y-1.5 text-slate-700">
            <div><strong>Student:</strong> {studentName}</div>
            <div><strong>Class:</strong> {classSection || '—'} &bull; <strong>Adm No:</strong> {serialNumber || '—'}</div>
            <div><strong>Father:</strong> {fatherName} ({fatherMobile})</div>
            <div><strong>Photos Uploaded:</strong> {Object.keys(photos).length} attached</div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full">
            <button
              type="button"
              onClick={handleResetForNext}
              className="flex-1 py-3 px-4 bg-[#1e3a8a] hover:bg-blue-900 text-white font-bold rounded-xl text-sm shadow-sm transition-all"
            >
              + Submit Another Student
            </button>

            {onExitToAdmin && (
              <button
                type="button"
                onClick={onExitToAdmin}
                className="py-3 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-sm transition-all"
              >
                Go to Print Admin
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const photoCards = [
    { role: 'student', label: 'Student Photo', photoUrl: photos.student, required: true },
    { role: 'father', label: "Father's Photo", photoUrl: photos.father, required: false },
    { role: 'mother', label: "Mother's Photo", photoUrl: photos.mother, required: false },
    { role: 'pickup3', label: 'Pickup 3 / Guardian', photoUrl: photos.pickup3, required: false },
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100/70 pb-12">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoUpload}
      />

      {/* Top Banner */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-xs">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center shadow-xs">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 leading-tight">
                Teacher ID Card Submission
              </h1>
              <p className="text-xs text-slate-500">
                Academic Session {sessionYear} &bull; {schoolName}
              </p>
            </div>
          </div>

          {onExitToAdmin && (
            <button
              type="button"
              onClick={onExitToAdmin}
              className="text-xs text-slate-600 hover:text-slate-900 font-semibold flex items-center gap-1.5 py-1.5 px-3 rounded-lg hover:bg-slate-100 border border-slate-200"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Admin App</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Submission Form */}
      <main className="max-w-3xl mx-auto px-4 pt-6">
        <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-[#1e3a8a] shrink-0 mt-0.5" />
          <div className="text-xs text-blue-900 leading-relaxed">
            <strong>Welcome Teachers!</strong> Please fill in the student details and take or attach photos. Once submitted, records directly appear in the print operator's queue for generation.
          </div>
        </div>

        {errorMessage && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3 mb-6 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden divide-y divide-slate-200">
          {/* SECTION 1: TEACHER & CLASS */}
          <div className="p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Building className="w-4 h-4 text-[#1e3a8a]" />
              <span>1. Class &amp; Teacher Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class &amp; Section <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={classSection}
                  onChange={(e) => setClassSection(e.target.value)}
                  placeholder="e.g. 5-B or V-A"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Class Teacher Name
                </label>
                <input
                  type="text"
                  value={teacherName}
                  onChange={(e) => setTeacherName(e.target.value)}
                  placeholder="e.g. Mrs. Sharma"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: PHOTOS & PICKUP */}
          <div className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Camera className="w-4 h-4 text-[#1e3a8a]" />
                <span>2. Student &amp; Parent Photos</span>
              </h3>
              <span className="text-[11px] text-slate-500">Take with camera or pick from gallery</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {photoCards.map((card) => (
                <div
                  key={card.role}
                  className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center justify-between text-center"
                >
                  <span className="text-xs font-semibold text-slate-700 mb-2 truncate w-full">
                    {card.label} {card.required && <span className="text-rose-500">*</span>}
                  </span>

                  <div className="w-20 h-24 rounded-lg bg-white border border-slate-300 overflow-hidden flex items-center justify-center mb-2.5 shadow-2xs relative">
                    {card.photoUrl ? (
                      <img
                        src={card.photoUrl}
                        alt={card.label}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-300" />
                    )}
                  </div>

                  <div className="w-full flex items-center justify-center gap-1">
                    <button
                      type="button"
                      onClick={() => triggerUpload(card.role)}
                      className="px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold shadow-2xs flex items-center gap-1"
                    >
                      <Camera className="w-3 h-3 text-blue-600" />
                      <span>{card.photoUrl ? 'Retake' : 'Capture'}</span>
                    </button>

                    {card.photoUrl && (
                      <button
                        type="button"
                        onClick={() => removePhoto(card.role)}
                        className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg border border-slate-200"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION 3: STUDENT INFO */}
          <div className="p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <User className="w-4 h-4 text-[#1e3a8a]" />
              <span>3. Student Information</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student Full Name (in BLOCK LETTERS) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value.toUpperCase())}
                  placeholder="e.g. AARAV SHARMA"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Adm / Roll / Serial No. <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  placeholder="e.g. 7692"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Date of Birth <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  placeholder="DD-MM-YYYY (e.g. 15-08-2014)"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Blood Group
                </label>
                <input
                  type="text"
                  value={bloodGroup}
                  onChange={(e) => setBloodGroup(e.target.value)}
                  placeholder="e.g. B+, O+, A+, AB+"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mode of Transport
                </label>
                <select
                  value={modeOfTransport}
                  onChange={(e) => setModeOfTransport(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden bg-white"
                >
                  <option value="School Van">School Van</option>
                  <option value="School Bus">School Bus</option>
                  <option value="Walker">Walker</option>
                  <option value="Private Vehicle">Private Vehicle</option>
                </select>
              </div>
            </div>
          </div>

          {/* SECTION 4: PARENTS & ADDRESS */}
          <div className="p-5 sm:p-6 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
              <Phone className="w-4 h-4 text-[#1e3a8a]" />
              <span>4. Parents &amp; Contact Details</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value.toUpperCase())}
                  placeholder="e.g. RAJESH SHARMA"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Father's Mobile (10 Digits) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={fatherMobile}
                  onChange={(e) => setFatherMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9811234567"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mother's Name
                </label>
                <input
                  type="text"
                  value={motherName}
                  onChange={(e) => setMotherName(e.target.value.toUpperCase())}
                  placeholder="e.g. PRIYA SHARMA"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mother's Mobile (10 Digits)
                </label>
                <input
                  type="tel"
                  maxLength={10}
                  value={motherMobile}
                  onChange={(e) => setMotherMobile(e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 9811987654"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden font-mono"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Residential Address (Line 1) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={addressLine1}
                  onChange={(e) => setAddressLine1(e.target.value)}
                  placeholder="e.g. Flat 402, Sunshine Apartments"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Locality / Sector (Line 2)
                </label>
                <input
                  type="text"
                  value={addressLine2}
                  onChange={(e) => setAddressLine2(e.target.value)}
                  placeholder="e.g. Sector 14, Rohini"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City</label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden"
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
                    value={pincode}
                    onChange={(e) => setPincode(e.target.value.replace(/\D/g, ''))}
                    placeholder="110085"
                    className="w-full px-3 py-2.5 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-[#1e3a8a] focus:outline-hidden font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit Action */}
          <div className="p-5 sm:p-6 bg-slate-50 flex items-center justify-between">
            <span className="text-xs text-slate-500">
              * Required fields marked
            </span>

            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3 px-8 bg-[#1e3a8a] hover:bg-blue-900 active:bg-blue-950 disabled:opacity-50 text-white font-bold rounded-xl text-sm shadow-sm transition-all flex items-center gap-2 min-h-[44px]"
            >
              <span>{isSubmitting ? 'Submitting…' : 'Submit Student Card'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </form>
      </main>
    </div>
  );
};
