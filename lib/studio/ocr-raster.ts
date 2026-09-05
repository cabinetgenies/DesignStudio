import { getPageMeta, renderPage, type PdfDocument } from "./pdf";

export type OcrPreset =
  | "automatic"
  | "clean"
  | "scanned"
  | "faint"
  | "dark";

export const OCR_PRESETS: { value: OcrPreset; label: string }[] = [
  { value: "automatic", label: "Automatic" },
  { value: "clean", label: "Clean Vector Export" },
  { value: "scanned", label: "Scanned Drawing" },
  { value: "faint", label: "Faint Drawing" },
  { value: "dark", label: "Dark Background" },
];

const OCR_DPI = 300;
const MAX_OCR_PIXELS = 24_000_000;

export interface OcrRaster {
  canvas: HTMLCanvasElement;
  scale: number;
  widthPt: number;
  heightPt: number;
  crop: { x: number; y: number; width: number; height: number } | null;
  downscaled: boolean;
}

export async function renderOcrRaster(
  pdf: PdfDocument,
  pageNumber: number,
  crop?: { x: number; y: number; width: number; height: number },
): Promise<OcrRaster> {
  const meta = await getPageMeta(pdf, pageNumber);
  let scale = OCR_DPI / 72;
  let downscaled = false;
  const fullPixels = meta.widthPt * meta.heightPt * scale * scale;
  if (fullPixels > MAX_OCR_PIXELS) {
    scale = Math.sqrt(MAX_OCR_PIXELS / (meta.widthPt * meta.heightPt));
    downscaled = true;
  }

  const rendered = await renderPage(pdf, pageNumber, scale, 0);
  let canvas = rendered.canvas;
  let effectiveCrop = crop ?? null;

  if (crop) {
    const cropX = Math.max(0, Math.floor(crop.x * scale));
    const cropY = Math.max(0, Math.floor(crop.y * scale));
    const cropW = Math.max(
      1,
      Math.min(rendered.width - cropX, Math.ceil(crop.width * scale)),
    );
    const cropH = Math.max(
      1,
      Math.min(rendered.height - cropY, Math.ceil(crop.height * scale)),
    );
    const cropped = document.createElement("canvas");
    cropped.width = cropW;
    cropped.height = cropH;
    const context = cropped.getContext("2d");
    if (!context) {
      throw new Error("Could not create an OCR crop canvas.");
    }
    context.drawImage(
      rendered.canvas,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW,
      cropH,
    );
    canvas = cropped;
    effectiveCrop = { ...crop };
  }

  return {
    canvas,
    scale,
    widthPt: meta.widthPt,
    heightPt: meta.heightPt,
    crop: effectiveCrop,
    downscaled,
  };
}

export function preprocessOcrImage(
  source: HTMLCanvasElement,
  preset: OcrPreset,
): HTMLCanvasElement {
  const output = document.createElement("canvas");
  output.width = source.width;
  output.height = source.height;
  const context = output.getContext("2d", { willReadFrequently: true });
  if (!context) {
    return source;
  }
  context.drawImage(source, 0, 0);
  const imageData = context.getImageData(0, 0, output.width, output.height);
  const pixels = imageData.data;
  const grays = new Float32Array(output.width * output.height);

  let sum = 0;
  for (let index = 0; index < output.width * output.height; index += 1) {
    const offset = index * 4;
    const gray =
      0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2];
    grays[index] = gray;
    sum += gray;
  }
  const mean = sum / grays.length;

  let min = 255;
  let max = 0;
  for (const gray of grays) {
    min = Math.min(min, gray);
    max = Math.max(max, gray);
  }
  const range = Math.max(max - min, 1);

  for (let index = 0; index < grays.length; index += 1) {
    let gray = grays[index];
    if (preset === "dark" || (preset === "automatic" && mean < 128)) {
      gray = 255 - gray;
    }
    if (preset === "clean") {
      gray = gray;
    } else if (preset === "scanned") {
      gray = gray >= mean ? 255 : 0;
    } else {
      const stretched = ((gray - min) / range) * 255;
      gray = Math.max(0, Math.min(255, stretched));
    }
    const offset = index * 4;
    pixels[offset] = gray;
    pixels[offset + 1] = gray;
    pixels[offset + 2] = gray;
    pixels[offset + 3] = 255;
  }

  context.putImageData(imageData, 0, 0);
  return output;
}
