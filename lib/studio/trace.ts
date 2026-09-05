export interface TracePoint {
  id: string;
  x: number;
  y: number;
}

export interface TracedWall {
  id: string;
  startPointId: string;
  endPointId: string;
  height: number;
  thickness: number;
}

export interface TracedOpening {
  id: string;
  wallId: string;
  type: "door" | "window" | "passage";
  name?: string;
  offset: number;
  width: number;
  height: number;
  sillHeight: number;
}

export interface PlanTrace {
  pageNumber: number;
  calibrationId: string;
  pageWidthPt: number;
  pageHeightPt: number;
  pageRotation: number;
  points: Record<string, TracePoint>;
  walls: Record<string, TracedWall>;
  openings: Record<string, TracedOpening>;
  closed: boolean;
  confirmed: boolean;
}

export type TraceInteractionMode =
  | "select"
  | "draw-wall"
  | "join-points"
  | "review-wall-detection"
  | "review-opening-detection";

export type TraceDragKind = "point" | "wall" | "opening";

export function emptyTrace(
  pageNumber: number,
  calibrationId: string,
  pageWidthPt = 0,
  pageHeightPt = 0,
  pageRotation = 0,
): PlanTrace {
  return {
    pageNumber,
    calibrationId,
    pageWidthPt,
    pageHeightPt,
    pageRotation,
    points: {},
    walls: {},
    openings: {},
    closed: false,
    confirmed: false,
  };
}

export function traceWallLengthPx(
  trace: PlanTrace,
  wall: TracedWall,
): number {
  const start = trace.points[wall.startPointId];
  const end = trace.points[wall.endPointId];
  if (!start || !end) {
    return 0;
  }
  return Math.hypot(end.x - start.x, end.y - start.y);
}

export function pointConnectedWalls(
  trace: PlanTrace,
  pointId: string,
): TracedWall[] {
  return Object.values(trace.walls).filter(
    (wall) => wall.startPointId === pointId || wall.endPointId === pointId,
  );
}

export function isPerimeterClosed(trace: PlanTrace): boolean {
  return trace.closed && Object.keys(trace.walls).length >= 3;
}

export function movePoint(
  trace: PlanTrace,
  pointId: string,
  position: { x: number; y: number },
): PlanTrace {
  const point = trace.points[pointId];
  if (!point) {
    return trace;
  }
  return {
    ...trace,
    points: { ...trace.points, [pointId]: { ...point, ...position } },
  };
}

export function moveWall(
  trace: PlanTrace,
  wallId: string,
  delta: { x: number; y: number },
): PlanTrace {
  const wall = trace.walls[wallId];
  if (!wall) {
    return trace;
  }
  let next = trace;
  for (const pointId of [wall.startPointId, wall.endPointId]) {
    const point = next.points[pointId];
    if (point) {
      next = movePoint(next, pointId, {
        x: point.x + delta.x,
        y: point.y + delta.y,
      });
    }
  }
  return next;
}

export function separateWallEndpoint(
  trace: PlanTrace,
  wallId: string,
  endpoint: "start" | "end",
  newPointId?: string,
): PlanTrace {
  const wall = trace.walls[wallId];
  if (!wall) {
    return trace;
  }
  const sourceId = endpoint === "start" ? wall.startPointId : wall.endPointId;
  const source = trace.points[sourceId];
  if (!source) {
    return trace;
  }
  const newId = newPointId ?? `p-sep-${wall.id}-${endpoint}`;
  return {
    ...trace,
    points: { ...trace.points, [newId]: { id: newId, x: source.x, y: source.y } },
    walls: {
      ...trace.walls,
      [wallId]: {
        ...wall,
        [endpoint === "start" ? "startPointId" : "endPointId"]: newId,
      },
    },
  };
}

export function deleteWall(trace: PlanTrace, wallId: string): PlanTrace {
  const wall = trace.walls[wallId];
  if (!wall) {
    return trace;
  }
  const walls = { ...trace.walls };
  delete walls[wallId];

  const referenced = new Set<string>();
  for (const w of Object.values(walls)) {
    referenced.add(w.startPointId);
    referenced.add(w.endPointId);
  }
  const points: Record<string, TracePoint> = {};
  for (const [id, point] of Object.entries(trace.points)) {
    if (referenced.has(id)) {
      points[id] = point;
    }
  }
  return {
    ...trace,
    walls,
    points,
    openings: Object.fromEntries(
      Object.entries(trace.openings).filter(([, opening]) => opening.wallId !== wallId),
    ),
    closed: false,
  };
}

