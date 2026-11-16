/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JSZip from 'jszip';
import ExcelJS from 'exceljs';
import { FormRecord, TextFieldKey, ProcessedPhoto } from '../types/icard';

interface ExtractedCellImage {
  row: number; // 0-indexed row
  col: number; // 0-indexed column
  dataUrl: string;
}

const MIME_MAP: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  bmp: 'image/bmp',
};

function resolveRelativeZipPath(baseDir: string, relativePath: string): string {
  if (relativePath.startsWith('/')) {
    return relativePath.slice(1);
  }
  const parts = `${baseDir}/${relativePath}`.split('/');
  const normalized: string[] = [];
  for (const part of parts) {
    if (part === '..') {
      normalized.pop();
    } else if (part && part !== '.') {
      normalized.push(part);
    }
  }
  return normalized.join('/');
}

function parseRelationshipsXml(xmlString: string): Record<string, string> {
  const map: Record<string, string> = {};
  if (!xmlString) return map;
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const rels = doc.getElementsByTagNameNS('*', 'Relationship');
  for (let i = 0; i < rels.length; i++) {
    const rel = rels[i];
    const id = rel.getAttribute('Id');
    const target = rel.getAttribute('Target');
    if (id && target) {
      map[id] = target;
    }
  }
  return map;
}

/**
 * Extract images anchored in Excel cells using JSZip
 */
async function extractImagesFromDrawings(zip: JSZip): Promise<ExtractedCellImage[]> {
  const cellImages: ExtractedCellImage[] = [];

  // Find all drawing XML files in the zip
  const drawingPaths: string[] = [];
  zip.forEach((relativePath) => {
    if (/^xl\/drawings\/drawing\d+\.xml$/i.test(relativePath)) {
      drawingPaths.push(relativePath);
    }
  });

  for (const dPath of drawingPaths) {
    const dFile = zip.file(dPath);
    if (!dFile) continue;
    const dXml = await dFile.async('string');

    // Drawing rels path: xl/drawings/_rels/drawing1.xml.rels
    const dDir = dPath.substring(0, dPath.lastIndexOf('/'));
    const dBase = dPath.substring(dPath.lastIndexOf('/') + 1);
    const dRelsPath = `${dDir}/_rels/${dBase}.rels`;
    const dRelsFile = zip.file(dRelsPath);
    const dRelsMap = dRelsFile ? parseRelationshipsXml(await dRelsFile.async('string')) : {};

    const parser = new DOMParser();
    const doc = parser.parseFromString(dXml, 'application/xml');
    const anchors = [...doc.documentElement.children].filter((node) =>
      /Anchor$/i.test(node.localName)
    );

    for (const anchor of anchors) {
      const fromNode = anchor.getElementsByTagNameNS('*', 'from')[0];
      if (!fromNode) continue;
      const colNode = fromNode.getElementsByTagNameNS('*', 'col')[0];
      const rowNode = fromNode.getElementsByTagNameNS('*', 'row')[0];
      if (!colNode || !rowNode) continue;

      const col = parseInt(colNode.textContent || '0', 10);
      const row = parseInt(rowNode.textContent || '0', 10);

      // Find blip r:embed id
      const blipNode = anchor.getElementsByTagNameNS('*', 'blip')[0];
      if (!blipNode) continue;

      let embedId = '';
      for (let a = 0; a < blipNode.attributes.length; a++) {
        const attr = blipNode.attributes[a];
        if (attr.localName === 'embed') {
          embedId = attr.value;
          break;
        }
      }
      if (!embedId || !dRelsMap[embedId]) continue;

      const mediaPath = resolveRelativeZipPath(dDir, dRelsMap[embedId]);
      const imageFile = zip.file(mediaPath);
      if (!imageFile) continue;

      const ext = mediaPath.split('.').pop()?.toLowerCase() || 'png';
      const mime = MIME_MAP[ext] || 'image/png';
      const base64Data = await imageFile.async('base64');
      const dataUrl = `data:${mime};base64,${base64Data}`;

      cellImages.push({ row, col, dataUrl });
    }
  }

  return cellImages;
}

/**
 * Import students and anchored cell photos from an .xlsx workbook
 */
