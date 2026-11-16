/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CardElement,
  CardTemplate,
  TextEl,
  PhotoEl,
  PhotoRowEl,
  StudentCardRecord,
  CardIssue,
} from '../types/idcard';
import {
  CARD_WIDTH_MM,
  CARD_HEIGHT_MM,
  CARD_PX_WIDTH,
  CARD_PX_HEIGHT,
  MM_TO_PX,
} from './cardTemplates';

export {
  CARD_WIDTH_MM,
  CARD_HEIGHT_MM,
  CARD_PX_WIDTH,
  CARD_PX_HEIGHT,
  MM_TO_PX,
};

const ROMAN_NUMERALS: Record<number, string> = {
  1: 'I',
  2: 'II',
  3: 'III',
  4: 'IV',
  5: 'V',
  6: 'VI',
  7: 'VII',
  8: 'VIII',
  9: 'IX',
  10: 'X',
  11: 'XI',
  12: 'XII',
};

/**
 * Format string according to formatter rules
 */
export function formatCardText(text: string, fmt: 'upper' | 'date' | 'roman' | 'none'): string {
  if (!text) return '';
  switch (fmt) {
    case 'upper':
      return text.toUpperCase();
    case 'date':
      // "d/m/yyyy" or "d-m-yyyy" or "d.m.yyyy" -> "DD-MM-YYYY" (zero-padded)
      return text.replace(/(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{2,4})/, (_m, d, mo, y) => {
        return `${String(d).padStart(2, '0')}-${String(mo).padStart(2, '0')}-${y}`;
      });
    case 'roman': {
      // uppercase, then leading 1–2 digit class number -> Roman numeral (1–12 -> I–XII), e.g. "5-B" -> "V-B"
      const upper = text.toUpperCase();
      return upper.replace(/(^|[\s:])(\d{1,2})(?=$|[\s\-\/])/g, (_match, prefix, numStr) => {
        const num = parseInt(numStr, 10);
        const roman = ROMAN_NUMERALS[num] || numStr;
        return prefix + roman;
      });
    }
    case 'none':
    default:
      return text;
  }
}

/**
 * Extract field value from student record with case-insensitive / normalized lookup
 */
export function getStudentFieldValue(student: StudentCardRecord, key: string): string {
  const cleanKey = key.trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const recordMap: Record<string, string> = {
    studentname: student.studentName,
    name: student.studentName,
    fathername: student.fatherName,
    fathersname: student.fatherName,
    father: student.fatherName,
    mothername: student.motherName,
    mothersname: student.motherName,
    mother: student.motherName,
    dateofbirth: student.dateOfBirth,
    dob: student.dateOfBirth,
    classsection: student.classSection,
    class: student.classSection,
    section: student.classSection,
    addressline1: student.addressLine1,
    addressline2: student.addressLine2,
    city: student.city,
    pincode: student.pincode,
    addressfull: student.addressFull,
    address: student.addressFull,
    fathermobile: student.fatherMobile,
    fathersmobile: student.fatherMobile,
    mothermobile: student.motherMobile,
    mothersmobile: student.motherMobile,
    serialnumber: student.serialNumber,
    serialno: student.serialNumber,
    admno: student.serialNumber,
    serial: student.serialNumber,
    bloodgroup: student.bloodGroup,
    bg: student.bloodGroup,
    academicsession: student.academicSession,
    session: student.academicSession,
    year: student.academicSession,
  };

  return recordMap[cleanKey] ?? '';
}

/**
 * Resolve {field} placeholders inside a text template
 */
export function resolveCardTemplateText(
  content: string,
  student: StudentCardRecord,
  fmt: 'upper' | 'date' | 'roman' | 'none'
): { text: string; missingFields: string[] } {
  const missingFields: string[] = [];
  const resolved = content.replace(/\{([^}]+)\}/g, (_match, fieldName) => {
    const val = getStudentFieldValue(student, fieldName);
    if (!val || val.trim() === '') {
      missingFields.push(fieldName);
      return '';
    }
    return val;
  });

  // Clean up hanging colons or prefixes if value was empty (e.g. ": " -> "")
  const cleaned = resolved
    .replace(/^:\s*$/, '')
    .replace(/^\s*-\s*$/, '')
    .trim();

  return {
    text: formatCardText(cleaned, fmt),
    missingFields,
  };
}

