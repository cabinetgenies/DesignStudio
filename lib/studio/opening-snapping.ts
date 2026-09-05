import { traceWallLengthPx, type PlanTrace } from "./trace";

export interface OpeningSnapInput {
  trace: PlanTrace;
  wallId: string;
  centerPx: number;
  widthPx: number;
  tolerancePx: number;
  gridPx: number;
}

export interface OpeningSnapResult {
  offset: number;
  label: string | null;
  snapped: boolean;
}

interface OpeningSnapCandidate {
  offset: number;
  label: string;
  priority: number;
}

export function snapOpeningOffset(
  input: OpeningSnapInput,
): OpeningSnapResult {
  const { trace, wallId, centerPx, widthPx, tolerancePx, gridPx } = input;
  const wall = trace.walls[wallId];
  if (!wall) {
    return { offset: 0, label: null, snapped: false };
  }
  const length = traceWallLengthPx(trace, wall);
  const usable = Math.max(length - widthPx, 0);
  const clampedCenter = Math.min(
    Math.max(centerPx, widthPx / 2),
    widthPx / 2 + usable,
  );
  const currentOffset = clampedCenter - widthPx / 2;

  const candidates: OpeningSnapCandidate[] = [
    { offset: length / 2 - widthPx / 2, label: "Wall midpoint", priority: 2 },
    { offset: 0, label: "Wall start", priority: 3 },
    { offset: usable, label: "Wall end", priority: 3 },
  ];

  for (const other of Object.values(trace.openings)) {
    if (other.wallId !== wallId) {
      continue;
    }
    candidates.push(
      { offset: other.offset + other.width, label: "Opening edge", priority: 0 },
      { offset: other.offset - widthPx, label: "Opening edge", priority: 0 },
      { offset: other.offset, label: "Opening edge", priority: 0 },
      {
        offset: other.offset + other.width - widthPx,
        label: "Opening edge",
        priority: 0,
      },
      {
        offset: other.offset + other.width / 2 - widthPx / 2,
        label: "Opening center",
        priority: 1,
      },
    );
  }

  if (gridPx > 0) {
    const gridCenter = Math.round(clampedCenter / gridPx) * gridPx;
    candidates.push({
      offset: gridCenter - widthPx / 2,
      label: "Grid",
      priority: 4,
    });
  }

  let best: OpeningSnapCandidate | null = null;
  let bestDistance = tolerancePx;
  for (const candidate of candidates) {
    const candidateOffset = Math.min(Math.max(candidate.offset, 0), usable);
    const distance = Math.abs(candidateOffset - currentOffset);
    if (distance > bestDistance) {
      continue;
    }
    const isBetter =
      best === null ||
      distance < bestDistance - 1e-6 ||
      (Math.abs(distance - bestDistance) <= 1e-6 &&
        candidate.priority < best.priority);
    if (isBetter) {
      best = candidate;
      bestDistance = distance;
    }
  }

  if (best) {
    return {
      offset: Math.min(Math.max(best.offset, 0), usable),
      label: best.label,
      snapped: true,
    };
  }
  return { offset: currentOffset, label: null, snapped: false };
}
