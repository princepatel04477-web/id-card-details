/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import ExcelJS from 'exceljs';
import saveAs from 'file-saver';
import { FormRecord } from '../types/icard';
import { isFieldFlagged } from './validation';

export interface CellImageBounds {
  tl: { col: number; row: number };
  ext: { width: number; height: number };
  editAs: string;
}

/**
 * Calculates centered aspect-ratio preserved bounds for an image inside an Excel cell
 * with a 4px inset on every side.
 * Column width 14 ≈ 105px, Row height 90pt ≈ 120px.
 */
export function calculateCellImageBounds(
  colIndex0: number, // 0-based col index (e.g. 2 for Col C)
  rowIndex0: number, // 0-based row index (e.g. 1 for Row 2)
  photoWidth: number,
  photoHeight: number,
  cellWidthPx = 105,
  cellHeightPx = 120,
  insetPx = 4
): CellImageBounds {
  const availW = Math.max(10, cellWidthPx - insetPx * 2);
  const availH = Math.max(10, cellHeightPx - insetPx * 2);

  const aspectRatio = photoWidth > 0 && photoHeight > 0 ? photoWidth / photoHeight : 35 / 45;
  const cellRatio = availW / availH;

  let targetW: number;
  let targetH: number;

  if (aspectRatio <= cellRatio) {
    // Height constrained
    targetH = availH;
    targetW = Math.round(targetH * aspectRatio);
  } else {
    // Width constrained
    targetW = availW;
    targetH = Math.round(targetW / aspectRatio);
  }

  const marginX = (cellWidthPx - targetW) / 2;
  const marginY = (cellHeightPx - targetH) / 2;

  const colFracStart = marginX / cellWidthPx;
  const rowFracStart = marginY / cellHeightPx;

  return {
    tl: {
      col: colIndex0 + colFracStart,
      row: rowIndex0 + rowFracStart,
    },
    ext: {
      width: targetW,
      height: targetH,
    },
    editAs: 'oneCell',
  };
}

/**
 * Extracts base64 payload from data URL.
 */
function cleanBase64(dataUrl: string): string {
  return dataUrl.replace(/^data:[^;]+;base64,/, '');
}

/**
 * Exports all approved students into an Excel workbook (.xlsx) with:
 * - "Students" sheet: one row per student, photos embedded with editAs: 'oneCell', text as TEXT,
 *   low-confidence highlights with notes, frozen headers/columns, and auto-filters.
 * - "Original Scans" sheet: one row per student with Serial No, Student Name, and full scan image.
 */