export function reverseWall(trace: PlanTrace, wallId: string): PlanTrace {
  const wall = trace.walls[wallId];
  if (!wall) {
    return trace;
  }
  const length = traceWallLengthPx(trace, wall);
  const openings = Object.fromEntries(
    Object.entries(trace.openings).map(([id, opening]) => [
      id,
      opening.wallId === wallId
        ? {
            ...opening,
            offset: length - opening.offset - opening.width,
          }
        : opening,
    ]),
  );
  return {
    ...trace,
    walls: {
      ...trace.walls,
      [wallId]: {
        ...wall,
        startPointId: wall.endPointId,
        endPointId: wall.startPointId,
      },
    },
    openings,
  };
}

export function splitWallAtDistance(
  trace: PlanTrace,
  wallId: string,
  distance: number,
): PlanTrace | null {
  const wall = trace.walls[wallId];
  const start = wall && trace.points[wall.startPointId];
  const end = wall && trace.points[wall.endPointId];
  if (!wall || !start || !end) {
    return null;
  }
  const length = traceWallLengthPx(trace, wall);
  const t = Math.min(Math.max(distance / length, 0.05), 0.95);
  const mid = {
    x: start.x + (end.x - start.x) * t,
    y: start.y + (end.y - start.y) * t,
  };
  const newPointId = `p-split-${wall.id}`;
  const secondWallId = `w-split-${wall.id}`;
  const openings = Object.fromEntries(
    Object.entries(trace.openings).map(([id, opening]) => {
      if (opening.wallId !== wallId) {
        return [id, opening];
      }
      if (opening.offset + opening.width <= distance) {
        return [id, opening];
      }
      if (opening.offset >= distance) {
        return [
          id,
          { ...opening, wallId: secondWallId, offset: opening.offset - distance },
        ];
      }
      return [
        id,
        {
          ...opening,
          wallId: opening.offset + opening.width / 2 < distance ? wallId : secondWallId,
          offset:
            opening.offset + opening.width / 2 < distance
              ? opening.offset
              : opening.offset - distance,
        },
      ];
    }),
  );
  return {
    ...trace,
    points: { ...trace.points, [newPointId]: { id: newPointId, ...mid } },
    walls: {
      ...trace.walls,
      [wallId]: { ...wall, endPointId: newPointId },
      [secondWallId]: {
        id: secondWallId,
        startPointId: newPointId,
        endPointId: wall.endPointId,
        height: wall.height,
        thickness: wall.thickness,
      },
    },
    openings,
  };
}

export function setWallLength(
  trace: PlanTrace,
  wallId: string,
  length: number,
): PlanTrace | null {
  const wall = trace.walls[wallId];
  const start = wall && trace.points[wall.startPointId];
  const end = wall && trace.points[wall.endPointId];
  if (!wall || !start || !end || length <= 0) {
    return null;
  }
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const current = Math.hypot(dx, dy);
  if (current < 1e-6) {
    return null;
  }
  const scale = length / current;
  const newEnd = {
    x: start.x + dx * scale,
    y: start.y + dy * scale,
  };
  return {
    ...trace,
    points: { ...trace.points, [wall.endPointId]: { ...end, ...newEnd } },
  };
}

export function joinPoints(
  trace: PlanTrace,
  keepId: string,
  removeId: string,
): PlanTrace | null {
  if (joinPointsError(trace, keepId, removeId)) {
    return null;
  }
  const keep = trace.points[keepId];
  const remove = trace.points[removeId];
  if (!keep || !remove) {
    return null;
  }
  const walls = Object.fromEntries(
    Object.entries(trace.walls).map(([id, wall]) => [
      id,
      {
        ...wall,
        startPointId: wall.startPointId === removeId ? keepId : wall.startPointId,
        endPointId: wall.endPointId === removeId ? keepId : wall.endPointId,
      },
    ]),
  );
  const points = { ...trace.points };
  delete points[removeId];
  return { ...trace, points, walls };
}

export function joinPointsError(
  trace: PlanTrace,
  keepId: string,
  removeId: string,
): string | null {
  if (keepId === removeId) {
    return "A point cannot be joined to itself.";
  }
  const keep = trace.points[keepId];
  const remove = trace.points[removeId];
  if (!keep || !remove) {
    return "One of the selected points no longer exists.";
  }

  const rewired = new Set<string>();
  for (const wall of Object.values(trace.walls)) {
    let start = wall.startPointId;
    let end = wall.endPointId;
    if (start === removeId) {
      start = keepId;
    }
    if (end === removeId) {
      end = keepId;
    }
    if (start === end) {
      return "Joining these points would create a zero-length wall.";
    }
    const key = [start, end].sort().join("::");
    if (rewired.has(key)) {
      return "Joining these points would create duplicate walls.";
    }
    rewired.add(key);
  }
  return null;
}

