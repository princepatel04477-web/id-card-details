/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface BoundingPixelBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Calculates pixel crop box from [ymin, xmin, ymax, xmax] (0-1000),
 * adding 3% padding and clamping to original image dimensions.
 */
export function calculatePaddedCropBox(
  box_2d: [number, number, number, number],
  imageWidth: number,
  imageHeight: number,
  paddingRatio = 0.03
): BoundingPixelBox {
  const [ymin, xmin, ymax, xmax] = box_2d;

  const rawYmin = (ymin / 1000) * imageHeight;
  const rawXmin = (xmin / 1000) * imageWidth;
  const rawYmax = (ymax / 1000) * imageHeight;
  const rawXmax = (xmax / 1000) * imageWidth;

  const rawW = Math.max(1, rawXmax - rawXmin);
  const rawH = Math.max(1, rawYmax - rawYmin);

  const padX = rawW * paddingRatio;
  const padY = rawH * paddingRatio;

  const x1 = Math.max(0, Math.floor(rawXmin - padX));
  const y1 = Math.max(0, Math.floor(rawYmin - padY));
  const x2 = Math.min(imageWidth, Math.ceil(rawXmax + padX));
  const y2 = Math.min(imageHeight, Math.ceil(rawYmax + padY));

  return {
    x: x1,
    y: y1,
    width: Math.max(1, x2 - x1),
    height: Math.max(1, y2 - y1),
  };
}

/**
 * Converts pixel rect back to [ymin, xmin, ymax, xmax] normalized to 0-1000.
 */
export function pixelRectToBox2d(
  rect: BoundingPixelBox,
  imageWidth: number,
  imageHeight: number
): [number, number, number, number] {
  const ymin = Math.max(0, Math.min(1000, Math.round((rect.y / imageHeight) * 1000)));
  const xmin = Math.max(0, Math.min(1000, Math.round((rect.x / imageWidth) * 1000)));
  const ymax = Math.max(0, Math.min(1000, Math.round(((rect.y + rect.height) / imageHeight) * 1000)));
  const xmax = Math.max(0, Math.min(1000, Math.round(((rect.x + rect.width) / imageWidth) * 1000)));

  return [ymin, xmin, ymax, xmax];
}

/**
 * Loads an image from data URL or URL into an HTMLImageElement.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(new Error('Failed to load image: ' + String(e)));
    img.src = src;
  });
}

/**
 * Crops a section of the image using box_2d [0-1000] and optional rotation.
 * Exports PNG at original resolution.
 */
export async function cropImageFromBox(
  imageSource: string | HTMLImageElement,
  box_2d: [number, number, number, number],
  rotation = 0,
  paddingRatio = 0.03
): Promise<string> {
  const img = typeof imageSource === 'string' ? await loadImage(imageSource) : imageSource;
  const naturalWidth = img.naturalWidth || img.width;
  const naturalHeight = img.naturalHeight || img.height;

  const crop = calculatePaddedCropBox(box_2d, naturalWidth, naturalHeight, paddingRatio);

  const canvas = document.createElement('canvas');
  const rad = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(rad));
  const sin = Math.abs(Math.sin(rad));
  const newWidth = Math.round(crop.width * cos + crop.height * sin);
  const newHeight = Math.round(crop.width * sin + crop.height * cos);

  canvas.width = Math.max(1, newWidth);
  canvas.height = Math.max(1, newHeight);

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context not available');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(rad);
  ctx.drawImage(
    img,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    -crop.width / 2,
    -crop.height / 2,
    crop.width,
    crop.height
  );
  ctx.restore();

  return canvas.toDataURL('image/png');
}

/**
 * Rotates an existing data URL by 90 degrees clockwise or counterclockwise.
 */
export async function rotateImageDataUrl(
  dataUrl: string,
  degrees: 90 | -90 | 180 | 270
): Promise<string> {
  const img = await loadImage(dataUrl);
  const canvas = document.createElement('canvas');
  const normalizedDegrees = ((degrees % 360) + 360) % 360;

  if (normalizedDegrees === 90 || normalizedDegrees === 270) {
    canvas.width = img.naturalHeight;
    canvas.height = img.naturalWidth;
  } else {
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;
  }

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not available');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  ctx.save();
  if (normalizedDegrees === 90) {
    ctx.translate(canvas.width, 0);
    ctx.rotate((90 * Math.PI) / 180);
  } else if (normalizedDegrees === 180) {
    ctx.translate(canvas.width, canvas.height);
    ctx.rotate((180 * Math.PI) / 180);
  } else if (normalizedDegrees === 270) {
    ctx.translate(0, canvas.height);
    ctx.rotate((270 * Math.PI) / 180);
  }

  ctx.drawImage(img, 0, 0);
  ctx.restore();

  return canvas.toDataURL('image/png');
}