/**
 * Cache for loaded images
 */
const imageCache = new Map<string, HTMLImageElement>();

export async function loadCardImage(src: string): Promise<HTMLImageElement | null> {
  if (!src) return null;
  if (imageCache.has(src)) {
    return imageCache.get(src)!;
  }
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      imageCache.set(src, img);
      resolve(img);
    };
    img.onerror = () => {
      resolve(null);
    };
    img.src = src;
  });
}

/**
 * Ensure required fonts are loaded before canvas rendering
 */
const loadedFonts = new Set<string>();

export async function ensureCardFonts(): Promise<void> {
  if (typeof document === 'undefined' || !document.fonts) return;
  const weights = [400, 500, 600, 700];
  const fonts = ['Open Sans', 'Roboto'];

  const promises: Promise<FontFace[]>[] = [];
  for (const font of fonts) {
    for (const w of weights) {
      const key = `${w} "${font}"`;
      if (!loadedFonts.has(key)) {
        promises.push(
          document.fonts
            .load(`${w} 24px "${font}"`, 'ABCDEFabcdef0123456789-:./,')
            .then((res) => {
              loadedFonts.add(key);
              return res;
            })
            .catch(() => [])
        );
      }
    }
  }
  await Promise.all(promises);
}

/**
 * Wrap text into maximum lines for a given width
 */
function wrapTextToLines(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidthPx: number,
  maxLines: number
): string[] | null {
  if (maxLines <= 1) {
    return ctx.measureText(text).width <= maxWidthPx ? [text] : null;
  }

  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width <= maxWidthPx) {
      currentLine = testLine;
    } else {
      if (!currentLine) return null; // Single word is wider than box
      lines.push(currentLine);
      currentLine = word;
      if (ctx.measureText(word).width > maxWidthPx) return null;
    }
  }
  if (currentLine) {
    lines.push(currentLine);
  }

  return lines.length <= maxLines ? lines : null;
}

/**
 * Layout text with shrinking down to 70% of size, wrapping up to `lines`, or marking overflow
 */
export function layoutCardText(
  ctx: CanvasRenderingContext2D,
  element: TextEl,
  text: string,
  scale: number
): { lines: string[]; finalSize: number; isShrunk: boolean; isOverflow: boolean } {
  const originalSize = element.size;
  const minAllowedSize = originalSize * 0.7; // Shrink down to 70%
  let currentSize = originalSize;
  let lines: string[] | null = null;
  const boxWidthPx = element.w * scale;

  // Step down font size until it fits within max lines
  while (currentSize >= minAllowedSize) {
    ctx.font = `${element.weight} ${currentSize * scale}px "${element.font}", sans-serif`;
    lines = wrapTextToLines(ctx, text, boxWidthPx, element.lines || 1);
    if (lines) break;
    currentSize -= originalSize * 0.03; // Step down by 3%
  }

  if (lines) {
    return {
      lines,
      finalSize: Math.max(currentSize, minAllowedSize),
      isShrunk: currentSize < originalSize * 0.95,
      isOverflow: false,
    };
  }

  // If still doesn't fit at 70%, force wrap and mark as overflow error
  ctx.font = `${element.weight} ${minAllowedSize * scale}px "${element.font}", sans-serif`;
  const words = text.split(/\s+/).filter(Boolean);
  const fallbackLines: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width <= boxWidthPx || !line) {
      line = test;
    } else {
      fallbackLines.push(line);
      line = w;
    }
  }
  if (line) fallbackLines.push(line);

  return {
    lines: fallbackLines.slice(0, element.lines || 1),
    finalSize: minAllowedSize,
    isShrunk: true,
    isOverflow: true,
  };
}

