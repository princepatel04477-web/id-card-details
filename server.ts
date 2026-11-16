/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import type { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const FieldExtractionSchema = z.object({
  value: z.string(),
  raw: z.string(),
  confidence: z.number().min(0).max(1),
});

const PhotoBoxSchema = z.object({
  box_2d: z.tuple([z.number(), z.number(), z.number(), z.number()]),
  roleGuess: z.enum(['student', 'father', 'mother', 'guardian', 'unknown']),
  roleConfidence: z.number().min(0).max(1),
  reason: z.string(),
});

export const GeminiResponseSchema = z.object({
  serialNumber: FieldExtractionSchema,
  academicSession: FieldExtractionSchema,
  formDate: FieldExtractionSchema,
  studentName: FieldExtractionSchema,
  fatherName: FieldExtractionSchema,
  motherName: FieldExtractionSchema,
  dateOfBirth: FieldExtractionSchema,
  classSection: FieldExtractionSchema,
  addressLine1: FieldExtractionSchema,
  addressLine2: FieldExtractionSchema,
  city: FieldExtractionSchema,
  pincode: FieldExtractionSchema,
  residencePhone: FieldExtractionSchema,
  fatherMobile: FieldExtractionSchema,
  motherMobile: FieldExtractionSchema,
  modeOfTransport: FieldExtractionSchema,
  bloodGroup: FieldExtractionSchema,
  photos: z.array(PhotoBoxSchema),
});

const geminiResponseGenAiSchema = {
  type: Type.OBJECT,
  properties: {
    serialNumber: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    academicSession: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    formDate: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    studentName: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    fatherName: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    motherName: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    dateOfBirth: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    classSection: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    addressLine1: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    addressLine2: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    city: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    pincode: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    residencePhone: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    fatherMobile: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    motherMobile: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    modeOfTransport: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    bloodGroup: {
      type: Type.OBJECT,
      properties: {
        value: { type: Type.STRING },
        raw: { type: Type.STRING },
        confidence: { type: Type.NUMBER },
      },
      required: ['value', 'raw', 'confidence'],
    },
    photos: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          box_2d: {
            type: Type.ARRAY,
            items: { type: Type.NUMBER },
            description: '[ymin, xmin, ymax, xmax] coordinates normalized to 0-1000',
          },
          roleGuess: {
            type: Type.STRING,
            description: 'One of "student", "father", "mother", "guardian", "unknown"',
          },
          roleConfidence: {
            type: Type.NUMBER,
            description: 'Confidence in role assignment between 0.0 and 1.0',
          },
          reason: {
            type: Type.STRING,
            description: 'Brief reason explaining role guess based on position on the form',
          },
        },
        required: ['box_2d', 'roleGuess', 'roleConfidence', 'reason'],
      },
    },
  },
  required: [
    'serialNumber',
    'academicSession',
    'formDate',
    'studentName',
    'fatherName',
    'motherName',
    'dateOfBirth',
    'classSection',
    'addressLine1',
    'addressLine2',
    'city',
    'pincode',
    'residencePhone',
    'fatherMobile',
    'motherMobile',
    'modeOfTransport',
    'bloodGroup',
    'photos',
  ],
};

