/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * Generates an authentic simulated school "I-Card Performa" form image as a Data URL.
 * Contains:
 * - School Header & Academic Session
 * - Standalone/circled Serial Number (7692)
 * - Printed form labels with handwritten simulated entries
 * - Student photo box in upper right with a student portrait
 * - 2 Parent/Guardian photo boxes below the form
 */
export function generateSampleICardImage(): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    canvas.width = 1200;
    canvas.height = 1600;
    const ctx = canvas.getContext('2d')!;

    // 1. Off-white aged paper background
    ctx.fillStyle = '#faf8f2';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Subtle paper grain/scan border
    ctx.strokeStyle = '#e2decb';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 30) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Outer border of form
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.5;
    ctx.strokeRect(50, 50, 1100, 1500);

    // Header section
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 36px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('ST. XAVIER SENIOR SECONDARY SCHOOL', 600, 110);

    ctx.font = '22px "Times New Roman", serif';
    ctx.fillText('NEW DELHI - 110001', 600, 145);

    ctx.font = 'bold 28px "Times New Roman", serif';
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText('IDENTITY CARD PERFORMA (2024 - 2025)', 600, 195);

    // Circled Serial Number at top left
    ctx.strokeStyle = '#b91c1c';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(150, 130, 42, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 26px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('7692', 150, 138);

    // Date top right below header
    ctx.fillStyle = '#334155';
    ctx.font = '18px "Times New Roman", serif';
    ctx.textAlign = 'left';
    ctx.fillText('Date: 15/07/2024', 900, 240);

    // 2. Student Photo Box (top right)
    // [ymin: 150, xmin: 750, ymax: 330, xmax: 930] in 0-1000 range
    // In canvas pixels (1200x1600):
    // x = 900, y = 260, w = 210, h = 270
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(900, 260, 210, 270);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(900, 260, 210, 270);

    // Draw stylized student portrait inside box
    ctx.fillStyle = '#60a5fa'; // shirt
    ctx.beginPath();
    ctx.arc(1005, 500, 90, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fed7aa'; // face
    ctx.beginPath();
    ctx.arc(1005, 380, 55, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e293b'; // hair
    ctx.beginPath();
    ctx.arc(1005, 360, 58, Math.PI * 0.8, Math.PI * 2.2);
    ctx.fill();
    // Eyes & smile
    ctx.fillStyle = '#1e293b';
    ctx.beginPath();
    ctx.arc(985, 375, 4, 0, Math.PI * 2);
    ctx.arc(1025, 375, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(1005, 395, 16, 0.2 * Math.PI, 0.8 * Math.PI);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = '14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PASTE STUDENT PHOTO', 1005, 520);

    // 3. Form fields (Printed labels + Handwritten simulated text)
    const fieldEntries: Array<{ label: string; handwritten: string; y: number }> = [
      { label: "1. Student's Full Name (in block letters):", handwritten: 'AARAV SHARMA', y: 280 },
      { label: "2. Father's Name (in block letters):", handwritten: 'RAJESH SHARMA', y: 340 },
      { label: "3. Mother's Name (in block letters):", handwritten: 'PRIYA SHARMA', y: 400 },
      { label: '4. Date of Birth (DD/MM/YYYY):', handwritten: '15/08/2014', y: 460 },
      { label: '5. Class & Section:', handwritten: 'Vth - B', y: 520 },
      { label: '6. Residential Address Line 1:', handwritten: 'Flat 402, Sunshine Apartments', y: 580 },
      { label: '   Address Line 2 (Locality):', handwritten: 'Sector 14, Rohini', y: 640 },
      { label: '7. City & PIN Code:', handwritten: 'New Delhi - 110085', y: 700 },
      { label: '8. Residence Landline Phone:', handwritten: '01127894561', y: 760 },
      { label: "9. Father's Mobile Number:", handwritten: '9811234567', y: 820 },
      { label: "10. Mother's Mobile Number:", handwritten: '9811987654', y: 880 },
      { label: '11. Mode of Transport (Walker / Van / Bus):', handwritten: 'School Van', y: 940 },
      { label: '12. Blood Group:', handwritten: 'B POSITIVE', y: 1000 },
    ];

    ctx.textAlign = 'left';
    for (const entry of fieldEntries) {
      // Printed label
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px "Times New Roman", serif';
      ctx.fillText(entry.label, 90, entry.y);

      // Line for handwriting
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const lineStart = entry.label.length > 30 ? 500 : 420;
      ctx.moveTo(lineStart, entry.y + 4);
      ctx.lineTo(870, entry.y + 4);
      ctx.stroke();

      // Simulated handwriting in blue pen
      ctx.fillStyle = '#1e40af'; // Blue ballpoint ink
      ctx.font = 'italic 23px "Comic Sans MS", cursive, sans-serif';
      ctx.fillText(entry.handwritten, lineStart + 15, entry.y);
    }

    // Divider before parent photos
    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(70, 1060);
    ctx.lineTo(1130, 1060);
    ctx.stroke();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px "Times New Roman", serif';
    ctx.textAlign = 'center';
    ctx.fillText('PARENTS / GUARDIANS PHOTOGRAPHS (FOR VERIFICATION)', 600, 1095);

    // 4. Adult photos below the form
    // Photo 1: Father (approx canvas: x=240, y=1130, w=200, h=250)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(240, 1130, 200, 250);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(240, 1130, 200, 250);

    // Father portrait
    ctx.fillStyle = '#334155';
    ctx.beginPath();
    ctx.arc(340, 1340, 80, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fbcfe8';
    ctx.beginPath();
    ctx.arc(340, 1230, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#0f172a'; // mustache & hair
    ctx.fillRect(320, 1245, 40, 8);
    ctx.beginPath();
    ctx.arc(340, 1205, 52, Math.PI * 0.9, Math.PI * 2.1);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px "Times New Roman", serif';
    ctx.fillText("Father's Photo", 340, 1405);

    // Photo 2: Mother (approx canvas: x=760, y=1130, w=200, h=250)
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(760, 1130, 200, 250);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(760, 1130, 200, 250);

    // Mother portrait
    ctx.fillStyle = '#be185d';
    ctx.beginPath();
    ctx.arc(860, 1340, 80, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(860, 1230, 50, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1e1b4b'; // long hair
    ctx.beginPath();
    ctx.arc(860, 1220, 54, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fed7aa';
    ctx.beginPath();
    ctx.arc(860, 1235, 42, 0, Math.PI * 2);
    ctx.fill();
    // Bindi
    ctx.fillStyle = '#dc2626';
    ctx.beginPath();
    ctx.arc(860, 1215, 3, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 18px "Times New Roman", serif';
    ctx.fillText("Mother's Photo", 860, 1405);

    // Signature line
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(850, 1510);
    ctx.lineTo(1080, 1510);
    ctx.stroke();

    ctx.font = '16px "Times New Roman", serif';
    ctx.fillStyle = '#0f172a';
    ctx.textAlign = 'center';
    ctx.fillText("Parent's Signature", 965, 1530);

    resolve({
      dataUrl: canvas.toDataURL('image/png'),
      width: canvas.width,
      height: canvas.height,
    });
  });
}
