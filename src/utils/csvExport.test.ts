/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeCsvCell, generateCsvContent, CSV_HEADERS } from './csvExport';
import { FormRecord } from '../types/icard';

test('escapeCsvCell escapes quotes and handles commas', () => {
  assert.equal(escapeCsvCell('Hello'), '"Hello"');
  assert.equal(escapeCsvCell('Hello, World'), '"Hello, World"');
  assert.equal(escapeCsvCell('He said "Hello"'), '"He said ""Hello"""');
  assert.equal(escapeCsvCell(undefined), '""');
});

test('generateCsvContent matches exact 20 columns and prepends UTF-8 BOM', () => {
  assert.equal(CSV_HEADERS.length, 20);
  assert.equal(CSV_HEADERS[0], 'Sr No');
  assert.equal(CSV_HEADERS[1], 'Serial No');
  assert.equal(CSV_HEADERS[2], 'Student Photo');
  assert.equal(CSV_HEADERS[3], 'Student Name');
  assert.equal(CSV_HEADERS[19], 'Academic Session');

  const dummyRecord: FormRecord = {
    id: 'test-12345',
    fileName: 'form1.jpg',
    fileSize: 1000,
    mimeType: 'image/jpeg',
    status: 'Approved',
    originalImageDataUrl: 'data:image/png;base64,AAA',
    imageWidth: 800,
    imageHeight: 1000,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    userEditedFields: {
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
    },
    fields: {
      serialNumber: { value: '7692', raw: '7692', confidence: 0.98 },
      academicSession: { value: '2024-2025', raw: '2024-2025', confidence: 0.95 },
      formDate: { value: '10/05/2024', raw: '10/05/2024', confidence: 0.9 },
      studentName: { value: 'RAHUL SHARMA', raw: 'RAHUL SHARMA', confidence: 0.99 },
      fatherName: { value: 'VIKAS SHARMA', raw: 'VIKAS SHARMA', confidence: 0.95 },
      motherName: { value: 'ANITA SHARMA', raw: 'ANITA SHARMA', confidence: 0.95 },
      dateOfBirth: { value: '12/04/2014', raw: '12/04/2014', confidence: 0.95 },
      classSection: { value: '5-A', raw: 'V-A', confidence: 0.95 },
      addressLine1: { value: 'Flat 101, Green Apts', raw: 'Flat 101', confidence: 0.95 },
      addressLine2: { value: '', raw: '', confidence: 0 },
      city: { value: 'Delhi', raw: 'Delhi', confidence: 0.95 },
      pincode: { value: '110001', raw: '110001', confidence: 0.95 },
      residencePhone: { value: '', raw: '', confidence: 0 },
      fatherMobile: { value: '9876543210', raw: '9876543210', confidence: 0.95 },
      motherMobile: { value: '9876543211', raw: '9876543211', confidence: 0.95 },
      modeOfTransport: { value: 'Van', raw: 'Van', confidence: 0.95 },
      bloodGroup: { value: 'O+', raw: 'O+', confidence: 0.95 },
    },
    photos: [
      {
        id: 'p1',
        originalBox2d: [100, 100, 300, 300],
        currentBox2d: [100, 100, 300, 300],
        role: 'student',
        roleGuess: 'student',
        roleConfidence: 0.95,
        confirmed: true,
        reason: 'inside student photo box',
        dataUrl: 'data:image/png;base64,AAA',
        rotation: 0,
      },
    ],
  };

  const csv = generateCsvContent([dummyRecord]);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.ok(csv.includes('"RAHUL SHARMA"'));
  assert.ok(csv.includes('"7692_student.png"'));
});