function getPrompt(retryFeedback?: string): string {
  let prompt = `You are an expert document OCR and form extraction specialist analyzing a scanned handwritten school "I-Card Performa" form.

CRITICAL INSTRUCTIONS:
1. Extract every text field with three attributes:
   - "value": The normalized/cleaned value.
   - "raw": Exactly as written on the paper.
   - "confidence": Float between 0.0 and 1.0 indicating reading certainty.
2. If a field is empty, blank, or illegible, set value to "" and confidence to 0.0. NEVER guess, invent, or hallucinate values.
3. Field rules:
   - serialNumber: Look for a circled or standalone number near the top header (e.g. "7692").
   - academicSession: e.g. "2024-2025" or "2024-25".
   - formDate: Date written on the form.
   - studentName, fatherName, motherName: Keep CAPITAL letters as written.
   - dateOfBirth: raw as written, value normalized to DD/MM/YYYY.
   - classSection: raw as written (e.g. "Vth - B"), value normalized (e.g. "5-B").
   - addressLine1, addressLine2, city, pincode (6-digit Indian PIN code).
   - residencePhone, fatherMobile, motherMobile: 10-digit Indian phone numbers with spaces and special characters removed.
   - modeOfTransport: "Walker" | "Van" | "Bus" | as written.
   - bloodGroup: raw as written, value normalized (e.g. "B POSITIVE" -> "B+").

4. Photos extraction:
   Detect all passport/portrait photos pasted onto the form scan.
   Return an array of photo objects:
   - box_2d: [ymin, xmin, ymax, xmax] normalized between 0 and 1000 representing the bounding rectangle of the photograph.
   - roleGuess: "student" | "father" | "mother" | "guardian" | "unknown".
   - roleConfidence: number between 0.0 and 1.0.
   - reason: explanation of position.
   PHOTO ROLE RULES:
   - The photo inside or beside the main form header/fields is the "student".
   - Photos pasted BELOW the form in the parents/guardians section are adults (father, mother, guardian). There may be 1, 2, or 3 adult photos; return ALL of them.
   - Do NOT claim certainty about which adult is father, mother, or guardian unless explicitly marked with labels like "Father's Photo" or "Mother's Photo"; keep roleConfidence honestly below 0.8 for adults when ambiguous.`;

  if (retryFeedback) {
    prompt += `\n\nPREVIOUS ATTEMPT FAILED VALIDATION WITH ERROR:\n${retryFeedback}\nPlease correct the output to strictly match the requested JSON schema.`;
  }

  return prompt;
}

interface ExtractRequestBody {
  imageBase64: string;
  mimeType: string;
}

app.post('/api/gemini/extract', async (req: Request<unknown, unknown, ExtractRequestBody>, res: Response) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({
      error: 'GEMINI_API_KEY environment variable is not configured on the server.',
    });
    return;
  }

  const { imageBase64, mimeType } = req.body;
  if (!imageBase64) {
    res.status(400).json({ error: 'imageBase64 is required in the request body.' });
    return;
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, '');
  const imagePart = {
    inlineData: {
      mimeType: mimeType || 'image/png',
      data: cleanBase64,
    },
  };

  const candidateModels = ['gemini-3.8-flash', 'gemini-3.1-flash-lite'];

  async function executeCall(promptText: string) {
    let lastError: unknown;
    for (const modelName of candidateModels) {
      try {
        const thinkingLevel =
          modelName === 'gemini-3.8-flash' ? ThinkingLevel.LOW : ThinkingLevel.MINIMAL;

        const generatePromise = ai.models.generateContent({
          model: modelName,
          contents: {
            parts: [imagePart, { text: promptText }],
          },
          config: {
            thinkingConfig: { thinkingLevel },
            responseMimeType: 'application/json',
            responseSchema: geminiResponseGenAiSchema,
          },
        });

        const timeoutPromise = new Promise<never>((_, reject) => {
          setTimeout(
            () =>
              reject(
                new Error(
                  `Gemini API request timed out (20s) on ${modelName}.`
                )
              ),
            20000
          );
        });

        return await Promise.race([generatePromise, timeoutPromise]);
      } catch (err: unknown) {
        lastError = err;
        const errStr = String(err);
        if (
          errStr.includes('503') ||
          errStr.includes('429') ||
          errStr.includes('UNAVAILABLE') ||
          errStr.includes('high demand') ||
          errStr.includes('RESOURCE_EXHAUSTED') ||
          errStr.includes('timed out') ||
          errStr.includes('quota')
        ) {
          // If gemini-3.8-flash is exhausted, seamlessly fall back to gemini-3.1-flash-lite
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  }

  try {
    let response = await executeCall(getPrompt());
    let rawText = response.text?.trim() || '';

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(rawText);
    } catch {
      // Retry once if JSON parse failed
      response = await executeCall(getPrompt('The returned response was not valid JSON.'));
      rawText = response.text?.trim() || '';
      parsedJson = JSON.parse(rawText);
    }

    const validationResult = GeminiResponseSchema.safeParse(parsedJson);

    if (!validationResult.success) {
      const issues = validationResult.error.issues
        .map((i) => `${i.path.join('.')}: ${i.message}`)
        .join('; ');
      
      // Retry once with validation error appended
      const retryResponse = await executeCall(getPrompt(issues));
      const retryRawText = retryResponse.text?.trim() || '';
      const retryParsedJson = JSON.parse(retryRawText);
      const secondValidation = GeminiResponseSchema.safeParse(retryParsedJson);

      if (!secondValidation.success) {
        res.status(422).json({
          error: 'Failed schema validation after retry: ' + secondValidation.error.issues.map((i) => i.message).join(', '),
        });
        return;
      }

      res.json(secondValidation.data);
      return;
    }

    res.json(validationResult.data);
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    res.status(500).json({
      error: `Gemini extraction failed: ${errorMsg}`,
    });
  }
});

