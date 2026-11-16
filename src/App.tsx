/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { FormRecord, TextFieldKey, ProcessedPhoto, ExtractedFormData } from './types/icard';
import { StudentCardRecord, CardTemplate, CardIssue } from './types/idcard';
import { Navbar } from './components/v2/Navbar';
import { UploadScreen } from './components/v2/UploadScreen';
import { CheckCardsScreen } from './components/v2/CheckCardsScreen';
import { PrintScreen } from './components/v2/PrintScreen';
import { SettingsModal } from './components/v2/SettingsModal';
import { CardDesignModal } from './components/v2/CardDesignModal';
import { ConfirmModal } from './components/v2/ConfirmModal';
import { StudentFormModal } from './components/v2/StudentFormModal';
import { ToastContainer, ToastMessage } from './components/Toast';
import { loadAllForms, saveForm, deleteForm, clearAllForms } from './utils/storage';
import { renderPdfToImages } from './utils/pdf';
import { generateSampleICardImage } from './utils/sampleData';
import { cropImageFromBox } from './utils/crop';
import {
  loadCurrentTemplate,
  saveCurrentTemplate,
  BAL_BHAVAN_DEFAULT_TEMPLATE,
  MODERN_SCHOOL_DEFAULT_TEMPLATE,
} from './utils/cardTemplates';
import { importStudentsFromExcel } from './utils/excelImport';
import { analyzeCardIssues } from './utils/cardRenderer';
import { TeacherSubmissionPortal } from './components/v2/TeacherSubmissionPortal';
import { ShareTeacherLinkModal } from './components/v2/ShareTeacherLinkModal';
import { SchoolDesignModal } from './components/v2/SchoolDesignModal';

const EMPTY_FIELDS = (): Record<TextFieldKey, { value: string; raw: string; confidence: number }> => ({
  serialNumber: { value: '', raw: '', confidence: 0 },
  academicSession: { value: '', raw: '', confidence: 0 },
  formDate: { value: '', raw: '', confidence: 0 },
  studentName: { value: '', raw: '', confidence: 0 },
  fatherName: { value: '', raw: '', confidence: 0 },
  motherName: { value: '', raw: '', confidence: 0 },
  dateOfBirth: { value: '', raw: '', confidence: 0 },
  classSection: { value: '', raw: '', confidence: 0 },
  addressLine1: { value: '', raw: '', confidence: 0 },
  addressLine2: { value: '', raw: '', confidence: 0 },
  city: { value: '', raw: '', confidence: 0 },
  pincode: { value: '', raw: '', confidence: 0 },
  residencePhone: { value: '', raw: '', confidence: 0 },
  fatherMobile: { value: '', raw: '', confidence: 0 },
  motherMobile: { value: '', raw: '', confidence: 0 },
  modeOfTransport: { value: '', raw: '', confidence: 0 },
  bloodGroup: { value: '', raw: '', confidence: 0 },
});

const EMPTY_USER_EDITED = (): Record<TextFieldKey, boolean> => ({
  serialNumber: false,
  academicSession: false,
  formDate: false,
  studentName: false,
  fatherName: false,
  motherName: false,
  dateOfBirth: false,
  classSection: false,
  addressLine1: false,
  addressLine2: false,
  city: false,
  pincode: false,
  residencePhone: false,
  fatherMobile: false,
  motherMobile: false,
  modeOfTransport: false,
  bloodGroup: false,
});

