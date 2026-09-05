export interface PlanViewport {
  zoom: number;
  panX: number;
  panY: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface ContainerRect {
  left: number;
  top: number;
}

function normalizeRotation(rotation: number): number {
  return ((rotation % 360) + 360) % 360;
}

export function canonicalToRotated(
  point: Point,
  widthPt: number,
  heightPt: number,
  rotation: number,
): Point {
  switch (normalizeRotation(rotation)) {
    case 0:
      return { x: point.x, y: point.y };
    case 90:
      return { x: heightPt - point.y, y: point.x };
    case 180:
      return { x: widthPt - point.x, y: heightPt - point.y };
    case 270:
      return { x: point.y, y: widthPt - point.x };
    default:
      return { x: point.x, y: point.y };
  }
}

export function rotatedToCanonical(
  point: Point,
  widthPt: number,
  heightPt: number,
  rotation: number,
): Point {
  switch (normalizeRotation(rotation)) {
    case 0:
      return { x: point.x, y: point.y };
    case 90:
      return { x: point.y, y: heightPt - point.x };
    case 180:
      return { x: widthPt - point.x, y: heightPt - point.y };
    case 270:
      return { x: widthPt - point.y, y: point.x };
    default:
      return { x: point.x, y: point.y };
  }
}

export function screenToCanonical(
  screen: Point,
  rect: ContainerRect,
  viewport: PlanViewport,
  renderScale: number,
  widthPt: number,
  heightPt: number,
  rotation: number,
): Point {
  const workspace = screenToWorkspace(screen, rect, viewport);
  const rotated = {
    x: workspace.x / renderScale,
    y: workspace.y / renderScale,
  };
  return rotatedToCanonical(rotated, widthPt, heightPt, rotation);
}

export function screenToWorkspace(
  screen: Point,
  rect: ContainerRect,
  viewport: PlanViewport,
): Point {
  return {
    x: (screen.x - rect.left - viewport.panX) / viewport.zoom,
    y: (screen.y - rect.top - viewport.panY) / viewport.zoom,
  };
}

export function canonicalToWorkspace(
  canonical: Point,
  widthPt: number,
  heightPt: number,
  rotation: number,
  renderScale: number,
): Point {
  const rotated = canonicalToRotated(canonical, widthPt, heightPt, rotation);
  return { x: rotated.x * renderScale, y: rotated.y * renderScale };
}

export function canonicalToUnderlayMeters(
  canonical: Point,
  widthPt: number,
  heightPt: number,
  rotation: number,
  pixelsPerMeter: number,
  renderScale: number,
): { x: number; z: number } {
  const rotated = canonicalToRotated(canonical, widthPt, heightPt, rotation);
  return {
    x: (rotated.x * renderScale) / pixelsPerMeter,
    z: (rotated.y * renderScale) / pixelsPerMeter,
  };
}
