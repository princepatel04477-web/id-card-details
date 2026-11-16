/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  Document,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  ImageRun,
  WidthType,
  AlignmentType,
  BorderStyle,
  CommentRangeStart,
  CommentRangeEnd,
  CommentReference,
  Packer,
  TableLayoutType,
} from 'docx';
import saveAs from 'file-saver';
import { ExportDialogOptions, FormRecord, TextFieldKey } from '../types/icard';
import { isFieldFlagged } from './validation';
import { dataUrlToUint8Array } from './csvExport';

const CALIBRI_FONT = 'Calibri';
const FONT_SIZE_11 = 22; // half-points: 11pt = 22
const FONT_SIZE_14_BOLD = 28;
const FONT_SIZE_10 = 20;

// Column widths: label 5cm (2835 dxa), value 11cm (6237 dxa) -> total 16cm (9072 dxa)
const LABEL_COL_WIDTH = 2835;
const VALUE_COL_WIDTH = 6237;

interface FieldDisplayConfig {
  key: TextFieldKey;
  label: string;
}

const ORDERED_FIELDS: FieldDisplayConfig[] = [
  { key: 'studentName', label: 'Student Name' },
  { key: 'fatherName', label: "Father's Name" },
  { key: 'motherName', label: "Mother's Name" },
  { key: 'dateOfBirth', label: 'Date of Birth' },
  { key: 'classSection', label: 'Class & Section' },
  { key: 'addressLine1', label: 'Address Line 1' },
  { key: 'addressLine2', label: 'Address Line 2' },
  { key: 'city', label: 'City' },
  { key: 'pincode', label: 'Pincode' },
  { key: 'residencePhone', label: 'Residence Phone' },
  { key: 'fatherMobile', label: "Father's Mobile" },
  { key: 'motherMobile', label: "Mother's Mobile" },
  { key: 'modeOfTransport', label: 'Mode of Transport' },
  { key: 'bloodGroup', label: 'Blood Group' },
];

/**
 * Creates a clean table cell with standard borders and padding.
 */
function createStyledTableCell(
  content: Paragraph[],
  widthDxa: number,
  isHeader = false
): TableCell {
  return new TableCell({
    width: { size: widthDxa, type: WidthType.DXA },
    shading: isHeader ? { fill: 'F1F5F9' } : undefined,
    margins: {
      top: 100,
      bottom: 100,
      left: 150,
      right: 150,
    },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      left: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
      right: { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' },
    },
    children: content,
  });
}

/**
 * Generates an editable DOCX Document for a single student or multiple students.
 */