export default function App() {
  const [isTeacherMode, setIsTeacherMode] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      return params.get('mode') === 'teacher-form' || window.location.pathname === '/teacher-form';
    }
    return false;
  });

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1);
  const [forms, setForms] = useState<FormRecord[]>([]);
  const [selectedStudentUid, setSelectedStudentUid] = useState<string | null>(null);
  const [sessionYear, setSessionYear] = useState<string>('2026-27');
  const [template, setTemplate] = useState<CardTemplate>(structuredClone(MODERN_SCHOOL_DEFAULT_TEMPLATE));

  // Modals moved out of main flow
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showDesignModal, setShowDesignModal] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showManualFormModal, setShowManualFormModal] = useState(false);
  const [showShareTeacherModal, setShowShareTeacherModal] = useState(false);
  const [showSchoolModal, setShowSchoolModal] = useState(false);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const processingRef = useRef<Set<string>>(new Set());
  const excelInputRef = useRef<HTMLInputElement>(null);
  const seenSubmissionIds = useRef<Set<string>>(new Set());

  // Toast notification helper
  const addToast = useCallback(
    (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, type, message }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 4000);
    },
    []
  );

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Listen for browser navigation changes for ?mode=teacher-form
  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setIsTeacherMode(params.get('mode') === 'teacher-form' || window.location.pathname === '/teacher-form');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Poll teacher submissions every 4 seconds
  useEffect(() => {
    if (isTeacherMode) return;
    let cancelled = false;

    async function pollSubmissions() {
      try {
        const res = await fetch('/api/submissions');
        if (!res.ok) return;
        const list = await res.json();
        if (cancelled || !Array.isArray(list)) return;

        setSubmissionsCount(list.length);

        for (const sub of list) {
          if (!seenSubmissionIds.current.has(sub.id)) {
            seenSubmissionIds.current.add(sub.id);

            setForms((prev) => {
              if (prev.some((f) => f.id === sub.id)) return prev;

              const photos: ProcessedPhoto[] = [];
              const addPhoto = (role: 'student' | 'father' | 'mother' | 'guardian', url?: string) => {
                if (url) {
                  photos.push({
                    id: `photo_${sub.id}_${role}`,
                    originalBox2d: [150, 150, 750, 750],
                    currentBox2d: [150, 150, 750, 750],
                    role,
                    roleGuess: role,
                    roleConfidence: 1.0,
                    confirmed: true,
                    reason: 'Teacher submission upload',
                    dataUrl: url,
                    rotation: 0,
                  });
                }
              };
              addPhoto('student', sub.photos?.student);
              addPhoto('father', sub.photos?.father);
              addPhoto('mother', sub.photos?.mother);
              addPhoto('guardian', sub.photos?.pickup3);

              const newRec: FormRecord = {
                id: sub.id,
                fileName: `Teacher_${sub.classSection || 'Class'}_${sub.studentName}.png`,
                fileSize: 85000,
                mimeType: 'image/png',
                status: 'Needs Review',
                originalImageDataUrl: sub.photos?.student || '',
                imageWidth: 1063,
                imageHeight: 685,
                fields: {
                  serialNumber: { value: sub.serialNumber, raw: sub.serialNumber, confidence: 1 },
                  academicSession: { value: sub.academicSession || sessionYear, raw: sub.academicSession || sessionYear, confidence: 1 },
                  formDate: { value: '', raw: '', confidence: 0 },
                  studentName: { value: sub.studentName, raw: sub.studentName, confidence: 1 },
                  fatherName: { value: sub.fatherName, raw: sub.fatherName, confidence: 1 },
                  motherName: { value: sub.motherName, raw: sub.motherName, confidence: 1 },
                  dateOfBirth: { value: sub.dateOfBirth, raw: sub.dateOfBirth, confidence: 1 },
                  classSection: { value: sub.classSection, raw: sub.classSection, confidence: 1 },
                  addressLine1: { value: sub.addressLine1, raw: sub.addressLine1, confidence: 1 },
                  addressLine2: { value: sub.addressLine2, raw: sub.addressLine2, confidence: 1 },
                  city: { value: sub.city, raw: sub.city, confidence: 1 },
                  pincode: { value: sub.pincode, raw: sub.pincode, confidence: 1 },
                  residencePhone: { value: '', raw: '', confidence: 0 },
                  fatherMobile: { value: sub.fatherMobile, raw: sub.fatherMobile, confidence: 1 },
                  motherMobile: { value: sub.motherMobile, raw: sub.motherMobile, confidence: 1 },
                  modeOfTransport: { value: sub.modeOfTransport || 'School Van', raw: sub.modeOfTransport || 'School Van', confidence: 1 },
                  bloodGroup: { value: sub.bloodGroup, raw: sub.bloodGroup, confidence: 1 },
                },
                userEditedFields: EMPTY_USER_EDITED(),
                photos,
                createdAt: sub.submittedAt || Date.now(),
                updatedAt: sub.submittedAt || Date.now(),
              };

              saveForm(newRec);
              addToast(`New submission from Teacher: ${sub.studentName} (${sub.classSection || 'Class'})`, 'success');
              return [...prev, newRec];
            });
          }
        }
      } catch {
        // network polling fallback
      }
    }

    pollSubmissions();
    const timer = setInterval(pollSubmissions, 4000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [isTeacherMode, sessionYear, addToast]);

  // Load persisted forms and template on mount
  useEffect(() => {
    async function init() {
      try {
        const savedForms = await loadAllForms();
        if (savedForms && savedForms.length > 0) {
          setForms(savedForms);
          setSelectedStudentUid(savedForms[0].id);
        }
        const savedTemplate = await loadCurrentTemplate();
        setTemplate(savedTemplate);
      } catch {
        // Storage initialization error handled
      }
    }
    init();
  }, []);

  // Update a single form record
  const handleUpdateForm = useCallback(async (updated: FormRecord) => {
    setForms((prev) => prev.map((f) => (f.id === updated.id ? updated : f)));
    await saveForm(updated);
  }, []);

  // Delete a single form record / student card
  const handleDeleteStudent = useCallback(
    async (formId: string) => {
      await deleteForm(formId);
      setForms((prev) => {
        const remaining = prev.filter((f) => f.id !== formId);
        if (selectedStudentUid === formId) {
          setSelectedStudentUid(remaining.length > 0 ? remaining[0].id : null);
        }
        return remaining;
      });
      addToast('Student record deleted', 'info');
    },
    [selectedStudentUid, addToast]
  );

  // Extraction worker
  const extractForm = useCallback(
    async (formId: string) => {
      const targetForm = forms.find((f) => f.id === formId);
      if (!targetForm) return;

      processingRef.current.add(formId);

      const inProgressForm: FormRecord = {
        ...targetForm,
        status: 'Extracting',
        errorMessage: undefined,
        updatedAt: Date.now(),
      };
      await handleUpdateForm(inProgressForm);

      try {
        const response = await fetch('/api/gemini/extract', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            imageBase64: inProgressForm.originalImageDataUrl,
            mimeType: inProgressForm.mimeType || 'image/png',
          }),
        });

        if (!response.ok) {
          const errData = (await response.json().catch(() => ({}))) as { error?: string };
          throw new Error(errData.error || `HTTP ${response.status}`);
        }

        const data = (await response.json()) as ExtractedFormData;

        const processedPhotos: ProcessedPhoto[] = [];
        for (let i = 0; i < (data.photos || []).length; i++) {
          const rawPhoto = data.photos[i];
          const photoId = `photo_${formId}_${i + 1}`;
          const cropUrl = await cropImageFromBox(
            inProgressForm.originalImageDataUrl,
            rawPhoto.box_2d,
            0
          );

          const role = rawPhoto.roleGuess === 'unknown' ? 'other' : rawPhoto.roleGuess;
          const isHighConfidence = rawPhoto.roleConfidence >= 0.8;

          processedPhotos.push({
            id: photoId,
            originalBox2d: rawPhoto.box_2d,
            currentBox2d: rawPhoto.box_2d,
            role,
            roleGuess: rawPhoto.roleGuess,
            roleConfidence: rawPhoto.roleConfidence,
            confirmed: isHighConfidence,
            reason: rawPhoto.reason,
            dataUrl: cropUrl,
            rotation: 0,
          });
        }

        const completedForm: FormRecord = {
          ...inProgressForm,
          status: 'Needs Review',
          fields: {
            serialNumber: data.serialNumber || EMPTY_FIELDS().serialNumber,
            academicSession: data.academicSession || EMPTY_FIELDS().academicSession,
            formDate: data.formDate || EMPTY_FIELDS().formDate,
            studentName: data.studentName || EMPTY_FIELDS().studentName,
            fatherName: data.fatherName || EMPTY_FIELDS().fatherName,
            motherName: data.motherName || EMPTY_FIELDS().motherName,
            dateOfBirth: data.dateOfBirth || EMPTY_FIELDS().dateOfBirth,
            classSection: data.classSection || EMPTY_FIELDS().classSection,
            addressLine1: data.addressLine1 || EMPTY_FIELDS().addressLine1,
            addressLine2: data.addressLine2 || EMPTY_FIELDS().addressLine2,
            city: data.city || EMPTY_FIELDS().city,
            pincode: data.pincode || EMPTY_FIELDS().pincode,
            residencePhone: data.residencePhone || EMPTY_FIELDS().residencePhone,
            fatherMobile: data.fatherMobile || EMPTY_FIELDS().fatherMobile,
            motherMobile: data.motherMobile || EMPTY_FIELDS().motherMobile,
            modeOfTransport: data.modeOfTransport || EMPTY_FIELDS().modeOfTransport,
            bloodGroup: data.bloodGroup || EMPTY_FIELDS().bloodGroup,
          },
          photos: processedPhotos,
          updatedAt: Date.now(),
        };

        await handleUpdateForm(completedForm);
        addToast(`Card prepared for ${completedForm.fields.studentName.value || completedForm.fileName}`, 'success');
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        const failedForm: FormRecord = {
          ...inProgressForm,
          status: 'Error',
          errorMessage: errorMsg,
          updatedAt: Date.now(),
        };
        await handleUpdateForm(failedForm);
        addToast(`Could not read ${failedForm.fileName}`, 'error');
      } finally {
        processingRef.current.delete(formId);
      }
    },
    [forms, handleUpdateForm, addToast]
  );

  const hasActiveUploadBatchRef = useRef(false);

  // Queue orchestrator with auto-advance to Screen 2 when extraction finishes
  useEffect(() => {
    const pendingForms = forms.filter(
      (f) => f.status === 'Pending' && !processingRef.current.has(f.id)
    );

    if (pendingForms.length > 0 && processingRef.current.size < 2) {
      const capacity = 2 - processingRef.current.size;
      const nextBatch = pendingForms.slice(0, capacity);
      for (const formToProcess of nextBatch) {
        extractForm(formToProcess.id);
      }
    } else if (
      processingRef.current.size === 0 &&
      forms.length > 0 &&
      pendingForms.length === 0 &&
      currentStep === 1 &&
      hasActiveUploadBatchRef.current
    ) {
      // All extractions finished for newly dropped files: advance to Screen 2!
      hasActiveUploadBatchRef.current = false;
      const hasCompleted = forms.some(
        (f) => f.status === 'Needs Review' || f.status === 'Approved'
      );
      if (hasCompleted) {
        const timer = setTimeout(() => {
          setCurrentStep(2);
        }, 600);
        return () => clearTimeout(timer);
      }
    }
  }, [forms, extractForm, currentStep]);

  // Handle uploaded files
  const handleFilesSelected = async (files: FileList | File[]) => {
    const newRecords: FormRecord[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        addToast(`Reading PDF: ${file.name}…`, 'info');
        try {
          const pages = await renderPdfToImages(file);
          pages.forEach((page) => {
            const formId = `form_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
            newRecords.push({
              id: formId,
              fileName: `${file.name} (Page ${page.pageIndex})`,
              fileSize: file.size,
              mimeType: 'image/png',
              pageIndex: page.pageIndex,
              totalPages: page.totalPages,
              status: 'Pending',
              originalImageDataUrl: page.dataUrl,
              imageWidth: page.width,
              imageHeight: page.height,
              fields: EMPTY_FIELDS(),
              userEditedFields: EMPTY_USER_EDITED(),
              photos: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            });
          });
          addToast(`Loaded ${pages.length} page(s) from PDF`, 'success');
        } catch (pdfErr: unknown) {
          const msg = pdfErr instanceof Error ? pdfErr.message : String(pdfErr);
          addToast(`Could not load PDF: ${msg}`, 'error');
        }
      } else {
        const reader = new FileReader();
        const readPromise = new Promise<FormRecord>((resolve, reject) => {
          reader.onload = () => {
            const dataUrl = reader.result as string;
            const img = new Image();
            img.onload = () => {
              const formId = `form_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
              resolve({
                id: formId,
                fileName: file.name,
                fileSize: file.size,
                mimeType: file.type || 'image/png',
                status: 'Pending',
                originalImageDataUrl: dataUrl,
                imageWidth: img.naturalWidth || 1000,
                imageHeight: img.naturalHeight || 1400,
                fields: EMPTY_FIELDS(),
                userEditedFields: EMPTY_USER_EDITED(),
                photos: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              });
            };
            img.onerror = () => reject(new Error('Invalid image file'));
            img.src = dataUrl;
          };
          reader.onerror = () => reject(new Error('Failed to read file'));
          reader.readAsDataURL(file);
        });

        try {
          const record = await readPromise;
          newRecords.push(record);
        } catch {
          addToast(`Could not load image: ${file.name}`, 'error');
        }
      }
    }

    if (newRecords.length > 0) {
      hasActiveUploadBatchRef.current = true;
      setForms((prev) => [...prev, ...newRecords]);
      for (const rec of newRecords) {
        await saveForm(rec);
      }
      if (!selectedStudentUid) {
        setSelectedStudentUid(newRecords[0].id);
      }
      addToast(`Added ${newRecords.length} form(s)`, 'info');
    }
  };

  // Load realistic sample I-Card
  const handleLoadSample = async () => {
    hasActiveUploadBatchRef.current = true;
    addToast('Loading realistic sample admission form…', 'info');
    try {
      const sample = await generateSampleICardImage();
      const formId = `form_${Date.now()}_sample`;
      const sampleRecord: FormRecord = {
        id: formId,
        fileName: 'Sample_ICard_Performa_7692.png',
        fileSize: 450000,
        mimeType: 'image/png',
        status: 'Pending',
        originalImageDataUrl: sample.dataUrl,
        imageWidth: sample.width,
        imageHeight: sample.height,
        fields: EMPTY_FIELDS(),
        userEditedFields: EMPTY_USER_EDITED(),
        photos: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      setForms((prev) => [sampleRecord, ...prev]);
      await saveForm(sampleRecord);
      setSelectedStudentUid(formId);
      addToast('Sample loaded & reading handwriting…', 'success');
    } catch {
      addToast('Could not load sample form', 'error');
    }
  };

  // Retry failed form
  const handleRetryForm = (formId: string) => {
    const updated = forms.map((f) =>
      f.id === formId ? { ...f, status: 'Pending' as const, errorMessage: undefined } : f
    );
    setForms(updated);
    const target = updated.find((f) => f.id === formId);
    if (target) saveForm(target);
  };

  // Clear all data
  const handleClearAll = async () => {
    setForms([]);
    setSelectedStudentUid(null);
    processingRef.current.clear();
    await clearAllForms();
    setShowClearConfirm(false);
    setCurrentStep(1);
    addToast('All data cleared', 'info');
  };

  // Import Old Excel with anchored photos
  const handleImportExcelFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    addToast('Reading Excel spreadsheet & extracting cell photos…', 'info');
    try {
      const buffer = await file.arrayBuffer();
      const importedRecords = await importStudentsFromExcel(buffer, file.name);
      setForms((prev) => [...prev, ...importedRecords]);
      for (const rec of importedRecords) {
        await saveForm(rec);
      }
      if (importedRecords.length > 0) {
        setSelectedStudentUid(importedRecords[0].id);
        setCurrentStep(2);
      }
      addToast(`Imported ${importedRecords.length} cards from Excel!`, 'success');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addToast(`Failed to import Excel: ${msg}`, 'error');
    } finally {
      if (excelInputRef.current) excelInputRef.current.value = '';
    }
  };

  // Create new manual student directly from form
  const handleCreateManualStudent = async (newStudent: StudentCardRecord) => {
    const formId = `form_manual_${Date.now()}`;
    const photos: ProcessedPhoto[] = [];

    const addManualPhoto = (
      role: 'student' | 'father' | 'mother' | 'guardian',
      url?: string
    ) => {
      if (url) {
        photos.push({
          id: `photo_${formId}_${role}`,
          originalBox2d: [150, 150, 750, 750],
          currentBox2d: [150, 150, 750, 750],
          role,
          roleGuess: role,
          roleConfidence: 1.0,
          confirmed: true,
          reason: 'Manual form upload',
          dataUrl: url,
          rotation: 0,
        });
      }
    };

    addManualPhoto('student', newStudent.photos.student);
    addManualPhoto('father', newStudent.photos.father);
    addManualPhoto('mother', newStudent.photos.mother);
    addManualPhoto('guardian', newStudent.photos.pickup3);

    const newRecord: FormRecord = {
      id: formId,
      fileName: `Manual_${newStudent.studentName || 'Student'}.png`,
      fileSize: 100000,
      mimeType: 'image/png',
      status: 'Needs Review',
      originalImageDataUrl: newStudent.photos.student || '',
      imageWidth: 1063,
      imageHeight: 685,
      fields: {
        serialNumber: { value: newStudent.serialNumber, raw: newStudent.serialNumber, confidence: 1 },
        academicSession: { value: newStudent.academicSession || sessionYear, raw: newStudent.academicSession || sessionYear, confidence: 1 },
        formDate: { value: '', raw: '', confidence: 0 },
        studentName: { value: newStudent.studentName, raw: newStudent.studentName, confidence: 1 },
        fatherName: { value: newStudent.fatherName, raw: newStudent.fatherName, confidence: 1 },
        motherName: { value: newStudent.motherName, raw: newStudent.motherName, confidence: 1 },
        dateOfBirth: { value: newStudent.dateOfBirth, raw: newStudent.dateOfBirth, confidence: 1 },
        classSection: { value: newStudent.classSection, raw: newStudent.classSection, confidence: 1 },
        addressLine1: { value: newStudent.addressLine1, raw: newStudent.addressLine1, confidence: 1 },
        addressLine2: { value: newStudent.addressLine2, raw: newStudent.addressLine2, confidence: 1 },
        city: { value: newStudent.city, raw: newStudent.city, confidence: 1 },
        pincode: { value: newStudent.pincode, raw: newStudent.pincode, confidence: 1 },
        residencePhone: { value: '', raw: '', confidence: 0 },
        fatherMobile: { value: newStudent.fatherMobile, raw: newStudent.fatherMobile, confidence: 1 },
        motherMobile: { value: newStudent.motherMobile, raw: newStudent.motherMobile, confidence: 1 },
        modeOfTransport: { value: 'Walker', raw: 'Walker', confidence: 1 },
        bloodGroup: { value: newStudent.bloodGroup, raw: newStudent.bloodGroup, confidence: 1 },
      },
      userEditedFields: EMPTY_USER_EDITED(),
      photos,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    setForms((prev) => [...prev, newRecord]);
    await saveForm(newRecord);
    setSelectedStudentUid(formId);
    setCurrentStep(2);
    setShowManualFormModal(false);
    addToast(`Added ${newStudent.studentName || 'Student'}!`, 'success');
  };

  // Convert FormRecord[] into StudentCardRecord[]
  const students: StudentCardRecord[] = useMemo(() => {
    return forms.map((f, idx) => {
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
        academicSession: sessionYear || f.fields.academicSession?.value || '2026-27',
        addressFull: addressParts.join(', '),
        photos: photoMap,
        photoConfirmations: confirmMap,
        includeInPrint: f.status === 'Approved' || idx === 0,
      };
    });
  }, [forms, sessionYear]);

  // Ensure selected student exists
  useEffect(() => {
    if (!selectedStudentUid && students.length > 0) {
      setSelectedStudentUid(students[0].uid);
    }
  }, [selectedStudentUid, students]);

  // Synchronize student updates back into parent FormRecord
  const handleUpdateStudent = async (updated: StudentCardRecord) => {
    const parentForm = forms.find((f) => f.id === updated.formId);
    if (!parentForm) return;

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
            reason: 'User confirmed in card studio',
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
      },
      photos: updatedFormPhotos,
      updatedAt: Date.now(),
    };

    await handleUpdateForm(updatedForm);
  };

  // Ready cards calculation
  const readyCardsCount = useMemo(() => {
    let count = 0;
    for (const s of students) {
      const issues = analyzeCardIssues(s, template, students);
      if (issues.length === 0) count++;
    }
    return count;
  }, [students, template]);

  const step1Completed = forms.length > 0 && !forms.some((f) => f.status === 'Extracting');
  const step2Completed = forms.length > 0 && readyCardsCount === forms.length;
  const step3Completed = false;

  // When teacher mode is active (?mode=teacher-form), show the mobile-friendly Teacher Portal
  if (isTeacherMode) {
    return (
      <TeacherSubmissionPortal
        sessionYear={sessionYear}
        schoolName={template.name}
        onExitToAdmin={() => {
          window.history.replaceState({}, '', window.location.pathname);
          setIsTeacherMode(false);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-900 font-sans">
      {/* Hidden file input for Excel import */}
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        className="hidden"
        onChange={handleImportExcelFile}
      />

      {/* Top Bar with 3 Steps */}
      <Navbar
        currentStep={currentStep}
        step1Completed={step1Completed}
        step2Completed={step2Completed}
        step3Completed={step3Completed}
        onSelectStep={(step) => setCurrentStep(step)}
        onOpenDesign={() => setShowDesignModal(true)}
        onOpenSettings={() => setShowSettingsModal(true)}
        onOpenManualForm={() => setShowManualFormModal(true)}
        onOpenShareTeacher={() => setShowShareTeacherModal(true)}
        onOpenTeacherPortalDirectly={() => {
          window.history.pushState({}, '', '?mode=teacher-form');
          setIsTeacherMode(true);
        }}
        onOpenSchoolModal={() => setShowSchoolModal(true)}
        template={template}
        onImportExcel={() => excelInputRef.current?.click()}
        onLoadSample={handleLoadSample}
        onClearAll={() => setShowClearConfirm(true)}
        readyCardsCount={readyCardsCount}
        totalCardsCount={students.length}
      />

      {/* Main Screen Content: Exactly 3 Screens */}
      <main className="flex-1 flex flex-col min-h-0 overflow-hidden relative">
        {currentStep === 1 ? (
          <UploadScreen
            forms={forms}
            isProcessing={processingRef.current.size > 0}
            onFilesSelected={handleFilesSelected}
            onLoadSample={handleLoadSample}
            onRetryForm={handleRetryForm}
            onDeleteForm={handleDeleteStudent}
            onGoToCheckCards={() => setCurrentStep(2)}
            onOpenSettings={() => setShowSettingsModal(true)}
            onOpenManualForm={() => setShowManualFormModal(true)}
            onOpenShareTeacher={() => setShowShareTeacherModal(true)}
            onOpenTeacherPortalDirectly={() => {
              window.history.pushState({}, '', '?mode=teacher-form');
              setIsTeacherMode(true);
            }}
            onOpenSchoolModal={() => setShowSchoolModal(true)}
            onOpenUploadDesign={() => setShowSchoolModal(true)}
            template={template}
            sessionYear={sessionYear}
          />
        ) : currentStep === 2 ? (
          <CheckCardsScreen
            students={students}
            forms={forms}
            template={template}
            selectedStudentUid={selectedStudentUid}
            onSelectStudent={(uid) => setSelectedStudentUid(uid)}
            onUpdateStudent={handleUpdateStudent}
            onDeleteStudent={handleDeleteStudent}
            onSwitchTemplate={(newTpl) => {
              setTemplate(newTpl);
              saveCurrentTemplate(newTpl);
            }}
            onGoToPrint={() => setCurrentStep(3)}
            onShowToast={addToast}
          />
        ) : (
          <PrintScreen
            students={students}
            forms={forms}
            template={template}
            onGoBackToCheck={() => setCurrentStep(2)}
            onShowToast={addToast}
          />
        )}
      </main>

      {/* Subtle, non-intrusive single-line privacy footer */}
      <footer className="bg-white border-t border-slate-200 py-1.5 px-4 text-center text-[11px] text-slate-400 shrink-0">
        Images are processed directly in your browser or with Google Gemini. No student records are stored on external servers.
      </footer>

      {/* Settings Modal (Academic session & template) */}
      <SettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        sessionYear={sessionYear}
        onSaveSessionYear={(yr) => setSessionYear(yr)}
        template={template}
        onUpdateTemplateTitle={(title) => {
          const updated = { ...template, name: title };
          setTemplate(updated);
          saveCurrentTemplate(updated);
        }}
        onShowToast={addToast}
      />

      {/* Card Designer Modal (Moved out of main flow) */}
      <CardDesignModal
        isOpen={showDesignModal}
        onClose={() => setShowDesignModal(false)}
        template={template}
        onUpdateTemplate={(newTemplate) => {
          setTemplate(newTemplate);
          saveCurrentTemplate(newTemplate);
        }}
        sampleStudent={students[0] || {
          uid: 'sample',
          formId: 'sample',
          serialNumber: '7692',
          studentName: 'AARAV SHARMA',
          fatherName: 'RAJESH SHARMA',
          motherName: 'PRIYA SHARMA',
          dateOfBirth: '15-08-2014',
          classSection: 'V-B',
          addressLine1: 'Flat 402, Sunshine Apartments',
          addressLine2: 'Sector 14, Rohini',
          city: 'New Delhi',
          pincode: '110085',
          fatherMobile: '9811234567',
          motherMobile: '9811987654',
          bloodGroup: 'B+',
          academicSession: sessionYear,
          addressFull: 'Flat 402, Sunshine Apartments, Sector 14, Rohini, New Delhi',
          photos: {},
          photoConfirmations: { student: true, father: true, mother: true, pickup3: true },
          includeInPrint: true,
        }}
        onShowToast={addToast}
      />

      {/* New Student Manual Form Modal */}
      {showManualFormModal && (
        <StudentFormModal
          isOpen={showManualFormModal}
          onClose={() => setShowManualFormModal(false)}
          student={{
            uid: `student_${Date.now()}`,
            formId: `form_${Date.now()}`,
            serialNumber: '',
            studentName: '',
            fatherName: '',
            motherName: '',
            dateOfBirth: '',
            classSection: '',
            addressLine1: '',
            addressLine2: '',
            city: 'New Delhi',
            pincode: '',
            fatherMobile: '',
            motherMobile: '',
            bloodGroup: '',
            academicSession: sessionYear,
            addressFull: '',
            photos: {},
            photoConfirmations: { student: false, father: false, mother: false, pickup3: false },
            includeInPrint: true,
          }}
          onSave={handleCreateManualStudent}
          isNewStudent={true}
        />
      )}

      {/* Share Link with Teachers Modal */}
      <ShareTeacherLinkModal
        isOpen={showShareTeacherModal}
        onClose={() => setShowShareTeacherModal(false)}
        submissionsCount={submissionsCount}
        onShowToast={addToast}
        onOpenTeacherPortalDirectly={() => {
          setShowShareTeacherModal(false);
          window.history.pushState({}, '', '?mode=teacher-form');
          setIsTeacherMode(true);
        }}
      />

      {/* School Profiles & Upload Design Modal */}
      {showSchoolModal && (
        <SchoolDesignModal
          isOpen={showSchoolModal}
          onClose={() => setShowSchoolModal(false)}
          currentSchoolId={template.id}
          onSelectSchool={(newTpl) => {
            setTemplate(newTpl);
            saveCurrentTemplate(newTpl);
          }}
          onShowToast={addToast}
        />
      )}

      {/* Clear All Confirmation Modal */}
      <ConfirmModal
        isOpen={showClearConfirm}
        title="Clear all student data?"
        message="This will remove all uploaded performa forms, photos, and cards from local storage. This action cannot be undone."
        confirmLabel="Clear Data"
        onConfirm={handleClearAll}
        onCancel={() => setShowClearConfirm(false)}
      />

      {/* Toast Notifications */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
