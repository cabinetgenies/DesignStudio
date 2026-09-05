import type { WallDetectionAnalysis } from "./wall-detection";
import type { WallDetectionInput } from "./wall-detect";

let activeWorker: Worker | null = null;

export function detectWallsInWorker(
  input: WallDetectionInput,
): Promise<WallDetectionAnalysis> {
  return new Promise((resolve, reject) => {
    if (activeWorker) {
      activeWorker.terminate();
    }
    const worker = new Worker(
      new URL("./wall-detect.worker.ts", import.meta.url),
    );
    activeWorker = worker;
    worker.onmessage = (event) => {
      if (event.data?.error) {
        reject(new Error(event.data.error));
      } else {
        resolve(event.data as WallDetectionAnalysis);
      }
      if (activeWorker === worker) {
        activeWorker = null;
      }
    };
    worker.onerror = (event) => {
      reject(new Error(event.message || "Wall detection worker failed."));
      if (activeWorker === worker) {
        activeWorker = null;
      }
    };
    worker.postMessage(input, [input.raster.pixels.buffer]);
  });
}

export function cancelWallDetectionWorker(): void {
  if (activeWorker) {
    activeWorker.terminate();
    activeWorker = null;
  }
}
