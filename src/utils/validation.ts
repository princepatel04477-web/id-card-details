/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { FieldExtraction, TextFieldKey, ValidationIssue } from '../types/icard';

export const REQUIRED_FIELDS: readonly TextFieldKey[] = ['studentName', 'classSection', 'dateOfBirth'] as const;

export const PHONE_FIELDS: readonly TextFieldKey[] = ['residencePhone', 'fatherMobile', 'motherMobile'] as const;

/**
 * Validates a date string in DD/MM/YYYY format.
 */
export function isValidDateDDMMYYYY(dateStr: string): boolean {
  if (!dateStr || typeof dateStr !== 'string') return false;
  const match = dateStr.trim().match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > 2100) return false;

  // Days in month validation (accounting for leap year)
  const daysInMonth = new Date(year, month, 0).getDate();
  return day <= daysInMonth;
}

/**
 * Validates a 10-digit Indian phone or mobile number (ignoring spaces or dashes).
 */
export function isValid10DigitPhone(phoneStr: string): boolean {
  if (!phoneStr) return false;
  const cleaned = phoneStr.replace(/\D/g, '');
  return cleaned.length === 10;
}

/**
 * Validates a 6-digit Indian PIN code.
 */
export function isValid6DigitPincode(pincodeStr: string): boolean {
  if (!pincodeStr) return false;
  const cleaned = pincodeStr.replace(/\D/g, '');
  return cleaned.length === 6;
}

/**
 * Evaluates whether a field has validation issues or low confidence.
 */
export function validateField(key: TextFieldKey, field: FieldExtraction): ValidationIssue | null {
  const trimmedVal = (field.value || '').trim();

  // 1. Required fields check
  if (REQUIRED_FIELDS.includes(key)) {
    if (!trimmedVal) {
      return {
        field: key,
        severity: 'error',
        message: 'Required field is empty',
      };
    }
  }

  // 2. Date of birth check
  if (key === 'dateOfBirth' && trimmedVal) {
    if (!isValidDateDDMMYYYY(trimmedVal)) {
      return {
        field: key,
        severity: 'warning',
        message: 'Invalid date format (must be valid DD/MM/YYYY)',
      };
    }
  }

  // 3. Pincode check
  if (key === 'pincode' && trimmedVal) {
    if (!isValid6DigitPincode(trimmedVal)) {
      return {
        field: key,
        severity: 'warning',
        message: 'Pincode must be exactly 6 digits',
      };
    }
  }

  // 4. Phone numbers check
  if (PHONE_FIELDS.includes(key) && trimmedVal) {
    if (!isValid10DigitPhone(trimmedVal)) {
      return {
        field: key,
        severity: 'warning',
        message: 'Phone number must be exactly 10 digits',
      };
    }
  }

  // 5. Low confidence check (< 0.85)
  if (trimmedVal && field.confidence < 0.85) {
    return {
      field: key,
      severity: 'warning',
      message: `Low AI confidence (${Math.round(field.confidence * 100)}%) — verify against scan`,
    };
  }

  return null;
}

/**
 * Validates all fields in a record.
 */
export function validateAllFields(fields: Record<TextFieldKey, FieldExtraction>): Record<TextFieldKey, ValidationIssue | null> {
  const keys = Object.keys(fields) as TextFieldKey[];
  const result = {} as Record<TextFieldKey, ValidationIssue | null>;
  for (const key of keys) {
    result[key] = validateField(key, fields[key]);
  }
  return result;
}

/**
 * Checks if a field should be flagged with an amber border.
 */
export function isFieldFlagged(
  key: TextFieldKey,
  field: FieldExtraction,
  isUserEdited: boolean
): { flagged: boolean; reason: string | null } {
  const issue = validateField(key, field);
  if (!issue) {
    return { flagged: false, reason: null };
  }

  // If user edited it, low confidence alone doesn't trigger a warning if the value is otherwise valid
  if (isUserEdited && issue.message.startsWith('Low AI confidence')) {
    return { flagged: false, reason: null };
  }

  return { flagged: true, reason: issue.message };
}

/**
 * Checks whether all required conditions for Approval are met:
 * 1. Required fields are non-empty.
 * 2. All photos with roleConfidence < 0.8 have been manually confirmed.
 */
export function canApproveForm(
  fields: Record<TextFieldKey, FieldExtraction>,
  photos: Array<{ confirmed: boolean; roleConfidence: number; role: string }>
): { allowed: boolean; blockingReasons: string[] } {
  const reasons: string[] = [];

  for (const reqKey of REQUIRED_FIELDS) {
    if (!fields[reqKey] || !fields[reqKey].value.trim()) {
      reasons.push(`Missing required field: ${reqKey}`);
    }
  }

  // Adult photos must be manually confirmed regardless of AI confidence
  const unconfirmedAdultPhotos = photos.filter(
    (p) =>
      p.role !== 'exclude' &&
      (p.role === 'father' || p.role === 'mother' || p.role === 'guardian') &&
      !p.confirmed
  );

  if (unconfirmedAdultPhotos.length > 0) {
    reasons.push(
      `${unconfirmedAdultPhotos.length} adult pick-up photo(s) must be manually confirmed.`
    );
  }

  // Student photo must be confirmed if roleConfidence < 0.9
  const unconfirmedStudentPhotos = photos.filter(
    (p) => p.role === 'student' && p.roleConfidence < 0.9 && !p.confirmed
  );

  if (unconfirmedStudentPhotos.length > 0) {
    reasons.push(
      `Student photo has low confidence (<90%) and must be confirmed.`
    );
  }

  return {
    allowed: reasons.length === 0,
    blockingReasons: reasons,
  };
}