// In-memory + persistent teacher submissions store
const SUBMISSIONS_FILE = path.resolve(__dirname, 'submissions.json');
let teacherSubmissions: Array<{
  id: string;
  studentName: string;
  serialNumber: string;
  classSection: string;
  dateOfBirth: string;
  bloodGroup: string;
  fatherName: string;
  fatherMobile: string;
  motherName: string;
  motherMobile: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  academicSession: string;
  modeOfTransport: string;
  teacherName?: string;
  photos: {
    student?: string;
    father?: string;
    mother?: string;
    pickup3?: string;
  };
  submittedAt: number;
  status: 'pending' | 'imported';
}> = [];

try {
  if (fs.existsSync(SUBMISSIONS_FILE)) {
    const raw = fs.readFileSync(SUBMISSIONS_FILE, 'utf-8');
    teacherSubmissions = JSON.parse(raw);
  }
} catch {
  teacherSubmissions = [];
}

function saveTeacherSubmissions() {
  try {
    fs.writeFileSync(SUBMISSIONS_FILE, JSON.stringify(teacherSubmissions, null, 2), 'utf-8');
  } catch {
    // storage fallback
  }
}

// Get all teacher submissions
app.get('/api/submissions', (_req: Request, res: Response) => {
  res.json(teacherSubmissions);
});

// Post new teacher submission
app.post('/api/submissions', (req: Request, res: Response) => {
  try {
    const body = req.body;
    if (!body.studentName) {
      res.status(400).json({ error: 'studentName is required' });
      return;
    }
    const newSubmission = {
      id: body.id || `sub_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      studentName: body.studentName || '',
      serialNumber: body.serialNumber || '',
      classSection: body.classSection || '',
      dateOfBirth: body.dateOfBirth || '',
      bloodGroup: body.bloodGroup || '',
      fatherName: body.fatherName || '',
      fatherMobile: body.fatherMobile || '',
      motherName: body.motherName || '',
      motherMobile: body.motherMobile || '',
      addressLine1: body.addressLine1 || '',
      addressLine2: body.addressLine2 || '',
      city: body.city || 'New Delhi',
      pincode: body.pincode || '',
      academicSession: body.academicSession || '2026-27',
      modeOfTransport: body.modeOfTransport || 'Walker',
      teacherName: body.teacherName || '',
      photos: body.photos || {},
      submittedAt: Date.now(),
      status: 'pending' as const,
    };

    teacherSubmissions.unshift(newSubmission);
    saveTeacherSubmissions();
    res.json({ success: true, submission: newSubmission });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Failed to save submission: ${msg}` });
  }
});

// Delete / dismiss submission
app.delete('/api/submissions/:id', (req: Request, res: Response) => {
  const id = req.params.id;
  teacherSubmissions = teacherSubmissions.filter((s) => s.id !== id);
  saveTeacherSubmissions();
  res.json({ success: true });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, port, host: '0.0.0.0' },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    // Dev server started on port 3000
  });
}

startServer();