export async function importStudentsFromExcel(
  fileBuffer: ArrayBuffer,
  fileName: string
): Promise<FormRecord[]> {
  const zip = await JSZip.loadAsync(fileBuffer);
  const cellImages = await extractImagesFromDrawings(zip);

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(fileBuffer);

  const worksheet = workbook.getWorksheet('Students') || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheets found in the Excel workbook');
  }

  // Read header row (row 1)
  const headerMap: Record<number, string> = {};
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headerMap[colNumber - 1] = String(cell.value || '').trim();
  });

  const importedRecords: FormRecord[] = [];
  const totalRows = worksheet.rowCount;

  for (let r = 2; r <= totalRows; r++) {
    const row = worksheet.getRow(r);
    // Check if row has any values or photos
    let hasData = false;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value !== null && cell.value !== undefined && String(cell.value).trim() !== '') {
        hasData = true;
      }
    });

    const zeroRowIndex = r - 1; // 0-indexed row for drawing coordinates
    const rowImages = cellImages.filter((im) => im.row === zeroRowIndex);
    if (!hasData && rowImages.length === 0) {
      continue;
    }

    const rowValues: Record<string, string> = {};
    for (const [colIndexStr, colName] of Object.entries(headerMap)) {
      const colIndex = parseInt(colIndexStr, 10);
      const cell = row.getCell(colIndex + 1);
      const val = cell.value !== null && cell.value !== undefined ? String(cell.value).trim() : '';
      rowValues[colName.toLowerCase()] = val;
    }

    // Helper to get value matching key variants
    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        const clean = k.toLowerCase().trim();
        if (rowValues[clean] !== undefined && rowValues[clean] !== '') {
          return rowValues[clean];
        }
      }
      return '';
    };

    const serialNumber = getVal('serial no', 'serial number', 'adm no', 'admission no', 'sr no');
    const studentName = getVal('student name', 'student', 'name');
    const fatherName = getVal("father's name", 'father name', 'father');
    const motherName = getVal("mother's name", 'mother name', 'mother');
    const dateOfBirth = getVal('date of birth', 'dob', 'birth date');
    const classSection = getVal('class & section', 'class and section', 'class', 'class/sec');
    const address = getVal('address', 'residence address');
    const city = getVal('city');
    const pincode = getVal('pincode', 'pin code', 'pin');
    const fatherMobile = getVal("father's mobile", 'father mobile', 'contact1', 'mobile');
    const motherMobile = getVal("mother's mobile", 'mother mobile', 'contact2');
    const bloodGroup = getVal('blood group', 'bloodgroup', 'bg');
    const academicSession = getVal('academic session', 'session', 'year') || '2026-27';

    // Map photos by column header name
    const photos: ProcessedPhoto[] = [];

    // Helper to add photo
    const findPhotoByColName = (subStr: string): string | undefined => {
      for (const img of rowImages) {
        const colHeader = (headerMap[img.col] || '').toLowerCase();
        if (colHeader.includes(subStr.toLowerCase())) {
          return img.dataUrl;
        }
      }
      return undefined;
    };

    const studentPhotoUrl = findPhotoByColName('student photo') || rowImages[0]?.dataUrl;
    const fatherPhotoUrl = findPhotoByColName('father photo');
    const motherPhotoUrl = findPhotoByColName('mother photo');
    const guardianPhotoUrl = findPhotoByColName('guardian photo') || findPhotoByColName('pickup');

    const formId = `form_imported_${Date.now()}_${r}`;

    if (studentPhotoUrl) {
      photos.push({
        id: `photo_${formId}_student`,
        originalBox2d: [165, 667, 400, 846],
        currentBox2d: [165, 667, 400, 846],
        role: 'student',
        roleGuess: 'student',
        roleConfidence: 0.95,
        confirmed: true,
        reason: 'Imported from Excel student photo cell',
        dataUrl: studentPhotoUrl,
        rotation: 0,
      });
    }

    if (motherPhotoUrl) {
      photos.push({
        id: `photo_${formId}_mother`,
        originalBox2d: [500, 100, 800, 300],
        currentBox2d: [500, 100, 800, 300],
        role: 'mother',
        roleGuess: 'mother',
        roleConfidence: 0.95,
        confirmed: true,
        reason: 'Imported from Excel mother photo cell',
        dataUrl: motherPhotoUrl,
        rotation: 0,
      });
    }

    if (fatherPhotoUrl) {
      photos.push({
        id: `photo_${formId}_father`,
        originalBox2d: [500, 350, 800, 550],
        currentBox2d: [500, 350, 800, 550],
        role: 'father',
        roleGuess: 'father',
        roleConfidence: 0.95,
        confirmed: true,
        reason: 'Imported from Excel father photo cell',
        dataUrl: fatherPhotoUrl,
        rotation: 0,
      });
    }

    if (guardianPhotoUrl) {
      photos.push({
        id: `photo_${formId}_guardian`,
        originalBox2d: [500, 600, 800, 800],
        currentBox2d: [500, 600, 800, 800],
        role: 'guardian',
        roleGuess: 'guardian',
        roleConfidence: 0.95,
        confirmed: true,
        reason: 'Imported from Excel guardian photo cell',
        dataUrl: guardianPhotoUrl,
        rotation: 0,
      });
    }

    const fieldMaker = (val: string) => ({
      value: val,
      raw: val,
      confidence: val ? 0.95 : 0,
    });

    const userEditedFields: Record<TextFieldKey, boolean> = {
      serialNumber: true,
      academicSession: true,
      formDate: true,
      studentName: true,
      fatherName: true,
      motherName: true,
      dateOfBirth: true,
      classSection: true,
      addressLine1: true,
      addressLine2: true,
      city: true,
      pincode: true,
      residencePhone: true,
      fatherMobile: true,
      motherMobile: true,
      modeOfTransport: true,
      bloodGroup: true,
    };

    importedRecords.push({
      id: formId,
      fileName: `${fileName} (Row ${r})`,
      fileSize: fileBuffer.byteLength,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      status: 'Approved',
      originalImageDataUrl: studentPhotoUrl || '',
      imageWidth: 1063,
      imageHeight: 685,
      fields: {
        serialNumber: fieldMaker(serialNumber),
        academicSession: fieldMaker(academicSession),
        formDate: fieldMaker(''),
        studentName: fieldMaker(studentName),
        fatherName: fieldMaker(fatherName),
        motherName: fieldMaker(motherName),
        dateOfBirth: fieldMaker(dateOfBirth),
        classSection: fieldMaker(classSection),
        addressLine1: fieldMaker(address),
        addressLine2: fieldMaker(''),
        city: fieldMaker(city),
        pincode: fieldMaker(pincode),
        residencePhone: fieldMaker(''),
        fatherMobile: fieldMaker(fatherMobile),
        motherMobile: fieldMaker(motherMobile),
        modeOfTransport: fieldMaker('Walker'),
        bloodGroup: fieldMaker(bloodGroup),
      },
      userEditedFields,
      photos,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }

  return importedRecords;
}