export async function exportApprovedStudentsToExcel(approvedRecords: FormRecord[]): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'I-Card Extractor';
  workbook.lastModifiedBy = 'I-Card Extractor';
  workbook.created = new Date();
  workbook.modified = new Date();

  // 1. Sheet "Students"
  const wsStudents = workbook.addWorksheet('Students', {
    views: [{ state: 'frozen', xSplit: 3, ySplit: 1 }],
  });

  // Columns definition in exact order
  wsStudents.columns = [
    { header: 'Sr No', key: 'srNo', width: 8 },
    { header: 'Serial No', key: 'serialNo', width: 14 },
    { header: 'Student Photo', key: 'studentPhoto', width: 14 },
    { header: 'Student Name', key: 'studentName', width: 26 },
    { header: "Father's Name", key: 'fatherName', width: 24 },
    { header: 'Father Photo', key: 'fatherPhoto', width: 14 },
    { header: "Mother's Name", key: 'motherName', width: 24 },
    { header: 'Mother Photo', key: 'motherPhoto', width: 14 },
    { header: 'Guardian Photo', key: 'guardianPhoto', width: 14 },
    { header: 'Date of Birth', key: 'dob', width: 16 },
    { header: 'Class & Section', key: 'classSection', width: 16 },
    { header: 'Address', key: 'address', width: 34 },
    { header: 'City', key: 'city', width: 18 },
    { header: 'Pincode', key: 'pincode', width: 14 },
    { header: 'Residence Phone', key: 'residencePhone', width: 18 },
    { header: "Father's Mobile", key: 'fatherMobile', width: 18 },
    { header: "Mother's Mobile", key: 'motherMobile', width: 18 },
    { header: 'Transport', key: 'transport', width: 16 },
    { header: 'Blood Group', key: 'bloodGroup', width: 14 },
    { header: 'Academic Session', key: 'academicSession', width: 18 },
  ];

  // Header row styling: Bold, dark background (#1E293B), white text
  const headerRow = wsStudents.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell((cell: ExcelJS.Cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FF0F172A' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    };
  });

  // Enable auto-filter across all 20 columns
  wsStudents.autoFilter = { from: 'A1', to: 'T1' };

  // Border style for all data cells
  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
    right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
  };

  const emptyPhotoFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF1F5F9' }, // Light grey fill when photo is missing
  };

  const lowConfidenceFill: ExcelJS.Fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFF9C4' }, // Light yellow fill for uncertain unedited fields
  };

  // Populate data rows
  for (let idx = 0; idx < approvedRecords.length; idx++) {
    const record = approvedRecords[idx];
    const rowNum = idx + 2; // Row 1 is header
    const rowIndex0 = rowNum - 1; // 0-based for image coordinate calculation
    const row = wsStudents.getRow(rowNum);
    row.height = 90; // Exactly 90pt height

    // Values extraction
    const sNo = record.fields.serialNumber.value || '';
    const studentName = record.fields.studentName.value || '';
    const fatherName = record.fields.fatherName.value || '';
    const motherName = record.fields.motherName.value || '';
    const dob = record.fields.dateOfBirth.value || '';
    const classSection = record.fields.classSection.value || '';
    const address = [record.fields.addressLine1.value, record.fields.addressLine2.value]
      .filter(Boolean)
      .join(', ');
    const city = record.fields.city.value || '';
    const pincode = record.fields.pincode.value || '';
    const resPhone = record.fields.residencePhone.value || '';
    const fatherMobile = record.fields.fatherMobile.value || '';
    const motherMobile = record.fields.motherMobile.value || '';
    const transport = record.fields.modeOfTransport.value || '';
    const bloodGroup = record.fields.bloodGroup.value || '';
    const session = record.fields.academicSession.value || '';

    // Set row values
    row.values = [
      idx + 1, // 1: Sr No
      sNo, // 2: Serial No
      '', // 3: Student Photo
      studentName, // 4: Student Name
      fatherName, // 5: Father's Name
      '', // 6: Father Photo
      motherName, // 7: Mother's Name
      '', // 8: Mother Photo
      '', // 9: Guardian Photo
      dob, // 10: Date of Birth
      classSection, // 11: Class & Section
      address, // 12: Address
      city, // 13: City
      pincode, // 14: Pincode
      resPhone, // 15: Residence Phone
      fatherMobile, // 16: Father's Mobile
      motherMobile, // 17: Mother's Mobile
      transport, // 18: Transport
      bloodGroup, // 19: Blood Group
      session, // 20: Academic Session
    ];

    // Format all cells
    row.eachCell({ includeEmpty: true }, (cell: ExcelJS.Cell, colNumber: number) => {
      cell.border = thinBorder;
      cell.font = { name: 'Calibri', size: 11 };
      cell.alignment = { vertical: 'middle', horizontal: 'left' };

      // Explicit TEXT formatting for phone numbers and pincode so Excel doesn't strip leading zeros
      if ([14, 15, 16, 17].includes(colNumber)) {
        cell.numFmt = '@';
        if (cell.value) {
          cell.value = String(cell.value);
        }
      }

      // Center alignment for specific columns
      if ([1, 2, 10, 11, 14, 18, 19, 20].includes(colNumber)) {
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      }

      // Wrap text on Address
      if (colNumber === 12) {
        cell.alignment = { vertical: 'middle', horizontal: 'left', wrapText: true };
      }
    });

    // Check for low confidence / unedited fields to apply light yellow fill + cell note
    const fieldMapping: Array<{ col: number; key: keyof FormRecord['fields'] }> = [
      { col: 2, key: 'serialNumber' },
      { col: 4, key: 'studentName' },
      { col: 5, key: 'fatherName' },
      { col: 7, key: 'motherName' },
      { col: 10, key: 'dateOfBirth' },
      { col: 11, key: 'classSection' },
      { col: 12, key: 'addressLine1' },
      { col: 13, key: 'city' },
      { col: 14, key: 'pincode' },
      { col: 15, key: 'residencePhone' },
      { col: 16, key: 'fatherMobile' },
      { col: 17, key: 'motherMobile' },
      { col: 18, key: 'modeOfTransport' },
      { col: 19, key: 'bloodGroup' },
      { col: 20, key: 'academicSession' },
    ];

    for (const item of fieldMapping) {
      const field = record.fields[item.key];
      const isEdited = record.userEditedFields[item.key] || false;
      const { flagged } = isFieldFlagged(item.key, field, isEdited);

      if (flagged && !isEdited) {
        const cell = row.getCell(item.col);
        cell.fill = lowConfidenceFill;
        cell.note = 'Low confidence — verify against scan';
      }
    }

    // Embed photos
    const studentPhoto = record.photos.find((p) => p.role === 'student' && p.confirmed);
    const fatherPhoto = record.photos.find((p) => p.role === 'father' && p.confirmed);
    const motherPhoto = record.photos.find((p) => p.role === 'mother' && p.confirmed);
    const guardianPhoto = record.photos.find((p) => p.role === 'guardian' && p.confirmed);

    // Helper to embed a photo in a cell or set empty grey fill
    const embedPhotoInCell = (
      photo: typeof studentPhoto,
      colNum1: number // 1-based column (e.g. 3 for Student, 6 for Father, 8 for Mother, 9 for Guardian)
    ) => {
      const cell = row.getCell(colNum1);
      const colIndex0 = colNum1 - 1;

      if (photo && photo.dataUrl) {
        try {
          const imgBase64 = cleanBase64(photo.dataUrl);
          const imageId = workbook.addImage({
            base64: imgBase64,
            extension: 'png',
          });

          // Standard passport photo aspect ratio 35:45
          const bounds = calculateCellImageBounds(colIndex0, rowIndex0, 35, 45, 105, 120, 4);

          wsStudents.addImage(imageId, bounds);
        } catch {
          cell.fill = emptyPhotoFill;
        }
      } else {
        cell.fill = emptyPhotoFill;
      }
    };

    embedPhotoInCell(studentPhoto, 3); // Col C: Student Photo
    embedPhotoInCell(fatherPhoto, 6); // Col F: Father Photo
    embedPhotoInCell(motherPhoto, 8); // Col H: Mother Photo
    embedPhotoInCell(guardianPhoto, 9); // Col I: Guardian Photo
  }

  // 2. Second Sheet: "Original Scans"
  const wsScans = workbook.addWorksheet('Original Scans');
  wsScans.columns = [
    { header: 'Serial No', key: 'serialNo', width: 16 },
    { header: 'Student Name', key: 'studentName', width: 28 },
    { header: 'Original Form Scan', key: 'scanImage', width: 55 }, // ~400px wide
  ];

  const scanHeaderRow = wsScans.getRow(1);
  scanHeaderRow.height = 28;
  scanHeaderRow.eachCell((cell: ExcelJS.Cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, name: 'Calibri', size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E293B' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
  });

  for (let sIdx = 0; sIdx < approvedRecords.length; sIdx++) {
    const record = approvedRecords[sIdx];
    const sRowNum = sIdx + 2;
    const sRowIndex0 = sRowNum - 1;
    const sRow = wsScans.getRow(sRowNum);
    sRow.height = 360; // 360pt height for large scan preview

    sRow.getCell(1).value = record.fields.serialNumber.value || 'N/A';
    sRow.getCell(2).value = record.fields.studentName.value || 'Student';

    sRow.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
    sRow.getCell(2).alignment = { vertical: 'middle', horizontal: 'left' };
    sRow.getCell(1).border = thinBorder;
    sRow.getCell(2).border = thinBorder;
    sRow.getCell(3).border = thinBorder;

    if (record.originalImageDataUrl) {
      try {
        const scanBase64 = cleanBase64(record.originalImageDataUrl);
        const scanImageId = workbook.addImage({
          base64: scanBase64,
          extension: 'png',
        });

        const aspect = record.imageHeight / (record.imageWidth || 1000);
        const scanH = Math.min(460, Math.round(400 * aspect));

        wsScans.addImage(scanImageId, {
          tl: { col: 2.05, row: sRowIndex0 + 0.05 },
          ext: { width: 400, height: scanH },
          editAs: 'oneCell',
        });
      } catch {
        sRow.getCell(3).value = '[Scan image unavailable]';
      }
    }
  }

  // Generate buffer and trigger file-saver download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const today = new Date().toISOString().split('T')[0];
  saveAs(blob, `ICards_${today}.xlsx`);
}
