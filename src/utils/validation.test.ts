/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidDateDDMMYYYY,
  isValid10DigitPhone,
  isValid6DigitPincode,
  validateField,
  canApproveForm,
} from './validation';
import { FieldExtraction, TextFieldKey } from '../types/icard';

test('Date validation works correctly for DD/MM/YYYY', () => {
  assert.equal(isValidDateDDMMYYYY('15/08/2012'), true);
  assert.equal(isValidDateDDMMYYYY('31/01/2015'), true);
  assert.equal(isValidDateDDMMYYYY('29/02/2024'), true); // 2024 is leap year
  assert.equal(isValidDateDDMMYYYY('29/02/2023'), false); // not leap year
  assert.equal(isValidDateDDMMYYYY('32/01/2015'), false);
  assert.equal(isValidDateDDMMYYYY('15/13/2015'), false);
  assert.equal(isValidDateDDMMYYYY('invalid'), false);
  assert.equal(isValidDateDDMMYYYY(''), false);
});

test('Phone validation checks 10 digits', () => {
  assert.equal(isValid10DigitPhone('9876543210'), true);
  assert.equal(isValid10DigitPhone('98765 43210'), true);
  assert.equal(isValid10DigitPhone('+91 9876543210'), false); // 12 digits with 91
  assert.equal(isValid10DigitPhone('98765'), false);
  assert.equal(isValid10DigitPhone(''), false);
});

test('Pincode validation checks 6 digits', () => {
  assert.equal(isValid6DigitPincode('110001'), true);
  assert.equal(isValid6DigitPincode('560034'), true);
  assert.equal(isValid6DigitPincode('12345'), false);
  assert.equal(isValid6DigitPincode('1234567'), false);
  assert.equal(isValid6DigitPincode('11000A'), false);
});

test('validateField detects empty required fields and low confidence', () => {
  const emptyStudent: FieldExtraction = { value: '', raw: '', confidence: 0 };
  const issueRequired = validateField('studentName', emptyStudent);
  assert.ok(issueRequired);
  assert.equal(issueRequired.severity, 'error');

  const lowConfidenceDob: FieldExtraction = { value: '15/08/2012', raw: '15/08/12', confidence: 0.72 };
  const issueLowConf = validateField('dateOfBirth', lowConfidenceDob);
  assert.ok(issueLowConf);
  assert.equal(issueLowConf.severity, 'warning');

  const highConfidenceDob: FieldExtraction = { value: '15/08/2012', raw: '15/08/2012', confidence: 0.95 };
  const issueOk = validateField('dateOfBirth', highConfidenceDob);
  assert.equal(issueOk, null);
});

test('canApproveForm enforces required fields and unconfirmed low-confidence photos', () => {
  const fields = {
    serialNumber: { value: '101', raw: '101', confidence: 0.9 },
    academicSession: { value: '2024-25', raw: '2024-25', confidence: 0.9 },
    formDate: { value: '01/04/2024', raw: '01/04/2024', confidence: 0.9 },
    studentName: { value: 'AARAV SHARMA', raw: 'AARAV SHARMA', confidence: 0.9 },
    fatherName: { value: 'RAJESH SHARMA', raw: 'RAJESH SHARMA', confidence: 0.9 },
    motherName: { value: 'PRIYA SHARMA', raw: 'PRIYA SHARMA', confidence: 0.9 },
    dateOfBirth: { value: '15/08/2012', raw: '15/08/2012', confidence: 0.9 },
    classSection: { value: '5-B', raw: 'Vth-B', confidence: 0.9 },
    addressLine1: { value: '123 Park Street', raw: '123 Park Street', confidence: 0.9 },
    addressLine2: { value: '', raw: '', confidence: 0 },
    city: { value: 'New Delhi', raw: 'New Delhi', confidence: 0.9 },
    pincode: { value: '110001', raw: '110001', confidence: 0.9 },
    residencePhone: { value: '', raw: '', confidence: 0 },
    fatherMobile: { value: '9876543210', raw: '9876543210', confidence: 0.9 },
    motherMobile: { value: '9876543211', raw: '9876543211', confidence: 0.9 },
    modeOfTransport: { value: 'Van', raw: 'Van', confidence: 0.9 },
    bloodGroup: { value: 'B+', raw: 'B POSITIVE', confidence: 0.9 },
  } as Record<TextFieldKey, FieldExtraction>;

  const photosWithUnconfirmed = [
    { confirmed: true, roleConfidence: 0.95, role: 'student' },
    { confirmed: false, roleConfidence: 0.65, role: 'father' },
  ];

  const check1 = canApproveForm(fields, photosWithUnconfirmed);
  assert.equal(check1.allowed, false);
  assert.ok(check1.blockingReasons[0].includes('adult pick-up photo') || check1.blockingReasons[0].includes('confirmed'));

  // Once confirmed:
  const photosConfirmed = [
    { confirmed: true, roleConfidence: 0.95, role: 'student' },
    { confirmed: true, roleConfidence: 0.65, role: 'father' },
  ];
  const check2 = canApproveForm(fields, photosConfirmed);
  assert.equal(check2.allowed, true);
});
