/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type TextFormat = 'upper' | 'date' | 'roman' | 'none';
export type TextAlignment = 'left' | 'center' | 'right';
export type PhotoFit = 'cover' | 'contain';
export type PhotoRowLayout = 'fixed' | 'center';

export interface TextEl {
  id: string;
  label: string;
  side: 'front' | 'back';
  type: 'text';
  x: number;
  y: number;
  w: number;
  h: number;
  content: string; // with {Field} placeholders
  font: string;
  weight: number;
  size: number; // mm cap height
  color: string;
  align: TextAlignment;
  lines: number;
  fmt: TextFormat;
}

export interface PhotoEl {
  id: string;
  label: string;
  side: 'front' | 'back';
  type: 'photo';
  x: number;
  y: number;
  w: number;
  h: number;
  field: string;
  fit: PhotoFit;
  border: number; // mm
  borderColor: string;
}

export interface PhotoRowEl {
  id: string;
  label: string;
  side: 'front' | 'back';
  type: 'photos';
  x: number;
  y: number;
  w: number;
  h: number;
  fields: string[];
  slots: number;
  gap: number; // mm
  layout: PhotoRowLayout;
  fit: PhotoFit;
  border: number;
  borderColor: string;
}

export type CardElement = TextEl | PhotoEl | PhotoRowEl;

export interface CardTemplate {
  id: string;
  name: string;
  schoolName?: string;
  schoolSubtitle?: string;
  schoolLogo?: string;
  primaryColor?: string;
  accentColor?: string;
  textColor?: string;
  fontScale?: number;
  fontFamily?: string;
  isCustomUpload?: boolean;
  w: number; // 90 mm
  h: number; // 58 mm
  bg: {
    front: string; // asset path or data URL
    back: string;
  };
  elements: CardElement[];
}

export interface CardPrintConfig {
  rows: number; // default 5
  rowGap: number; // default 1 mm
  colGap: number; // default 0 mm
  cardPdf: 'pair' | 'two' | 'front';
  pattern: string; // default "{n}_{serialNumber}_{studentName}"
}

export interface CardIssue {
  id: string;
  level: 'error' | 'warning';
  message: string;
}

export interface StudentCardRecord {
  uid: string;
  formId: string;
  serialNumber: string;
  studentName: string;
  fatherName: string;
  motherName: string;
  dateOfBirth: string;
  classSection: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  fatherMobile: string;
  motherMobile: string;
  bloodGroup: string;
  academicSession: string;
  addressFull: string;
  // Photo URLs or base64
  photos: {
    student?: string;
    father?: string;
    mother?: string;
    pickup3?: string;
    [key: string]: string | undefined;
  };
  // Confirmation state for photo safety
  photoConfirmations: {
    student: boolean;
    father: boolean;
    mother: boolean;
    pickup3: boolean;
  };
  includeInPrint: boolean;
  isDuplicate?: boolean;
}