export function joinCompatibleTargets(
  trace: PlanTrace,
  sourceId: string,
): string[] {
  const source = trace.points[sourceId];
  if (!source) {
    return [];
  }
  return Object.values(trace.points)
    .filter(
      (point) =>
        point.id !== sourceId && !joinPointsError(trace, sourceId, point.id),
    )
    .map((point) => point.id);
}

export function addOpeningAtWall(
  trace: PlanTrace,
  wallId: string,
  opening: TracedOpening,
): PlanTrace {
  const wall = trace.walls[wallId];
  if (!wall) {
    return trace;
  }
  const length = traceWallLengthPx(trace, wall);
  const clamped: TracedOpening = {
    ...opening,
    offset: Math.min(Math.max(opening.offset, 0), Math.max(length - opening.width, 0)),
    width: Math.min(opening.width, length),
  };
  return {
    ...trace,
    openings: { ...trace.openings, [clamped.id]: clamped },
  };
}

export function updateOpening(
  trace: PlanTrace,
  opening: TracedOpening,
): PlanTrace {
  const wall = trace.walls[opening.wallId];
  if (!wall) {
    return trace;
  }
  const length = traceWallLengthPx(trace, wall);
  const clamped: TracedOpening = {
    ...opening,
    width: Math.min(Math.max(opening.width, 0), length),
    offset: Math.min(Math.max(opening.offset, 0), Math.max(length - opening.width, 0)),
  };
  return {
    ...trace,
    openings: { ...trace.openings, [clamped.id]: clamped },
  };
}

export function duplicateOpening(
  trace: PlanTrace,
  openingId: string,
  newId: string,
): PlanTrace {
  const opening = trace.openings[openingId];
  if (!opening) {
    return trace;
  }
  const wall = trace.walls[opening.wallId];
  const length = wall ? traceWallLengthPx(trace, wall) : 0;
  const copy: TracedOpening = {
    ...opening,
    id: newId,
    offset: Math.min(opening.offset + opening.width + 0.2, Math.max(length - opening.width, 0)),
  };
  return { ...trace, openings: { ...trace.openings, [newId]: copy } };
}

export function deleteOpening(trace: PlanTrace, openingId: string): PlanTrace {
  const openings = { ...trace.openings };
  delete openings[openingId];
  return { ...trace, openings };
}

export type OpeningPlacementStatus = "valid" | "warning" | "invalid";

export interface OpeningPlacementResult {
  status: OpeningPlacementStatus;
  reason: string | null;
}

export function evaluateOpeningPlacement(
  trace: PlanTrace,
  opening: TracedOpening,
): OpeningPlacementResult {
  const wall = trace.walls[opening.wallId];
  if (!wall) {
    return { status: "invalid", reason: "Missing parent wall" };
  }
  const length = traceWallLengthPx(trace, wall);
  if (
    !Number.isFinite(opening.width) ||
    !Number.isFinite(opening.offset) ||
    !Number.isFinite(opening.height) ||
    !Number.isFinite(opening.sillHeight)
  ) {
    return { status: "invalid", reason: "Non-finite dimensions" };
  }
  if (opening.width <= 0) {
    return { status: "invalid", reason: "Non-positive width" };
  }
  if (opening.height <= 0) {
    return { status: "invalid", reason: "Non-positive height" };
  }
  if (opening.sillHeight < 0) {
    return { status: "invalid", reason: "Negative sill" };
  }
  if (opening.sillHeight + opening.height > wall.height) {
    return { status: "invalid", reason: "Opening height exceeds wall" };
  }
  if (opening.offset < 0 || opening.offset + opening.width > length) {
    return { status: "invalid", reason: "Opening exceeds wall" };
  }
  for (const other of Object.values(trace.openings)) {
    if (other.id === opening.id || other.wallId !== opening.wallId) {
      continue;
    }
    const overlap =
      Math.min(opening.offset + opening.width, other.offset + other.width) -
      Math.max(opening.offset, other.offset);
    if (overlap > 1) {
      return { status: "invalid", reason: "Overlaps existing opening" };
    }
  }
  const minEndpoint = 12;
  if (
    opening.offset < minEndpoint ||
    length - (opening.offset + opening.width) < minEndpoint
  ) {
    return { status: "warning", reason: "Too close to wall end" };
  }
  if (
    (opening.type === "door" || opening.type === "passage") &&
    opening.sillHeight > 0
  ) {
    return { status: "warning", reason: "Nonzero sill on door or passage" };
  }
  return { status: "valid", reason: null };
}

export function openingPlacementStatus(
  trace: PlanTrace,
  opening: TracedOpening,
): OpeningPlacementStatus {
  return evaluateOpeningPlacement(trace, opening).status;
}
