import { createWorker, type Worker } from "tesseract.js";

export type OcrProgress = {
  progress: number;
  status: string;
};

export interface OcrWordResult {
  text: string;
  confidence: number;
  bbox: { x0: number; y0: number; x1: number; y1: number };
}

export class OcrCancelledError extends Error {
  constructor() {
    super("OCR cancelled");
    this.name = "OcrCancelledError";
  }
}

let workerPromise: Promise<Worker> | null = null;
let currentWorker: Worker | null = null;
let activeProgress: ((progress: OcrProgress) => void) | null = null;

async function getWorker(onProgress: (progress: OcrProgress) => void) {
  if (workerPromise) {
    return workerPromise;
  }
  activeProgress = onProgress;
  workerPromise = createWorker("eng", 1, {
    logger: (message) => {
      activeProgress?.({
        progress: message.progress ?? 0,
        status: message.status,
      });
    },
  })
    .then((worker) => {
      currentWorker = worker;
      return worker;
    })
    .catch((error) => {
      workerPromise = null;
      currentWorker = null;
      throw error;
    });
  return workerPromise;
}

export async function runTesseractOcr(
  image: HTMLCanvasElement,
  onProgress: (progress: OcrProgress) => void,
  isCancelled: () => boolean,
): Promise<{ text: string; words: OcrWordResult[] }> {
  activeProgress = onProgress;
  if (isCancelled()) {
    throw new OcrCancelledError();
  }
  try {
    const worker = await getWorker(onProgress);
    if (isCancelled()) {
      throw new OcrCancelledError();
    }
    const result = await worker.recognize(
      image,
      {},
      { text: true, blocks: true },
    );
    if (isCancelled()) {
      throw new OcrCancelledError();
    }
    const words: OcrWordResult[] = [];
    for (const block of result.data.blocks ?? []) {
      for (const paragraph of block.paragraphs) {
        for (const line of paragraph.lines) {
          for (const word of line.words) {
            words.push({
              text: word.text,
              confidence: word.confidence,
              bbox: {
                x0: word.bbox.x0,
                y0: word.bbox.y0,
                x1: word.bbox.x1,
                y1: word.bbox.y1,
              },
            });
          }
        }
      }
    }
    return { text: result.data.text ?? "", words };
  } catch (error) {
    if (isCancelled() || error instanceof OcrCancelledError) {
      throw new OcrCancelledError();
    }
    // Reset the worker so a future run recreates it cleanly.
    workerPromise = null;
    currentWorker = null;
    throw error;
  }
}

export async function terminateOcrWorker(): Promise<void> {
  const worker = currentWorker;
  currentWorker = null;
  workerPromise = null;
  activeProgress = null;
  if (worker) {
    try {
      await worker.terminate();
    } catch {
      // Ignore termination failures.
    }
  }
}

export function isOcrWorkerActive(): boolean {
  return Boolean(workerPromise || currentWorker);
}
