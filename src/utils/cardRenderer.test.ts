/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatCardText,
  resolveCardTemplateText,
  analyzeCardIssues,
} from './cardRenderer';
import { calculateA4SheetLayout } from './cardPrintExport';
import { BAL_BHAVAN_DEFAULT_TEMPLATE } from './cardTemplates';
import { StudentCardRecord } from '../types/idcard';

test('formatCardText applies upper, date, and roman formatting accurately', () => {
  // upper
  assert.equal(formatCardText('aarav sharma', 'upper'), 'AARAV SHARMA');

  // date zero-padding: d/m/yyyy -> DD-MM-YYYY
  assert.equal(formatCardText('5/7/2014', 'date'), '05-07-2014');
  assert.equal(formatCardText('15/8/2014', 'date'), '15-08-2014');
  assert.equal(formatCardText('01-04-2024', 'date'), '01-04-2024');

  // roman: leading 1-2 digit class number -> Roman numeral (1–12 -> I–XII)
  assert.equal(formatCardText('5-B', 'roman'), 'V-B');
  assert.equal(formatCardText('1-A', 'roman'), 'I-A');
  assert.equal(formatCardText('9-C', 'roman'), 'IX-C');
  assert.equal(formatCardText('10-A', 'roman'), 'X-A');
  assert.equal(formatCardText('12-B', 'roman'), 'XII-B');

  // none
  assert.equal(formatCardText('Walker', 'none'), 'Walker');
});

test('resolveCardTemplateText correctly replaces placeholders and formats result', () => {
  const sampleStudent: StudentCardRecord = {
    uid: 'stu_1',
    formId: 'form_1',
    serialNumber: '7692',
    studentName: 'Aarav Sharma',
    fatherName: 'Rajesh Sharma',
    motherName: 'Priya Sharma',
    dateOfBirth: '5/7/2014',
    classSection: '5-B',
    addressLine1: 'Flat 101, Galaxy Apts',
    addressLine2: 'Sector 14',
    city: 'Rohini',
    pincode: '110085',
    fatherMobile: '9876543210',
    motherMobile: '9876543211',
    bloodGroup: 'B+',
    academicSession: '2026-27',
    addressFull: 'Flat 101, Galaxy Apts, Sector 14, Rohini',
    photos: {
      student: 'data:image/png;base64,sample',
    },
    photoConfirmations: {
      student: true,
      father: true,
      mother: true,
      pickup3: true,
    },
    includeInPrint: true,
  };

  const nameResolved = resolveCardTemplateText('{studentName}', sampleStudent, 'upper');
  assert.equal(nameResolved.text, 'AARAV SHARMA');
  assert.equal(nameResolved.missingFields.length, 0);

  const fatherResolved = resolveCardTemplateText(': {fatherName}', sampleStudent, 'upper');
  assert.equal(fatherResolved.text, ': RAJESH SHARMA');

  const classResolved = resolveCardTemplateText(': {classSection}', sampleStudent, 'roman');
  assert.equal(classResolved.text, ': V-B');

  const dobResolved = resolveCardTemplateText(': {dateOfBirth}', sampleStudent, 'date');
  assert.equal(dobResolved.text, ': 05-07-2014');
});

test('calculateA4SheetLayout calculates exact margins and detects A4 fit', () => {
  const config = {
    rows: 5,
    rowGap: 1.0,
    colGap: 0.0,
    cardPdf: 'pair' as const,
    pattern: '{n}_{serialNumber}_{studentName}',
  };

  const layout = calculateA4SheetLayout(BAL_BHAVAN_DEFAULT_TEMPLATE, config);

  // Total block width: 90 * 2 + 0 = 180 mm
  assert.equal(layout.totalBlockWidth, 180);
  // Total block height: 5 * 58 + 4 * 1 = 294 mm
  assert.equal(layout.totalBlockHeight, 294);
  // Left/right margin: (210 - 180) / 2 = 15 mm
  assert.equal(layout.leftMargin, 15);
  // Top/bottom margin: (297 - 294) / 2 = 1.5 mm
  assert.equal(layout.topMargin, 1.5);
  // Fits on A4
  assert.equal(layout.fitsOnA4, true);
  assert.equal(layout.slots.length, 5);
});

test('analyzeCardIssues detects missing photos, unconfirmed roles, and invalid fields', () => {
  const incompleteStudent: StudentCardRecord = {
    uid: 'stu_inc',
    formId: 'form_inc',
    serialNumber: '7692',
    studentName: 'Aarav Sharma',
    fatherName: 'Rajesh Sharma',
    motherName: 'Priya Sharma',
    dateOfBirth: 'invalid-date',
    classSection: '5-B',
    addressLine1: 'Street 1',
    addressLine2: '',
    city: 'Delhi',
    pincode: '110', // Invalid: not 6 digits
    fatherMobile: '123', // Invalid: not 10 digits
    motherMobile: '',
    bloodGroup: 'B+',
    academicSession: '2026-27',
    addressFull: 'Street 1, Delhi',
    photos: {
      father: 'data:image/png;base64,father',
    },
    photoConfirmations: {
      student: false,
      father: false, // Unconfirmed adult photo
      mother: false,
      pickup3: false,
    },
    includeInPrint: true,
  };

  const issues = analyzeCardIssues(incompleteStudent, BAL_BHAVAN_DEFAULT_TEMPLATE, [incompleteStudent]);
  const messages = issues.map((i) => i.message);

  assert.ok(messages.some((m) => m.includes('Student photo is missing')));
  assert.ok(messages.some((m) => m.includes('Father photo requires manual confirmation')));
  assert.ok(messages.some((m) => m.includes('mobile must be 10 digits')));
  assert.ok(messages.some((m) => m.includes('Pincode must be 6 digits')));
  assert.ok(messages.some((m) => m.includes('Date of birth is invalid')));
});
