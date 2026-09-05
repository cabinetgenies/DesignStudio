import { runWallDetection } from "./wall-detect";

const context = self as unknown as {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: unknown) => void;
};

context.onmessage = (event: MessageEvent) => {
  try {
    const result = runWallDetection(event.data);
    context.postMessage(result);
  } catch (error) {
    context.postMessage({
      error: error instanceof Error ? error.message : "Wall detection failed.",
    });
  }
};
