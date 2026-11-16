/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface FieldExtraction {
  value: string;
  raw: string;
  confidence: number;
}

export type TextFieldKey =
  | 'serialNumber'
  | 'academicSession'
  | 'formDate'
  | 'studentName'
  | 'fatherName'
  | 'motherName'
  | 'dateOfBirth'
  | 'classSection'
  | 'addressLine1'
  | 'addressLine2'
  | 'city'
  | 'pincode'
  | 'residencePhone'
  | 'fatherMobile'
  | 'motherMobile'
  | 'modeOfTransport'
  | 'bloodGroup';

export type PhotoRole = 'student' | 'father' | 'mother' | 'guardian' | 'other' | 'exclude';

export interface RawPhotoExtraction {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] 0-1000
  roleGuess: 'student' | 'father' | 'mother' | 'guardian' | 'unknown';
  roleConfidence: number;
  reason: string;
}

export interface ExtractedFormData {
  serialNumber: FieldExtraction;
  academicSession: FieldExtraction;
  formDate: FieldExtraction;
  studentName: FieldExtraction;
  fatherName: FieldExtraction;
  motherName: FieldExtraction;
  dateOfBirth: FieldExtraction;
  classSection: FieldExtraction;
  addressLine1: FieldExtraction;
  addressLine2: FieldExtraction;
  city: FieldExtraction;
  pincode: FieldExtraction;
  residencePhone: FieldExtraction;
  fatherMobile: FieldExtraction;
  motherMobile: FieldExtraction;
  modeOfTransport: FieldExtraction;
  bloodGroup: FieldExtraction;
  photos: RawPhotoExtraction[];
}

export interface ProcessedPhoto {
  id: string;
  originalBox2d: [number, number, number, number]; // original AI box [ymin, xmin, ymax, xmax] (0-1000)
  currentBox2d: [number, number, number, number]; // adjusted crop box [ymin, xmin, ymax, xmax] (0-1000)
  role: PhotoRole;
  roleGuess: 'student' | 'father' | 'mother' | 'guardian' | 'unknown';
  roleConfidence: number;
  confirmed: boolean; // if roleConfidence < 0.8, must be manually confirmed before approval
  reason: string;
  dataUrl: string; // cropped PNG at original resolution
  rotation: number; // 0, 90, 180, 270
}

export type FormStatus = 'Pending' | 'Extracting' | 'Needs Review' | 'Approved' | 'Error';

export interface FormRecord {
  id: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  pageIndex?: number;
  totalPages?: number;
  status: FormStatus;
  errorMessage?: string;
  originalImageDataUrl: string;
  imageWidth: number;
  imageHeight: number;
  fields: Record<TextFieldKey, FieldExtraction>;
  userEditedFields: Record<TextFieldKey, boolean>;
  photos: ProcessedPhoto[];
  createdAt: number;
  updatedAt: number;
}

export interface ValidationIssue {
  field: TextFieldKey;
  severity: 'warning' | 'error';
  message: string;
}

export interface ExportDialogOptions {
  includeOriginalScan: boolean;
  highlightUncertainFields: boolean;
}