/**
 * Draw image with fit ("cover" | "contain") inside rectangle
 */
function drawImageWithFit(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  x: number,
  y: number,
  w: number,
  h: number,
  fit: 'cover' | 'contain'
): void {
  if (fit === 'contain') {
    const scale = Math.min(w / img.naturalWidth, h / img.naturalHeight);
    const dw = img.naturalWidth * scale;
    const dh = img.naturalHeight * scale;
    const dx = x + (w - dw) / 2;
    const dy = y + (h - dh) / 2;
    ctx.drawImage(img, dx, dy, dw, dh);
    return;
  }

  // Cover: fill entire box, crop excess centered
  const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
  const sw = w / scale;
  const sh = h / scale;
  const sx = (img.naturalWidth - sw) / 2;
  const sy = Math.max(0, (img.naturalHeight - sh) * 0.25); // Slight top bias for portraits

  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

/**
 * Draw placeholder dashed box when photo is absent
 */
function drawPlaceholderBox(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  scale: number
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(241, 245, 249, 0.7)';
  ctx.fillRect(x, y, w, h);
  ctx.setLineDash([2 * scale, 2 * scale]);
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.8)';
  ctx.lineWidth = Math.max(1, 0.2 * scale);
  ctx.strokeRect(x, y, w, h);
  ctx.setLineDash([]);

  ctx.fillStyle = '#64748b';
  ctx.font = `600 ${Math.max(10, 1.6 * scale)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x + w / 2, y + h / 2, w - 4);
  ctx.restore();
}

export interface DrawCardFaceOptions {
  showGuides?: boolean;
  selectedElementId?: string | null;
}

/**
 * Draw a single card side (front or back) to a CanvasRenderingContext2D
 */
export async function drawCardFace(
  ctx: CanvasRenderingContext2D,
  side: 'front' | 'back',
  student: StudentCardRecord,
  template: CardTemplate,
  scale: number,
  options: DrawCardFaceOptions = {}
): Promise<{ issues: CardIssue[] }> {
  await ensureCardFonts();

  const widthPx = template.w * scale;
  const heightPx = template.h * scale;
  const issues: CardIssue[] = [];

  // 1. Draw white background base
  ctx.save();
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // 2. Draw template background image (Front or Back), or draw clean vector artwork
  const bgUrl = side === 'front' ? template.bg.front : template.bg.back;
  let bgLoaded = false;
  if (bgUrl) {
    const bgImg = await loadCardImage(bgUrl);
    if (bgImg) {
      ctx.drawImage(bgImg, 0, 0, widthPx, heightPx);
      bgLoaded = true;
    }
  }

  // If no background image provided, draw clean, professional vector school card artwork
  if (!bgLoaded) {
    ctx.save();
    const primary = template.primaryColor || '#1e3a8a';
    const accent = template.accentColor || '#f59e0b';
    const schoolTitle = (template.schoolName || template.name || 'ST. XAVIER SENIOR SECONDARY SCHOOL').toUpperCase();
    const schoolSub =
      template.schoolSubtitle ||
      `STUDENT IDENTITY CARD • SESSION ${student.academicSession || '2026-27'}`;

    if (side === 'front') {
      // Top Header Banner
      const headerHPx = 14.5 * scale;
      const grad = ctx.createLinearGradient(0, 0, widthPx, 0);
      grad.addColorStop(0, primary);
      grad.addColorStop(1, primary);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, widthPx, headerHPx);

      // Accent Stripe
      ctx.fillStyle = accent;
      ctx.fillRect(0, headerHPx, widthPx, 0.7 * scale);

      // School Emblem / Crest
      const emblemR = 4.8 * scale;
      const emblemX = 8.0 * scale;
      const emblemY = headerHPx / 2;
      ctx.beginPath();
      ctx.arc(emblemX, emblemY, emblemR, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
      ctx.lineWidth = 0.5 * scale;
      ctx.strokeStyle = accent;
      ctx.stroke();

      let drawnLogo = false;
      if (template.schoolLogo) {
        const logoImg = await loadCardImage(template.schoolLogo);
        if (logoImg) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(emblemX, emblemY, emblemR - 0.2 * scale, 0, Math.PI * 2);
          ctx.clip();
          drawImageWithFit(ctx, logoImg, emblemX - emblemR, emblemY - emblemR, emblemR * 2, emblemR * 2, 'cover');
          ctx.restore();
          drawnLogo = true;
        }
      }

      if (!drawnLogo) {
        ctx.fillStyle = primary;
        ctx.font = `bold ${2.8 * scale}px "Open Sans", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('🎓', emblemX, emblemY);
      }

      // School Name
      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${2.8 * scale}px "Open Sans", sans-serif`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(schoolTitle, 15.5 * scale, headerHPx * 0.4, widthPx - 17 * scale);

      // Subtitle
      ctx.fillStyle = '#fde68a';
      ctx.font = `600 ${1.65 * scale}px "Open Sans", sans-serif`;
      ctx.fillText(schoolSub, 15.5 * scale, headerHPx * 0.76, widthPx - 17 * scale);

      // Bottom Footer Banner
      const footerHPx = 6.0 * scale;
      const footerY = heightPx - footerHPx;
      ctx.fillStyle = primary;
      ctx.fillRect(0, footerY, widthPx, footerHPx);

      ctx.fillStyle = accent;
      ctx.fillRect(0, footerY - 0.5 * scale, widthPx, 0.5 * scale);

      ctx.fillStyle = '#ffffff';
      ctx.font = `500 ${1.6 * scale}px "Open Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        'Transport & Emergency Helpline: 011-28031077 / 49997999',
        widthPx / 2,
        footerY + footerHPx / 2
      );

      // Outer Border
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.4 * scale;
      ctx.strokeRect(0, 0, widthPx, heightPx);
    } else {
      // BACK SIDE Artwork
      const headerHPx = 13.0 * scale;
      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, widthPx, headerHPx);

      ctx.fillStyle = accent;
      ctx.fillRect(0, headerHPx, widthPx, 0.7 * scale);

      ctx.fillStyle = '#ffffff';
      ctx.font = `bold ${2.6 * scale}px "Open Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('PICK-UP AUTHORIZATION CARD', widthPx / 2, headerHPx * 0.38);

      ctx.fillStyle = '#fde68a';
      ctx.font = `500 ${1.6 * scale}px "Open Sans", sans-serif`;
      ctx.fillText('Following persons are authorised to pick the child from school / van', widthPx / 2, headerHPx * 0.75);

      // Bottom Instructions
      const footerHPx = 7.5 * scale;
      const footerY = heightPx - footerHPx;
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, footerY, widthPx, footerHPx);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 0.3 * scale;
      ctx.strokeRect(0, footerY, widthPx, footerHPx);

      ctx.fillStyle = '#475569';
      ctx.font = `500 ${1.5 * scale}px "Open Sans", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(
        `If found, please contact: ${student.fatherMobile || student.motherMobile || '011-28031077'} • School Office`,
        widthPx / 2,
        footerY + footerHPx / 2
      );

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 0.4 * scale;
      ctx.strokeRect(0, 0, widthPx, heightPx);
    }
    ctx.restore();
  }

  // 3. Render elements on this side
  const fontMultiplier = template.fontScale || 1.0;

  for (const element of template.elements) {
    if (element.side !== side) continue;

    const x = element.x * scale;
    const y = element.y * scale;
    const w = element.w * scale;
    const h = element.h * scale;

    if (element.type === 'text') {
      const { text } = resolveCardTemplateText(element.content, student, element.fmt);
      if (!text || text.trim() === '') continue;

      const layout = layoutCardText(ctx, element, text, scale);
      if (layout.isOverflow) {
        issues.push({
          id: `text_overflow_${element.id}`,
          level: 'error',
          message: `${element.label}: text too long to fit in card box`,
        });
      } else if (layout.isShrunk) {
        issues.push({
          id: `text_shrunk_${element.id}`,
          level: 'warning',
          message: `${element.label}: text shrunk to fit box`,
        });
      }

      ctx.save();
      const effectiveSize = layout.finalSize * fontMultiplier;
      ctx.font = `${element.weight} ${effectiveSize * scale}px "${element.font}", sans-serif`;
      ctx.fillStyle = element.color;
      ctx.textBaseline = 'alphabetic';
      ctx.textAlign = element.align;

      // Vertical centering: compute total height of lines
      const capHeight = effectiveSize * scale * 0.72;
      const lineHeight = effectiveSize * scale * 1.25;
      const totalTextHeight = lineHeight * (layout.lines.length - 1) + capHeight;
      let lineY = y + (h - totalTextHeight) / 2 + capHeight;

      const lineX =
        element.align === 'center'
          ? x + w / 2
          : element.align === 'right'
          ? x + w
          : x;

      for (const line of layout.lines) {
        ctx.fillText(line, lineX, lineY);
        lineY += lineHeight;
      }
      ctx.restore();
    } else if (element.type === 'photo') {
      const photoUrl = student.photos[element.field] || student.photos.student;
      if (photoUrl) {
        const photoImg = await loadCardImage(photoUrl);
        if (photoImg) {
          ctx.save();
          drawImageWithFit(ctx, photoImg, x, y, w, h, element.fit);
          if (element.border > 0) {
            ctx.lineWidth = element.border * scale;
            ctx.strokeStyle = element.borderColor || '#000000';
            const inset = ctx.lineWidth / 2;
            ctx.strokeRect(x + inset, y + inset, w - ctx.lineWidth, h - ctx.lineWidth);
          }
          ctx.restore();
        }
      } else if (options.showGuides) {
        drawPlaceholderBox(ctx, x, y, w, h, 'No Photo', scale);
      }
    } else if (element.type === 'photos') {
      // Photo Row: Mother, Father, Pickup3 in fixed order
      const photoImgs: (HTMLImageElement | null)[] = [];
      for (const fieldName of element.fields) {
        const pUrl = student.photos[fieldName];
        if (pUrl) {
          const loaded = await loadCardImage(pUrl);
          photoImgs.push(loaded);
        } else {
          photoImgs.push(null);
        }
      }

      const totalSlots = Math.max(1, element.slots || 3);
      const gapPx = element.gap * scale;
      const slotWidthPx = (w - gapPx * (totalSlots - 1)) / totalSlots;

      for (let slotIdx = 0; slotIdx < totalSlots; slotIdx++) {
        const sx = x + slotIdx * (slotWidthPx + gapPx);
        const img = photoImgs[slotIdx];

        if (img) {
          ctx.save();
          drawImageWithFit(ctx, img, sx, y, slotWidthPx, h, element.fit);
          if (element.border > 0) {
            ctx.lineWidth = element.border * scale;
            ctx.strokeStyle = element.borderColor || '#000000';
            const inset = ctx.lineWidth / 2;
            ctx.strokeRect(
              sx + inset,
              y + inset,
              slotWidthPx - ctx.lineWidth,
              h - ctx.lineWidth
            );
          }
          ctx.restore();
        } else if (options.showGuides) {
          const roleLabels = ['Mother', 'Father', 'Pickup 3'];
          drawPlaceholderBox(
            ctx,
            sx,
            y,
            slotWidthPx,
            h,
            roleLabels[slotIdx] || 'Pickup',
            scale
          );
        }
      }
    }
  }

  ctx.restore();
  return { issues };
}