export async function generateDocxBlob(
  records: FormRecord[],
  options: ExportDialogOptions
): Promise<Blob> {
  let commentCounter = 1;
  const docxComments: Array<{
    id: number;
    author: string;
    date: Date;
    children: Paragraph[];
  }> = [];

  const documentChildren: Array<Paragraph | Table> = [];

  records.forEach((record, studentIdx) => {
    const sNo = record.fields.serialNumber.value || 'N/A';
    const session = record.fields.academicSession.value || '2024-2025';
    const studentName = record.fields.studentName.value || 'Student';

    // 1. Header: "Student I-Card Details", academic session, serial number
    documentChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 200, after: 100 },
        children: [
          new TextRun({
            text: 'Student I-Card Details',
            font: CALIBRI_FONT,
            size: FONT_SIZE_14_BOLD,
            bold: true,
            color: '1E293B',
          }),
        ],
      })
    );

    documentChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 0, after: 250 },
        children: [
          new TextRun({
            text: `Academic Session: ${session}   |   Serial No: ${sNo}`,
            font: CALIBRI_FONT,
            size: FONT_SIZE_11,
            bold: true,
            color: '475569',
          }),
        ],
      })
    );

    // 2. Top Table: Quick summary + Student Photo (35mm x 45mm inline in its own cell)
    const studentPhoto = record.photos.find((p) => p.role === 'student');
    const photoChildren: Paragraph[] = [];

    if (studentPhoto && studentPhoto.dataUrl) {
      try {
        const photoBytes = dataUrlToUint8Array(studentPhoto.dataUrl);
        // 35mm x 45mm = ~132px x 170px at 96 DPI
        photoChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: photoBytes,
                transformation: { width: 132, height: 170 },
                type: 'png',
              }),
            ],
          })
        );
      } catch {
        photoChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({
                text: '[Student Photo]',
                font: CALIBRI_FONT,
                size: FONT_SIZE_10,
                color: '94A3B8',
              }),
            ],
          })
        );
      }
    } else {
      photoChildren.push(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({
              text: '[Photo Not Found]',
              font: CALIBRI_FONT,
              size: FONT_SIZE_10,
              color: '94A3B8',
            }),
          ],
        })
      );
    }

    photoChildren.push(
      new Paragraph({
        alignment: AlignmentType.CENTER,
        spacing: { before: 60 },
        children: [
          new TextRun({
            text: 'Student Photo (35mm x 45mm)',
            font: CALIBRI_FONT,
            size: FONT_SIZE_10,
            italics: true,
            color: '64748B',
          }),
        ],
      })
    );

    // Left summary in top table
    const topSummaryCell = createStyledTableCell(
      [
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Student Name: ',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
              bold: true,
            }),
            new TextRun({
              text: studentName,
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Class & Section: ',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
              bold: true,
            }),
            new TextRun({
              text: record.fields.classSection.value || 'N/A',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: 'Date of Birth: ',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
              bold: true,
            }),
            new TextRun({
              text: record.fields.dateOfBirth.value || 'N/A',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
            }),
          ],
        }),
        new Paragraph({
          spacing: { after: 80 },
          children: [
            new TextRun({
              text: "Father's Name: ",
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
              bold: true,
            }),
            new TextRun({
              text: record.fields.fatherName.value || 'N/A',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
            }),
          ],
        }),
        new Paragraph({
          children: [
            new TextRun({
              text: 'Contact Mobile: ',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
              bold: true,
            }),
            new TextRun({
              text: record.fields.fatherMobile.value || record.fields.motherMobile.value || 'N/A',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
            }),
          ],
        }),
      ],
      LABEL_COL_WIDTH + VALUE_COL_WIDTH - 2400
    );

    const topPhotoCell = createStyledTableCell(photoChildren, 2400);

    const topTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: LABEL_COL_WIDTH + VALUE_COL_WIDTH, type: WidthType.DXA },
      rows: [
        new TableRow({
          children: [topSummaryCell, topPhotoCell],
        }),
      ],
    });

    documentChildren.push(topTable);

    // Section title: Complete Record
    documentChildren.push(
      new Paragraph({
        spacing: { before: 240, after: 100 },
        children: [
          new TextRun({
            text: 'I-Card Particulars',
            font: CALIBRI_FONT,
            size: FONT_SIZE_11,
            bold: true,
            color: '0F172A',
          }),
        ],
      })
    );

    // 3. 2-column bordered Label | Value table for all fields
    const tableRows: TableRow[] = [];

    // Header row
    tableRows.push(
      new TableRow({
        children: [
          createStyledTableCell(
            [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Field Label',
                    font: CALIBRI_FONT,
                    size: FONT_SIZE_11,
                    bold: true,
                  }),
                ],
              }),
            ],
            LABEL_COL_WIDTH,
            true
          ),
          createStyledTableCell(
            [
              new Paragraph({
                children: [
                  new TextRun({
                    text: 'Value',
                    font: CALIBRI_FONT,
                    size: FONT_SIZE_11,
                    bold: true,
                  }),
                ],
              }),
            ],
            VALUE_COL_WIDTH,
            true
          ),
        ],
      })
    );

    for (const item of ORDERED_FIELDS) {
      const field = record.fields[item.key];
      const val = field ? field.value : '';
      const isEdited = record.userEditedFields[item.key] || false;
      const { flagged, reason } = isFieldFlagged(item.key, field, isEdited);

      const valueRuns: Array<TextRun | CommentRangeStart | CommentRangeEnd | CommentReference> = [];

      // Highlight uncertain and failed fields if option enabled and not user-edited
      const shouldHighlight = options.highlightUncertainFields && flagged && !isEdited;

      if (shouldHighlight && reason) {
        const commentId = commentCounter++;
        docxComments.push({
          id: commentId,
          author: 'AI Reviewer',
          date: new Date(),
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: reason,
                  font: CALIBRI_FONT,
                  size: FONT_SIZE_10,
                }),
              ],
            }),
          ],
        });

        valueRuns.push(new CommentRangeStart(commentId));
        valueRuns.push(
          new TextRun({
            text: val || '[Empty / Illegible]',
            font: CALIBRI_FONT,
            size: FONT_SIZE_11,
            highlight: 'yellow',
          })
        );
        valueRuns.push(new CommentRangeEnd(commentId));
        valueRuns.push(new CommentReference(commentId));
      } else {
        valueRuns.push(
          new TextRun({
            text: val || '',
            font: CALIBRI_FONT,
            size: FONT_SIZE_11,
          })
        );
      }

      tableRows.push(
        new TableRow({
          children: [
            createStyledTableCell(
              [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: item.label,
                      font: CALIBRI_FONT,
                      size: FONT_SIZE_11,
                      bold: true,
                      color: '334155',
                    }),
                  ],
                }),
              ],
              LABEL_COL_WIDTH
            ),
            createStyledTableCell(
              [
                new Paragraph({
                  children: valueRuns,
                }),
              ],
              VALUE_COL_WIDTH
            ),
          ],
        })
      );
    }

    const fieldTable = new Table({
      layout: TableLayoutType.FIXED,
      width: { size: LABEL_COL_WIDTH + VALUE_COL_WIDTH, type: WidthType.DXA },
      rows: tableRows,
    });

    documentChildren.push(fieldTable);

    // 4. Parents / Guardians Table (one cell per confirmed adult photo, 30mm x 38mm inline)
    const adultPhotos = record.photos.filter((p) =>
      ['father', 'mother', 'guardian', 'other'].includes(p.role)
    );

    if (adultPhotos.length > 0) {
      documentChildren.push(
        new Paragraph({
          spacing: { before: 240, after: 100 },
          children: [
            new TextRun({
              text: 'Parents / Guardians Photos',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
              bold: true,
              color: '0F172A',
            }),
          ],
        })
      );

      const adultCells: TableCell[] = [];
      const cellWidth = Math.floor((LABEL_COL_WIDTH + VALUE_COL_WIDTH) / Math.max(1, adultPhotos.length));

      for (const adult of adultPhotos) {
        const cellChildren: Paragraph[] = [];
        if (adult.dataUrl) {
          try {
            const photoBytes = dataUrlToUint8Array(adult.dataUrl);
            // 30mm x 38mm = ~113px x 143px
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new ImageRun({
                    data: photoBytes,
                    transformation: { width: 113, height: 143 },
                    type: 'png',
                  }),
                ],
              })
            );
          } catch {
            cellChildren.push(
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text: '[Photo Error]', font: CALIBRI_FONT, size: FONT_SIZE_10 })],
              })
            );
          }
        }

        const roleCap = adult.role.charAt(0).toUpperCase() + adult.role.slice(1);
        cellChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 50 },
            children: [
              new TextRun({
                text: `${roleCap} (30mm x 38mm)`,
                font: CALIBRI_FONT,
                size: FONT_SIZE_10,
                bold: true,
                color: '475569',
              }),
            ],
          })
        );

        adultCells.push(createStyledTableCell(cellChildren, cellWidth));
      }

      const adultTable = new Table({
        layout: TableLayoutType.FIXED,
        width: { size: LABEL_COL_WIDTH + VALUE_COL_WIDTH, type: WidthType.DXA },
        rows: [new TableRow({ children: adultCells })],
      });

      documentChildren.push(adultTable);
    }

    // 5. Original Scan Section (16cm width inline image)
    if (options.includeOriginalScan && record.originalImageDataUrl) {
      documentChildren.push(
        new Paragraph({
          spacing: { before: 240, after: 100 },
          children: [
            new TextRun({
              text: 'Original Scanned Form (Reference)',
              font: CALIBRI_FONT,
              size: FONT_SIZE_11,
              bold: true,
              color: '0F172A',
            }),
          ],
        })
      );

      try {
        const scanBytes = dataUrlToUint8Array(record.originalImageDataUrl);
        // 16cm width = ~604px width. Maintain aspect ratio:
        const scanWidth = 604;
        const aspectRatio = (record.imageHeight || 1000) / (record.imageWidth || 800);
        const scanHeight = Math.round(scanWidth * aspectRatio);

        documentChildren.push(
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new ImageRun({
                data: scanBytes,
                transformation: { width: scanWidth, height: Math.min(800, scanHeight) },
                type: 'png',
              }),
            ],
          })
        );
      } catch {
        documentChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: '[Unable to embed scan image]',
                font: CALIBRI_FONT,
                size: FONT_SIZE_10,
                color: 'EF4444',
              }),
            ],
          })
        );
      }
    }

    // Page break between students in batch export
    if (studentIdx < records.length - 1) {
      documentChildren.push(
        new Paragraph({
          pageBreakBefore: true,
          children: [],
        })
      );
    }
  });

  const doc = new Document({
    comments: docxComments.length > 0 ? { children: docxComments } : undefined,
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 720, // 0.5 in
              bottom: 720,
              left: 720,
              right: 720,
            },
          },
        },
        children: documentChildren,
      },
    ],
  });

  return await Packer.toBlob(doc);
}

/**
 * Downloads a single student's DOCX
 */
export async function exportSingleStudentDocx(
  record: FormRecord,
  options: ExportDialogOptions
): Promise<void> {
  const blob = await generateDocxBlob([record], options);
  const sNo = (record.fields.serialNumber.value || record.id.slice(0, 6)).replace(/[/\\?%*:|"<>]/g, '_');
  const studentName = (record.fields.studentName.value || 'STUDENT')
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '_');
  const filename = `${sNo}_${studentName}.docx`;
  saveAs(blob, filename);
}

/**
 * Downloads all approved students in one combined DOCX
 */
export async function exportAllApprovedDocx(
  records: FormRecord[],
  options: ExportDialogOptions
): Promise<void> {
  const blob = await generateDocxBlob(records, options);
  const today = new Date().toISOString().split('T')[0];
  saveAs(blob, `ICards_${today}.docx`);
}
