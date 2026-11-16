/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import saveAs from 'file-saver';
import { FormRecord } from '../types/icard';

export const CSV_HEADERS = [
  'Sr No',
  'Serial No',
  'Student Photo',
  'Student Name',
  "Father's Name",
  'Father Photo',
  "Mother's Name",
  'Mother Photo',
  'Guardian Photo',
  'Date of Birth',
  'Class & Section',
  'Address',
  'City',
  'Pincode',
  'Residence Phone',
  "Father's Mobile",
  "Mother's Mobile",
  'Transport',
  'Blood Group',
  'Academic Session',
];

/**
 * Escapes a cell value for CSV (RFC 4180).
 */
export function escapeCsvCell(val: string | number | undefined | null): string {
  if (val === undefined || val === null) return '""';
  const str = String(val);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Generates CSV string with UTF-8 BOM adhering to the exact required column sequence.
 */
export function generateCsvContent(records: FormRecord[]): string {
  const rows: string[] = [CSV_HEADERS.map(escapeCsvCell).join(',')];

  for (let idx = 0; idx < records.length; idx++) {
    const record = records[idx];
    const sNo = (record.fields.serialNumber.value || record.id.slice(0, 6)).replace(/[/\\?%*:|"<>]/g, '_');

    const studentPhoto = record.photos.find((p) => p.role === 'student' && p.confirmed);
    const fatherPhoto = record.photos.find((p) => p.role === 'father' && p.confirmed);
    const motherPhoto = record.photos.find((p) => p.role === 'mother' && p.confirmed);
    const guardianPhoto = record.photos.find((p) => p.role === 'guardian' && p.confirmed);

    const address = [record.fields.addressLine1.value, record.fields.addressLine2.value]
      .filter(Boolean)
      .join(', ');

    const rowValues: string[] = [
      escapeCsvCell(idx + 1), // Sr No
      escapeCsvCell(record.fields.serialNumber.value), // Serial No
      escapeCsvCell(studentPhoto ? `${sNo}_student.png` : ''), // Student Photo
      escapeCsvCell(record.fields.studentName.value), // Student Name
      escapeCsvCell(record.fields.fatherName.value), // Father's Name
      escapeCsvCell(fatherPhoto ? `${sNo}_father.png` : ''), // Father Photo
      escapeCsvCell(record.fields.motherName.value), // Mother's Name
      escapeCsvCell(motherPhoto ? `${sNo}_mother.png` : ''), // Mother Photo
      escapeCsvCell(guardianPhoto ? `${sNo}_guardian.png` : ''), // Guardian Photo
      escapeCsvCell(record.fields.dateOfBirth.value), // Date of Birth
      escapeCsvCell(record.fields.classSection.value), // Class & Section
      escapeCsvCell(address), // Address
      escapeCsvCell(record.fields.city.value), // City
      escapeCsvCell(record.fields.pincode.value), // Pincode
      escapeCsvCell(record.fields.residencePhone.value), // Residence Phone
      escapeCsvCell(record.fields.fatherMobile.value), // Father's Mobile
      escapeCsvCell(record.fields.motherMobile.value), // Mother's Mobile
      escapeCsvCell(record.fields.modeOfTransport.value), // Transport
      escapeCsvCell(record.fields.bloodGroup.value), // Blood Group
      escapeCsvCell(record.fields.academicSession.value), // Academic Session
    ];

    rows.push(rowValues.join(','));
  }

  // Prepend UTF-8 BOM (\uFEFF)
  return '\uFEFF' + rows.join('\r\n');
}

/**
 * Helper to convert data URL to binary Uint8Array
 */
export function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const base64 = parts[1] || '';
  const binaryStr = atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

/**
 * Packages all approved forms into a single ZIP file containing:
 * - students.csv
 * - photos/{serialNumber}_student.png, father, mother, guardian
 */
export async function exportCsvAndPhotosZip(records: FormRecord[]): Promise<void> {
  const zip = new JSZip();

  const csvContent = generateCsvContent(records);
  zip.file('students.csv', csvContent);

  const photosFolder = zip.folder('photos');

  for (const record of records) {
    const sNo = (record.fields.serialNumber.value || record.id.slice(0, 6)).replace(/[/\\?%*:|"<>]/g, '_');

    for (const photo of record.photos) {
      if (photo.role === 'exclude' || !photo.confirmed) continue;

      const filename = `${sNo}_${photo.role}.png`;

      if (photosFolder && photo.dataUrl) {
        const photoBytes = dataUrlToUint8Array(photo.dataUrl);
        photosFolder.file(filename, photoBytes);
      }
    }
  }

  const today = new Date().toISOString().split('T')[0];
  const zipBlob = await zip.generateAsync({ type: 'blob' });
  saveAs(zipBlob, `ICards_${today}_Bundle.zip`);
}