/**
 * Render a card side directly to a canvas element at 300 DPI
 */
export async function renderCardSide(
  canvas: HTMLCanvasElement,
  side: 'front' | 'back',
  template: CardTemplate,
  student: StudentCardRecord
): Promise<CardIssue[]> {
  const ctx = canvas.getContext('2d');
  if (!ctx) return [];
  const result = await drawCardFace(ctx, side, student, template, MM_TO_PX);
  return result.issues;
}

/**
 * Pre-print checks for student record
 */
export function analyzeCardIssues(
  student: StudentCardRecord,
  template: CardTemplate,
  allStudents: StudentCardRecord[]
): CardIssue[] {
  const issues: CardIssue[] = [];

  // 1. Missing student photo
  if (!student.photos.student) {
    issues.push({
      id: 'missing_student_photo',
      level: 'error',
      message: 'Student photo is missing',
    });
  }

  // 2. Unconfirmed student photo if roleConfidence < 0.9
  if (student.photos.student && !student.photoConfirmations.student) {
    issues.push({
      id: 'unconfirmed_student_photo',
      level: 'error',
      message: 'Student photo requires manual confirmation (confidence < 0.9)',
    });
  }

  // 3. No pickup photos
  const adultPhotoKeys = ['mother', 'father', 'pickup3'];
  const adultPhotos = adultPhotoKeys
    .map((k) => ({ role: k, url: student.photos[k] }))
    .filter((p) => Boolean(p.url));

  if (adultPhotos.length === 0) {
    issues.push({
      id: 'no_pickup_photos',
      level: 'error',
      message: 'No authorised pick-up photos provided',
    });
  }

  // 4. Adult photos confirmation safety check
  // "A card is BLOCKED from export until every adult photo on it has been manually confirmed by the user"
  for (const adult of adultPhotos) {
    const isConfirmed = student.photoConfirmations[adult.role as keyof typeof student.photoConfirmations];
    if (!isConfirmed) {
      const roleLabel =
        adult.role === 'pickup3'
          ? 'Authorised Pickup 3'
          : adult.role.charAt(0).toUpperCase() + adult.role.slice(1);
      issues.push({
        id: `unconfirmed_adult_${adult.role}`,
        level: 'error',
        message: `${roleLabel} photo requires manual confirmation`,
      });
    }
  }

  // 5. Phone not 10 digits
  const cleanFatherPhone = student.fatherMobile.replace(/\D/g, '');
  if (cleanFatherPhone && cleanFatherPhone.length !== 10) {
    issues.push({
      id: 'invalid_father_phone',
      level: 'error',
      message: "Father's mobile must be 10 digits",
    });
  }
  const cleanMotherPhone = student.motherMobile.replace(/\D/g, '');
  if (cleanMotherPhone && cleanMotherPhone.length !== 10) {
    issues.push({
      id: 'invalid_mother_phone',
      level: 'error',
      message: "Mother's mobile must be 10 digits",
    });
  }

  // 6. Pincode not 6 digits
  const cleanPincode = student.pincode.replace(/\D/g, '');
  if (!cleanPincode || cleanPincode.length !== 6) {
    issues.push({
      id: 'invalid_pincode',
      level: 'error',
      message: 'Pincode must be 6 digits',
    });
  }

  // 7. Invalid DOB
  if (!student.dateOfBirth || !/\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{2,4}/.test(student.dateOfBirth)) {
    issues.push({
      id: 'invalid_dob',
      level: 'error',
      message: 'Date of birth is invalid or missing (DD-MM-YYYY required)',
    });
  }

  // 8. Duplicates: duplicate serialNumber (error) or duplicate name+DOB (warn)
  if (student.serialNumber) {
    const dupSerial = allStudents.filter(
      (s) => s.uid !== student.uid && s.serialNumber && s.serialNumber === student.serialNumber
    );
    if (dupSerial.length > 0) {
      issues.push({
        id: 'dup_serial',
        level: 'error',
        message: `Duplicate Serial / Adm. No (${student.serialNumber})`,
      });
    }
  }

  if (student.studentName && student.dateOfBirth) {
    const dupNameDob = allStudents.filter(
      (s) =>
        s.uid !== student.uid &&
        s.studentName.trim().toLowerCase() === student.studentName.trim().toLowerCase() &&
        s.dateOfBirth === student.dateOfBirth
    );
    if (dupNameDob.length > 0) {
      issues.push({
        id: 'dup_name_dob',
        level: 'warning',
        message: 'Duplicate student name and date of birth',
      });
    }
  }

  return issues;
}
