"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  getPageMeta,
  renderPage,
  type PageMeta,
  type PdfDocument,
} from "@/lib/studio/pdf";
import {
  DEFAULT_UNDERLAY_ALIGNMENT,
  type PlanCalibration,
  type PlanState,
  type PlanUnderlayAlignment,
} from "@/lib/studio/plan";
import {
  evaluateOpeningPlacement,
  movePoint,
  pointConnectedWalls,
  separateWallEndpoint,
  updateOpening,
  type PlanTrace,
  type TraceDragKind,
  type TraceInteractionMode,
  type TracedOpening,
} from "@/lib/studio/trace";
import { snapOpeningOffset } from "@/lib/studio/opening-snapping";
import type {
  DimensionCandidate,
  PlanAnalysis,
} from "@/lib/studio/plan-analysis";
import type {
  DetectedWallCandidate,
  WallDetectionAnalysis,
} from "@/lib/studio/wall-detection";
import type {
  DetectedOpeningCandidate,
  OpeningDetectionAnalysis,
} from "@/lib/studio/opening-detection";
import {
  canonicalToWorkspace,
  screenToCanonical,
  type PlanViewport,
} from "@/lib/studio/plan-coordinates";
import {
  DEFAULT_TRACE_SNAP_SETTINGS,
  snapTracePoint,
  type TraceSnapResult,
} from "@/lib/studio/trace-snapping";
import TraceSnapGuides from "./TraceSnapGuides";
import {
  feetToMeters,
  inchesToMeters,
  metersToFeet,
} from "@/lib/studio/transforms";

const RENDER_SCALE = 2.5;

function distToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    return Math.hypot(p.x - a.x, p.y - a.y);
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

function projectToSegment(
  p: { x: number; y: number },
  a: { x: number; y: number },
  b: { x: number; y: number },
): { t: number; x: number; y: number; distance: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) {
    return {
      t: 0,
      x: a.x,
      y: a.y,
      distance: Math.hypot(p.x - a.x, p.y - a.y),
    };
  }
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + dx * t;
  const y = a.y + dy * t;
  return { t, x, y, distance: Math.hypot(p.x - x, p.y - y) };
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

interface PlanWorkspaceProps {
  plan: PlanState;
  document: PdfDocument | null;
  loading: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  onSelectPage: (page: number) => void;
  onCalibration: (calibration: PlanCalibration) => void;
  onClearCalibration: () => void;
  onUnderlay: (patch: Partial<PlanUnderlayAlignment>) => void;
  onResetUnderlay: () => void;
  trace: PlanTrace | null;
  traceMode: TraceInteractionMode | null;
  onTraceClick: (point: { x: number; y: number }) => void;
  onTraceFinish: () => void;
  onTraceBackspace: () => void;
  onClearTrace: () => void;
  onSetTraceMode: (mode: TraceInteractionMode | null) => void;
  onSelectPoint: (id: string | null) => void;
  onSelectWall: (id: string | null) => void;
  onSelectOpening: (id: string | null) => void;
  selectedOpeningId: string | null;
  onAddOpening: (
    type: "door" | "window" | "passage",
    wallId: string,
    offsetPx: number,
  ) => void;
  selectedWallId: string | null;
  joinSourcePointId: string | null;
  joinTargetIds: string[];
  joinError: string | null;
  onJoinPoint: (pointId: string) => void;
  onCancelJoin: () => void;
  openingDefaults: Record<
    "door" | "window" | "passage",
    { widthM: number; heightM: number; sillM: number }
  >;
  onTraceDragStart: () => void;
  onTracePreview: (trace: PlanTrace) => void;
  onTraceCommit: () => void;
  onTraceCancel: () => void;
  activeTracePointId: string | null;
  firstTracePointId: string | null;
  analysis: PlanAnalysis | null;
  analysisVisible: boolean;
  analysisCandidates: DimensionCandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string | null) => void;
  onRegisterLocate: (fn: ((id: string) => void) | null) => void;
  assistedCalibration: { candidateId: string; meters: number } | null;
  onAssistedCalibrationComplete: (
    candidateId: string,
    pointA: { x: number; y: number },
    pointB: { x: number; y: number },
    pixels: number,
  ) => void;
  ocrRegionSelecting: boolean;
  onOcrRegionSelected: (crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  wallDetection: WallDetectionAnalysis | null;
  showRawLines: boolean;
  showCleanedLines: boolean;
  showWallCandidates: boolean;
  selectedWallCandidateId: string | null;
  onSelectWallCandidate: (id: string | null) => void;
  wallDragPreview: DetectedWallCandidate | null;
  onWallDragStart: () => void;
  onWallDragPreview: (candidate: DetectedWallCandidate) => void;
  onWallDragCommit: () => void;
  onWallDragCancel: () => void;
  openingDetection: OpeningDetectionAnalysis | null;
  selectedOpeningCandidateId: string | null;
  showOpeningDetectionOverlay: boolean;
  onSelectOpeningCandidate: (id: string | null) => void;
}

function Thumb({
  document,
  pageNumber,
  active,
  onSelect,
}: {
  document: PdfDocument;
  pageNumber: number;
  active: boolean;
  onSelect: () => void;
}) {
  const [entry, setEntry] = useState<{
    key: number;
    url: string | null;
    failed: boolean;
  }>({ key: 0, url: null, failed: false });
  const current = entry.key === pageNumber;
  const url = current ? entry.url : null;
  const failed = current ? entry.failed : false;

  useEffect(() => {
    let cancelled = false;
    renderPage(document, pageNumber, 0.35, 0)
      .then(({ canvas }) => {
        if (!cancelled) {
          setEntry({
            key: pageNumber,
            url: canvas.toDataURL("image/png"),
            failed: false,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEntry({ key: pageNumber, url: null, failed: true });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [document, pageNumber]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`shrink-0 overflow-hidden rounded-md border ${
        active ? "border-zinc-900 ring-2 ring-zinc-300" : "border-zinc-200"
      }`}
    >
      {failed ? (
        <div className="flex h-24 w-20 items-center justify-center text-xs text-red-500">
          Failed
        </div>
      ) : url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt={`Page ${pageNumber}`} className="block h-24 w-auto" />
      ) : (
        <div className="flex h-24 w-20 items-center justify-center text-xs text-zinc-400">
          …
        </div>
      )}
      <div className="bg-zinc-50 py-1 text-center text-[11px] text-zinc-600">
        {pageNumber}
      </div>
    </button>
  );
}

export default function PlanWorkspace({
  plan,
  document,
  loading,
  error,
  onFile,
  onRemove,
  onSelectPage,
  onCalibration,
  onClearCalibration,
  onUnderlay,
  onResetUnderlay,
  trace,
  traceMode,
  onTraceClick,
  onTraceFinish,
  onTraceBackspace,
  onClearTrace,
  onSetTraceMode,
  onSelectPoint,
  onSelectWall,
  onSelectOpening,
  selectedOpeningId,
  onAddOpening,
  selectedWallId,
  joinSourcePointId,
  joinTargetIds,
  joinError,
  onJoinPoint,
  onCancelJoin,
  openingDefaults,
  onTraceDragStart,
  onTracePreview,
  onTraceCommit,
  onTraceCancel,
  activeTracePointId,
  firstTracePointId,
  analysis,
  analysisVisible,
  analysisCandidates,
  selectedCandidateId,
  onSelectCandidate,
  onRegisterLocate,
  assistedCalibration,
  onAssistedCalibrationComplete,
  ocrRegionSelecting,
  onOcrRegionSelected,
  wallDetection,
  showRawLines,
  showCleanedLines,
  showWallCandidates,
  selectedWallCandidateId,
  onSelectWallCandidate,
  wallDragPreview,
  onWallDragStart,
  onWallDragPreview,
  onWallDragCommit,
  onWallDragCancel,
  openingDetection,
  selectedOpeningCandidateId,
  showOpeningDetectionOverlay,
  onSelectOpeningCandidate,
}: PlanWorkspaceProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(
    null,
  );
  const traceDragRef = useRef<{
    kind: TraceDragKind;
    id: string;
    startClient: { x: number; y: number };
    sourceTrace: PlanTrace;
    separateWallId?: string;
    separateEndpoint?: "start" | "end";
    separatePointId?: string;
  } | null>(null);
  const traceMovedRef = useRef(false);
  const openingDragStatusRef = useRef<"valid" | "warning" | "invalid">("valid");
  const sepCounterRef = useRef(0);
  const [viewport, setViewport] = useState<PlanViewport>({
    zoom: 1,
    panX: 0,
    panY: 0,
  });
  const [renderEntry, setRenderEntry] = useState<{
    key: string;
    url: string | null;
    width: number;
    height: number;
  }>({ key: "", url: null, width: 0, height: 0 });
  const [pageMeta, setPageMeta] = useState<PageMeta | null>(null);
  const [calibrating, setCalibrating] = useState(false);
  const [pointA, setPointA] = useState<{ x: number; y: number } | null>(null);
  const [assistedPointA, setAssistedPointA] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [ocrRegionStart, setOcrRegionStart] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [ocrRegionCurrent, setOcrRegionCurrent] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const ocrRegionDragRef = useRef<{ start: { x: number; y: number } } | null>(
    null,
  );
  const wallDragRef = useRef<{
    kind: "start" | "end" | "body";
    candidateId: string;
    startClient: { x: number; y: number };
    source: DetectedWallCandidate;
  } | null>(null);
  const wallDragMovedRef = useRef(false);
  const [feet, setFeet] = useState("10");
  const [inches, setInches] = useState("0");
  const [snapResult, setSnapResult] = useState<TraceSnapResult | null>(null);
  const [hovered, setHovered] = useState<{
    kind: "point" | "wall" | "opening";
    id: string;
  } | null>(null);
  const [shiftHeld, setShiftHeld] = useState(false);
  const [status, setStatus] = useState("Select Trace");
  const [openingPlacementMode, setOpeningPlacementMode] = useState<
    "door" | "window" | "passage" | null
  >(null);
  const [openingHover, setOpeningHover] = useState<{
    wallId: string;
    offsetPx: number;
    x: number;
    y: number;
  } | null>(null);

  const openingMode = traceMode === "select" ? openingPlacementMode : null;

  const setOpeningMode = useCallback(
    (mode: "door" | "window" | "passage" | null) => {
      setOpeningPlacementMode(mode);
      setOpeningHover(null);
      setHovered(null);
      setSnapResult(null);
      setStatus(mode ? `Place ${capitalize(mode)}` : "Select Trace");
    },
    [],
  );

  const openingPreview = useMemo(() => {
    if (
      !openingMode ||
      !openingHover ||
      !trace ||
      !plan.calibration
    ) {
      return null;
    }
    const ppm = plan.calibration.pixelsPerMeter;
    const def = openingDefaults[openingMode];
    const wall = trace.walls[openingHover.wallId];
    const a = wall && trace.points[wall.startPointId];
    const b = wall && trace.points[wall.endPointId];
    if (!wall || !a || !b) {
      return null;
    }
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) {
      return null;
    }
    const widthPx = Math.min(def.widthM * ppm, length);
    const tolerancePx = 16 / Math.max(viewport.zoom, 0.01);
    const snap = snapOpeningOffset({
      trace,
      wallId: openingHover.wallId,
      centerPx: openingHover.offsetPx,
      widthPx,
      tolerancePx,
      gridPx: ppm * 0.1524,
    });
    const offset = Math.min(
      Math.max(snap.offset, 0),
      Math.max(length - widthPx, 0),
    );
    const candidate: TracedOpening = {
      id: "__preview__",
      wallId: wall.id,
      type: openingMode,
      offset,
      width: widthPx,
      height: def.heightM,
      sillHeight: def.sillM,
    };
    const evaluation = evaluateOpeningPlacement(trace, candidate);
    return {
      candidate,
      status: evaluation.status,
      reason: evaluation.reason,
      snapLabel: snap.label,
      snapped: snap.snapped,
      length,
    };
  }, [
    openingMode,
    openingHover,
    trace,
    plan.calibration,
    openingDefaults,
    viewport.zoom,
  ]);

  const pointConnectionCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    if (trace) {
      for (const wall of Object.values(trace.walls)) {
        counts[wall.startPointId] = (counts[wall.startPointId] ?? 0) + 1;
        counts[wall.endPointId] = (counts[wall.endPointId] ?? 0) + 1;
      }
    }
    return counts;
  }, [trace]);

  const renderKey = document ? `${plan.selectedPage}:${plan.pageRotation}` : "";
  const render = renderEntry.key === renderKey ? renderEntry : null;

  useEffect(() => {
    if (!document) {
      return;
    }
    let cancelled = false;
    getPageMeta(document, plan.selectedPage)
      .then((meta) => {
        if (!cancelled) {
          setPageMeta(meta);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [document, plan.selectedPage]);

  useEffect(() => {
    if (!document || !renderKey) {
      return;
    }
    let cancelled = false;
    renderPage(document, plan.selectedPage, RENDER_SCALE, plan.pageRotation)
      .then(({ canvas, width, height }) => {
        if (!cancelled) {
          setRenderEntry({
            key: renderKey,
            url: canvas.toDataURL("image/png"),
            width,
            height,
          });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [document, renderKey, plan.selectedPage, plan.pageRotation]);

  const pages = useMemo(
    () =>
      document
        ? Array.from({ length: document.numPages }, (_, i) => i + 1)
        : [],
    [document],
  );

  useEffect(() => {
    onRegisterLocate((id: string) => {
      const candidate = analysis?.candidates.find((item) => item.id === id);
      if (!candidate || !render || !pageMeta) {
        return;
      }
      const topLeft = canonicalToWorkspace(
        { x: candidate.x, y: candidate.y },
        pageMeta.widthPt,
        pageMeta.heightPt,
        plan.pageRotation,
        RENDER_SCALE,
      );
      const bottomRight = canonicalToWorkspace(
        { x: candidate.x + candidate.width, y: candidate.y + candidate.height },
        pageMeta.widthPt,
        pageMeta.heightPt,
        plan.pageRotation,
        RENDER_SCALE,
      );
      const container = containerRef.current;
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const targetWidth = Math.max(bottomRight.x - topLeft.x, 24);
      const targetHeight = Math.max(bottomRight.y - topLeft.y, 24);
      const targetZoom = Math.min(
        6,
        Math.max(
          0.05,
          Math.min(rect.width / targetWidth, rect.height / targetHeight) * 0.7,
        ),
      );
      const centerX = (topLeft.x + bottomRight.x) / 2;
      const centerY = (topLeft.y + bottomRight.y) / 2;
      setViewport({
        zoom: targetZoom,
        panX: rect.width / 2 - centerX * targetZoom,
        panY: rect.height / 2 - centerY * targetZoom,
      });
    });
    return () => onRegisterLocate(null);
  }, [onRegisterLocate, analysis, render, pageMeta, plan.pageRotation]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && traceDragRef.current) {
        traceDragRef.current = null;
        traceMovedRef.current = false;
        onTraceCancel();
      } else if (event.key === "Escape" && wallDragRef.current) {
        wallDragRef.current = null;
        wallDragMovedRef.current = false;
        onWallDragCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onTraceCancel, onWallDragCancel]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }
      let next: "door" | "window" | "passage" | null = null;
      if (event.key === "d" || event.key === "D") {
        next = openingPlacementMode === "door" ? null : "door";
      } else if (event.key === "n" || event.key === "N") {
        next = openingPlacementMode === "window" ? null : "window";
      } else if (event.key === "p" || event.key === "P") {
        next = openingPlacementMode === "passage" ? null : "passage";
      } else if (event.key === "Escape") {
        next = null;
      } else {
        return;
      }
      if (next) {
        onSetTraceMode("select");
      }
      setOpeningMode(next);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openingPlacementMode, setOpeningMode, onSetTraceMode]);

  useEffect(() => {
    function down(event: KeyboardEvent) {
      if (event.key === "Shift") {
        setShiftHeld(true);
      }
    }
    function up(event: KeyboardEvent) {
      if (event.key === "Shift") {
        setShiftHeld(false);
      }
    }
    function blur() {
      setShiftHeld(false);
    }
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  function fitPage() {
    const container = containerRef.current;
    if (!container || !render) {
      return;
    }
    const rect = container.getBoundingClientRect();
    const zoom = Math.min(
      rect.width / Math.max(render.width, 1),
      rect.height / Math.max(render.height, 1),
    ) * 0.9;
    setViewport({
      zoom,
      panX: (rect.width - render.width * zoom) / 2,
      panY: (rect.height - render.height * zoom) / 2,
    });
  }

  function changeTraceMode(mode: TraceInteractionMode | null) {
    setOpeningPlacementMode(null);
    setOpeningHover(null);
    setHovered(null);
    setSnapResult(null);
    setStatus(
      mode === "draw-wall"
        ? "Trace Walls"
        : mode === "join-points"
          ? "Select point to join"
          : "Select Trace",
    );
    onSetTraceMode(mode);
  }

  function openingWorkspace(opening: {
    wallId: string;
    offset: number;
    width: number;
  }) {
    if (!trace || !pageMeta) {
      return null;
    }
    const wall = trace.walls[opening.wallId];
    const a = wall && trace.points[wall.startPointId];
    const b = wall && trace.points[wall.endPointId];
    if (!a || !b) {
      return null;
    }
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) {
      return null;
    }
    const t0 = opening.offset / length;
    const t1 = (opening.offset + opening.width) / length;
    const start = {
      x: a.x + (b.x - a.x) * t0,
      y: a.y + (b.y - a.y) * t0,
    };
    const end = {
      x: a.x + (b.x - a.x) * t1,
      y: a.y + (b.y - a.y) * t1,
    };
    return {
      start: canonicalToWorkspace(
        start,
        pageMeta.widthPt,
        pageMeta.heightPt,
        plan.pageRotation,
        RENDER_SCALE,
      ),
      end: canonicalToWorkspace(
        end,
        pageMeta.widthPt,
        pageMeta.heightPt,
        plan.pageRotation,
        RENDER_SCALE,
      ),
    };
  }

  function openingCandidateGeometry(candidate: DetectedOpeningCandidate) {
    const detected = wallDetection?.candidates.find(
      (wall) => wall.id === candidate.parentWallId,
    );
    if (detected) {
      const x1 = detected.centerline.x1;
      const y1 = detected.centerline.y1;
      const x2 = detected.centerline.x2;
      const y2 = detected.centerline.y2;
      const length = Math.hypot(x2 - x1, y2 - y1);
      return {
        start: { x: x1, y: y1 },
        dx: (x2 - x1) / length,
        dy: (y2 - y1) / length,
        length,
      };
    }
    if (trace) {
      const wall = trace.walls[candidate.parentWallId];
      const a = wall && trace.points[wall.startPointId];
      const b = wall && trace.points[wall.endPointId];
      if (a && b) {
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        return { start: a, dx: (b.x - a.x) / length, dy: (b.y - a.y) / length, length };
      }
    }
    return null;
  }

  function actualSize() {
    if (!render) {
      return;
    }
    const zoom = 4 / 3 / RENDER_SCALE;
    const rect = containerRef.current?.getBoundingClientRect();
    setViewport({
      zoom,
      panX: rect ? (rect.width - render.width * zoom) / 2 : 0,
      panY: rect ? (rect.height - render.height * zoom) / 2 : 0,
    });
  }

  function handleWheel(event: ReactWheelEvent<HTMLDivElement>) {
    if (!render) {
      return;
    }
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
    const nextZoom = Math.min(6, Math.max(0.05, viewport.zoom * factor));
    const pointerX = event.clientX - rect.left;
    const pointerY = event.clientY - rect.top;
    const contentX = (pointerX - viewport.panX) / viewport.zoom;
    const contentY = (pointerY - viewport.panY) / viewport.zoom;
    setViewport({
      zoom: nextZoom,
      panX: pointerX - contentX * nextZoom,
      panY: pointerY - contentY * nextZoom,
    });
  }

  function handlePointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (ocrRegionSelecting) {
      const rect = event.currentTarget.getBoundingClientRect();
      const canonical = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      ocrRegionDragRef.current = { start: canonical };
      setOcrRegionStart(canonical);
      setOcrRegionCurrent(canonical);
      return;
    }
    if (assistedCalibration) {
      const rect = event.currentTarget.getBoundingClientRect();
      const canonical = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      if (!assistedPointA) {
        setAssistedPointA(canonical);
      } else {
        const pixels = Math.hypot(
          canonical.x - assistedPointA.x,
          canonical.y - assistedPointA.y,
        );
        if (pixels > 4) {
          onAssistedCalibrationComplete(
            assistedCalibration.candidateId,
            assistedPointA,
            canonical,
            pixels,
          );
        }
        setAssistedPointA(null);
      }
      return;
    }
    if (openingMode && trace) {
      if (openingHover && openingPreview?.status !== "invalid") {
        onAddOpening(
          openingMode,
          openingHover.wallId,
          openingHover.offsetPx,
        );
        setOpeningMode(null);
      }
      return;
    }
    if (traceMode === "draw-wall") {
      if (!trace) {
        return;
      }
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const snapResult = snapTracePoint({
        pointer,
        trace,
        activePointId: null,
        firstPointId: null,
        zoom: viewport.zoom,
        shift: event.shiftKey,
        settings: DEFAULT_TRACE_SNAP_SETTINGS,
      });
      onTraceClick(snapResult.point);
      return;
    }
    if (traceMode === "join-points" && trace) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const tolerance = 14 / Math.max(viewport.zoom, 0.01);
      let bestPointId: string | null = null;
      let bestDistance = tolerance;
      for (const point of Object.values(trace.points)) {
        const d = Math.hypot(point.x - pointer.x, point.y - pointer.y);
        if (d < bestDistance) {
          bestDistance = d;
          bestPointId = point.id;
        }
      }
      if (bestPointId) {
        onJoinPoint(bestPointId);
      } else {
        onCancelJoin();
      }
      return;
    }
    if (traceMode === "review-wall-detection") {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const selected =
        wallDetection?.candidates.find(
          (candidate) => candidate.id === selectedWallCandidateId,
        ) ?? null;
      const displayCandidate =
        wallDragPreview && wallDragPreview.id === selectedWallCandidateId
          ? wallDragPreview
          : selected;
      const handleTol = 12 / Math.max(viewport.zoom * RENDER_SCALE, 0.01);
      if (displayCandidate) {
        const start = {
          x: displayCandidate.centerline.x1,
          y: displayCandidate.centerline.y1,
        };
        const end = {
          x: displayCandidate.centerline.x2,
          y: displayCandidate.centerline.y2,
        };
        if (Math.hypot(pointer.x - start.x, pointer.y - start.y) < handleTol) {
          wallDragRef.current = {
            kind: "start",
            candidateId: displayCandidate.id,
            startClient: { x: event.clientX, y: event.clientY },
            source: selected ?? displayCandidate,
          };
          onWallDragStart();
          wallDragMovedRef.current = false;
          return;
        }
        if (Math.hypot(pointer.x - end.x, pointer.y - end.y) < handleTol) {
          wallDragRef.current = {
            kind: "end",
            candidateId: displayCandidate.id,
            startClient: { x: event.clientX, y: event.clientY },
            source: selected ?? displayCandidate,
          };
          onWallDragStart();
          wallDragMovedRef.current = false;
          return;
        }
        const bodyTol = 18 / Math.max(viewport.zoom * RENDER_SCALE, 0.01);
        if (distToSegment(pointer, start, end) < bodyTol) {
          wallDragRef.current = {
            kind: "body",
            candidateId: displayCandidate.id,
            startClient: { x: event.clientX, y: event.clientY },
            source: selected ?? displayCandidate,
          };
          onWallDragStart();
          wallDragMovedRef.current = false;
          return;
        }
      }
      const tolerance = 12 / Math.max(viewport.zoom, 0.01);
      if (showWallCandidates && wallDetection) {
        for (const candidate of wallDetection.candidates) {
          const a = { x: candidate.centerline.x1, y: candidate.centerline.y1 };
          const b = { x: candidate.centerline.x2, y: candidate.centerline.y2 };
          if (distToSegment(pointer, a, b) < tolerance) {
            onSelectWallCandidate(candidate.id);
            return;
          }
        }
      }
      onSelectWallCandidate(null);
    }
    if (traceMode === "review-opening-detection") {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const tolerance = 10 / Math.max(viewport.zoom * RENDER_SCALE, 0.01);
      if (showOpeningDetectionOverlay && openingDetection) {
        for (const candidate of openingDetection.candidates) {
          const geo = openingCandidateGeometry(candidate);
          if (!geo) continue;
          const sx = geo.start.x + geo.dx * candidate.offset;
          const sy = geo.start.y + geo.dy * candidate.offset;
          const ex = geo.start.x + geo.dx * (candidate.offset + candidate.width);
          const ey = geo.start.y + geo.dy * (candidate.offset + candidate.width);
          if (distToSegment(pointer, { x: sx, y: sy }, { x: ex, y: ey }) < tolerance) {
            onSelectOpeningCandidate(candidate.id);
            return;
          }
        }
      }
      onSelectOpeningCandidate(null);
    }
    if (traceMode === "select" && trace) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const tolerance = 12 / Math.max(viewport.zoom, 0.01);
      let bestPoint: { id: string; x: number; y: number } | null = null;
      let bestDistance = tolerance;
      for (const point of Object.values(trace.points)) {
        const d = Math.hypot(point.x - pointer.x, point.y - pointer.y);
        if (d < bestDistance) {
          bestDistance = d;
          bestPoint = point;
        }
      }
      if (bestPoint) {
        onSelectPoint(bestPoint.id);
        const connected = pointConnectedWalls(trace, bestPoint.id);
        const separate = event.altKey && connected.length > 1;
        const separateWall = separate
          ? (connected.find((wall) => wall.id === selectedWallId) ??
            connected[0])
          : null;
        const separateEndpoint =
          separateWall?.startPointId === bestPoint.id ? "start" : "end";
        traceDragRef.current = {
          kind: "point",
          id: bestPoint.id,
          startClient: { x: event.clientX, y: event.clientY },
          sourceTrace: trace,
          separateWallId: separateWall?.id,
          separateEndpoint: separateWall ? separateEndpoint : undefined,
          separatePointId: separateWall
            ? `p-sep-drag-${sepCounterRef.current + 1}`
            : undefined,
        };
        if (separateWall) {
          sepCounterRef.current += 1;
          setStatus("Separating endpoint");
        }
        onTraceDragStart();
        traceMovedRef.current = false;
        return;
      }
      for (const opening of Object.values(trace.openings)) {
        const wall = trace.walls[opening.wallId];
        const a = wall && trace.points[wall.startPointId];
        const b = wall && trace.points[wall.endPointId];
        if (!a || !b) {
          continue;
        }
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length === 0) {
          continue;
        }
        const t0 = opening.offset / length;
        const t1 = (opening.offset + opening.width) / length;
        const oa = {
          x: a.x + (b.x - a.x) * t0,
          y: a.y + (b.y - a.y) * t0,
        };
        const ob = {
          x: a.x + (b.x - a.x) * t1,
          y: a.y + (b.y - a.y) * t1,
        };
        if (distToSegment(pointer, oa, ob) < tolerance) {
          onSelectOpening(opening.id);
          traceDragRef.current = {
            kind: "opening",
            id: opening.id,
            startClient: { x: event.clientX, y: event.clientY },
            sourceTrace: trace,
          };
          onTraceDragStart();
          openingDragStatusRef.current = "valid";
          traceMovedRef.current = false;
          return;
        }
      }
      for (const wall of Object.values(trace.walls)) {
        const a = trace.points[wall.startPointId];
        const b = trace.points[wall.endPointId];
        if (!a || !b) {
          continue;
        }
        const d = distToSegment(pointer, a, b);
        if (d < tolerance) {
          onSelectWall(wall.id);
          traceDragRef.current = {
            kind: "wall",
            id: wall.id,
            startClient: { x: event.clientX, y: event.clientY },
            sourceTrace: trace,
          };
          onTraceDragStart();
          traceMovedRef.current = false;
          return;
        }
      }
      if (analysisVisible) {
        const analysisTolerance = 10 / Math.max(viewport.zoom, 0.01);
        for (const candidate of analysisCandidates) {
          const inX =
            pointer.x >= candidate.x - analysisTolerance &&
            pointer.x <= candidate.x + candidate.width + analysisTolerance;
          const inY =
            pointer.y >= candidate.y - analysisTolerance &&
            pointer.y <= candidate.y + candidate.height + analysisTolerance;
          if (inX && inY) {
            onSelectCandidate(candidate.id);
            onSelectPoint(null);
            onSelectWall(null);
            onSelectOpening(null);
            return;
          }
        }
      }
      onSelectPoint(null);
      onSelectWall(null);
      onSelectOpening(null);
      onSelectCandidate(null);
      onSelectWallCandidate(null);
    }
    if (calibrating) {
      const rect = event.currentTarget.getBoundingClientRect();
      const canonical = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      if (!pointA) {
        setPointA(canonical);
      } else {
        const dx = canonical.x - pointA.x;
        const dy = canonical.y - pointA.y;
        const pixels = Math.hypot(dx, dy);
        const meters =
          feetToMeters(Number.parseFloat(feet) || 0) +
          inchesToMeters(Number.parseFloat(inches) || 0);
        if (pixels > 4 && meters > 0) {
          onCalibration({
            pageNumber: plan.selectedPage,
            pointA,
            pointB: canonical,
            realDistanceMeters: meters,
            pixelsPerMeter: pixels / meters,
            confirmed: false,
          });
        }
        setPointA(null);
        setCalibrating(false);
      }
      return;
    }

    dragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      panX: viewport.panX,
      panY: viewport.panY,
    };
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (ocrRegionSelecting && ocrRegionDragRef.current) {
      const rect = event.currentTarget.getBoundingClientRect();
      const canonical = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      setOcrRegionCurrent(canonical);
      return;
    }
    if (wallDragRef.current) {
      const drag = wallDragRef.current;
      const rect = event.currentTarget.getBoundingClientRect();
      const current = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const start = screenToCanonical(
        { x: drag.startClient.x, y: drag.startClient.y },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const dx = current.x - start.x;
      const dy = current.y - start.y;
      const source = drag.source;
      let centerline: DetectedWallCandidate["centerline"];
      if (drag.kind === "body") {
        centerline = {
          x1: source.centerline.x1 + dx,
          y1: source.centerline.y1 + dy,
          x2: source.centerline.x2 + dx,
          y2: source.centerline.y2 + dy,
        };
      } else if (drag.kind === "start") {
        centerline = {
          x1: current.x,
          y1: current.y,
          x2: source.centerline.x2,
          y2: source.centerline.y2,
        };
      } else {
        centerline = {
          x1: source.centerline.x1,
          y1: source.centerline.y1,
          x2: current.x,
          y2: current.y,
        };
      }
      const lengthPx = Math.hypot(
        centerline.x2 - centerline.x1,
        centerline.y2 - centerline.y1,
      );
      const angleDeg =
        (Math.atan2(
          centerline.y2 - centerline.y1,
          centerline.x2 - centerline.x1,
        ) *
          180) /
        Math.PI;
      onWallDragPreview({
        ...source,
        centerline,
        lengthPx,
        angleDeg,
      });
      wallDragMovedRef.current = true;
      return;
    }
    if (openingMode && trace && pageMeta) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta.widthPt,
        pageMeta.heightPt,
        plan.pageRotation,
      );
      const tolerance = 16 / Math.max(viewport.zoom, 0.01);
      let best: {
        wallId: string;
        offsetPx: number;
        x: number;
        y: number;
        distance: number;
      } | null = null;
      for (const wall of Object.values(trace.walls)) {
        const a = trace.points[wall.startPointId];
        const b = trace.points[wall.endPointId];
        if (!a || !b) {
          continue;
        }
        const proj = projectToSegment(pointer, a, b);
        if (
          proj.distance < tolerance &&
          (!best || proj.distance < best.distance)
        ) {
          best = {
            wallId: wall.id,
            offsetPx: proj.t * Math.hypot(b.x - a.x, b.y - a.y),
            x: proj.x,
            y: proj.y,
            distance: proj.distance,
          };
        }
      }
      setOpeningHover(best);
      setStatus(best ? `Place ${capitalize(openingMode)}` : "Select a wall");
      return;
    }
    if (traceDragRef.current) {
      const drag = traceDragRef.current;
      const rect = event.currentTarget.getBoundingClientRect();
      const current = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      if (drag.kind === "point") {
        if (
          drag.separateWallId &&
          drag.separateEndpoint &&
          drag.separatePointId
        ) {
          const separated = separateWallEndpoint(
            drag.sourceTrace,
            drag.separateWallId,
            drag.separateEndpoint,
            drag.separatePointId,
          );
          onTracePreview(movePoint(separated, drag.separatePointId, current));
          setStatus("Separating endpoint");
        } else {
          onTracePreview(movePoint(drag.sourceTrace, drag.id, current));
        }
      } else if (drag.kind === "opening") {
        const opening = drag.sourceTrace.openings[drag.id];
        const wall = opening && drag.sourceTrace.walls[opening.wallId];
        const a = wall && drag.sourceTrace.points[wall.startPointId];
        const b = wall && drag.sourceTrace.points[wall.endPointId];
        if (opening && wall && a && b) {
          const proj = projectToSegment(current, a, b);
          const length = Math.hypot(b.x - a.x, b.y - a.y);
          const ppm = plan.calibration?.pixelsPerMeter ?? 1;
          const snap = snapOpeningOffset({
            trace: drag.sourceTrace,
            wallId: wall.id,
            centerPx: proj.t * length,
            widthPx: opening.width,
            tolerancePx: 16 / Math.max(viewport.zoom, 0.01),
            gridPx: ppm * 0.1524,
          });
          const offset = Math.min(
            Math.max(snap.offset, 0),
            Math.max(length - opening.width, 0),
          );
          const nextOpening = { ...opening, offset };
          const nextTrace = updateOpening(drag.sourceTrace, nextOpening);
          const evaluation = evaluateOpeningPlacement(nextTrace, nextOpening);
          openingDragStatusRef.current = evaluation.status;
          setStatus(
            evaluation.reason ??
              (snap.snapped && snap.label
                ? snap.label
                : evaluation.status === "invalid"
                  ? "Opening conflict"
                  : evaluation.status === "warning"
                    ? "Opening near wall end"
                    : "Move opening"),
          );
          onTracePreview(nextTrace);
        }
      } else {
        const start = screenToCanonical(
          { x: drag.startClient.x, y: drag.startClient.y },
          { left: rect.left, top: rect.top },
          viewport,
          RENDER_SCALE,
          pageMeta?.widthPt ?? 0,
          pageMeta?.heightPt ?? 0,
          plan.pageRotation,
        );
        const wall = drag.sourceTrace.walls[drag.id];
        const a = wall && drag.sourceTrace.points[wall.startPointId];
        const b = wall && drag.sourceTrace.points[wall.endPointId];
        if (wall && a && b) {
          const delta = { x: current.x - start.x, y: current.y - start.y };
          let next = movePoint(drag.sourceTrace, wall.startPointId, {
            x: a.x + delta.x,
            y: a.y + delta.y,
          });
          next = movePoint(next, wall.endPointId, {
            x: b.x + delta.x,
            y: b.y + delta.y,
          });
          onTracePreview(next);
        }
      }
      traceMovedRef.current = true;
      return;
    }
    if (traceMode === "draw-wall" && trace) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const result = snapTracePoint({
        pointer,
        trace,
        activePointId: activeTracePointId,
        firstPointId: firstTracePointId,
        zoom: viewport.zoom,
        shift: shiftHeld,
        settings: DEFAULT_TRACE_SNAP_SETTINGS,
      });
      setSnapResult(result);
      setStatus(
        shiftHeld
          ? `Angle constrained: ${DEFAULT_TRACE_SNAP_SETTINGS.angleIncrementDegrees}°`
          : result.type === "close"
            ? "Closing perimeter"
            : result.type
              ? `Snapped: ${capitalize(result.type)}`
              : "Trace Walls",
      );
      return;
    }
    if (traceMode === "select" && trace) {
      const rect = event.currentTarget.getBoundingClientRect();
      const pointer = screenToCanonical(
        { x: event.clientX, y: event.clientY },
        { left: rect.left, top: rect.top },
        viewport,
        RENDER_SCALE,
        pageMeta?.widthPt ?? 0,
        pageMeta?.heightPt ?? 0,
        plan.pageRotation,
      );
      const tolerance = 12 / Math.max(viewport.zoom, 0.01);
      let bestPoint: { id: string } | null = null;
      let bestDistance = tolerance;
      for (const point of Object.values(trace.points)) {
        const d = Math.hypot(point.x - pointer.x, point.y - pointer.y);
        if (d < bestDistance) {
          bestDistance = d;
          bestPoint = { id: point.id };
        }
      }
      if (bestPoint) {
        setHovered({ kind: "point", id: bestPoint.id });
        return;
      }
      for (const opening of Object.values(trace.openings)) {
        const wall = trace.walls[opening.wallId];
        const a = wall && trace.points[wall.startPointId];
        const b = wall && trace.points[wall.endPointId];
        if (!a || !b) {
          continue;
        }
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length === 0) {
          continue;
        }
        const t0 = opening.offset / length;
        const t1 = (opening.offset + opening.width) / length;
        const oa = {
          x: a.x + (b.x - a.x) * t0,
          y: a.y + (b.y - a.y) * t0,
        };
        const ob = {
          x: a.x + (b.x - a.x) * t1,
          y: a.y + (b.y - a.y) * t1,
        };
        if (distToSegment(pointer, oa, ob) < tolerance) {
          setHovered({ kind: "opening", id: opening.id });
          return;
        }
      }
      for (const wall of Object.values(trace.walls)) {
        const a = trace.points[wall.startPointId];
        const b = trace.points[wall.endPointId];
        if (a && b && distToSegment(pointer, a, b) < tolerance) {
          setHovered({ kind: "wall", id: wall.id });
          return;
        }
      }
      setHovered(null);
      return;
    }
    if (!dragRef.current) {
      return;
    }
    setViewport((current) => ({
      ...current,
      panX: dragRef.current!.panX + (event.clientX - dragRef.current!.startX),
      panY: dragRef.current!.panY + (event.clientY - dragRef.current!.startY),
    }));
  }

  function handlePointerUp() {
    if (wallDragRef.current) {
      if (wallDragMovedRef.current) {
        onWallDragCommit();
      } else {
        onWallDragCancel();
      }
      wallDragRef.current = null;
      return;
    }
    if (ocrRegionDragRef.current) {
      const start = ocrRegionDragRef.current.start;
      const end = ocrRegionCurrent;
      if (start && end) {
        const x = Math.min(start.x, end.x);
        const y = Math.min(start.y, end.y);
        const width = Math.abs(end.x - start.x);
        const height = Math.abs(end.y - start.y);
        if (width > 4 && height > 4) {
          onOcrRegionSelected({ x, y, width, height });
        }
      }
      ocrRegionDragRef.current = null;
      setOcrRegionStart(null);
      setOcrRegionCurrent(null);
      return;
    }
    if (traceDragRef.current) {
      const drag = traceDragRef.current;
      const shouldCommit =
        traceMovedRef.current &&
        (drag.kind !== "opening" ||
          openingDragStatusRef.current !== "invalid");
      if (shouldCommit) {
        onTraceCommit();
      } else {
        onTraceCancel();
      }
      traceDragRef.current = null;
      return;
    }
    dragRef.current = null;
  }

  if (!document) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) {
                onFile(file);
              }
              event.target.value = "";
            }}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-4 py-10 text-sm font-medium text-zinc-600 hover:border-zinc-400 hover:bg-zinc-100"
          >
            Upload a PDF floor plan
          </button>
          {loading ? (
            <p className="mt-3 text-center text-sm text-zinc-500">
              Reading PDF…
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-center text-sm text-red-600">{error}</p>
          ) : null}
        </div>
      </div>
    );
  }

  const displayStatus = joinError
    ? joinError
    : traceMode === "join-points"
      ? joinSourcePointId
        ? "Select join target"
        : "Select point to join"
      : status;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 overflow-x-auto border-b border-zinc-200 px-3 py-2">
        {pages.map((page) => (
          <Thumb
            key={page}
            document={document}
            pageNumber={page}
            active={page === plan.selectedPage}
            onSelect={() => onSelectPage(page)}
          />
        ))}
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <button type="button" onClick={() => setViewport((v) => ({ ...v, zoom: Math.max(0.05, v.zoom / 1.2) }))} className="h-8 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-50">−</button>
          <button type="button" onClick={() => setViewport((v) => ({ ...v, zoom: Math.min(6, v.zoom * 1.2) }))} className="h-8 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-50">+</button>
          <button type="button" onClick={fitPage} className="h-8 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-50">Fit Page</button>
          <button type="button" onClick={actualSize} className="h-8 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-50">Actual Size</button>
          <button type="button" onClick={() => onUnderlay({ rotation: (plan.pageRotation + 90) % 360 })} className="h-8 rounded-md border border-zinc-200 px-2 text-xs text-zinc-600 hover:bg-zinc-50">Rotate</button>
          <label className="flex items-center gap-2 text-xs text-zinc-600">
            Opacity
            <input type="range" min={0.1} max={1} step={0.05} value={plan.pageOpacity} onChange={(event) => onUnderlay({ opacity: Number(event.target.value) })} className="w-24" />
          </label>
        </div>
      </div>

      <div
        ref={containerRef}
        className="relative flex-1 overflow-hidden bg-zinc-100"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{
          cursor: calibrating || openingMode ? "crosshair" : "grab",
        }}
      >
        <div
          className={`pointer-events-none absolute left-3 top-3 z-10 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] font-medium shadow-sm ring-1 ${
            joinError ? "text-red-600 ring-red-200" : "text-zinc-700 ring-zinc-200"
          }`}
        >
          {displayStatus}
        </div>
        <div
          className="relative inline-block"
          style={{
            transform: `translate(${viewport.panX}px, ${viewport.panY}px) scale(${viewport.zoom})`,
            transformOrigin: "0 0",
          }}
        >
          {render?.url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={render.url} alt={`Plan page ${plan.selectedPage}`} className="block" style={{ opacity: plan.pageOpacity }} />
          ) : (
            <div className="flex h-64 w-96 items-center justify-center text-sm text-zinc-400">Rendering…</div>
          )}
          {trace && pageMeta ? (
            <svg
              className="pointer-events-none absolute inset-0"
              width={render?.width ?? 0}
              height={render?.height ?? 0}
            >
              {Object.values(trace.walls).map((wall) => {
                const start = trace.points[wall.startPointId];
                const end = trace.points[wall.endPointId];
                if (!start || !end) {
                  return null;
                }
                const a = canonicalToWorkspace(start, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                const b = canonicalToWorkspace(end, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                return (
                  <line
                    key={wall.id}
                    x1={a.x}
                    y1={a.y}
                    x2={b.x}
                    y2={b.y}
                    stroke="#0f766e"
                    strokeWidth={2}
                  />
                );
              })}
              {Object.values(trace.openings).map((opening) => {
                const segment = openingWorkspace(opening);
                if (!segment) {
                  return null;
                }
                const selected = opening.id === selectedOpeningId;
                const color =
                  opening.type === "door"
                    ? "#2563eb"
                    : opening.type === "window"
                      ? "#0ea5e9"
                      : "#f59e0b";
                return (
                  <line
                    key={opening.id}
                    x1={segment.start.x}
                    y1={segment.start.y}
                    x2={segment.end.x}
                    y2={segment.end.y}
                    stroke={selected ? "#dc2626" : color}
                    strokeWidth={selected ? 7 : 5}
                    strokeLinecap="round"
                  />
                );
              })}
            </svg>
          ) : null}
          {trace && pageMeta ? (
            <>
              <TraceSnapGuides
                snap={snapResult}
                trace={trace}
                pageMeta={pageMeta}
                pageRotation={plan.pageRotation}
                renderScale={RENDER_SCALE}
                width={render?.width ?? 0}
                height={render?.height ?? 0}
              />
              <svg
                className="pointer-events-none absolute inset-0"
                width={render?.width ?? 0}
                height={render?.height ?? 0}
              >
                {Object.values(trace.points).map((point) => {
                  const c = canonicalToWorkspace(
                    point,
                    pageMeta.widthPt,
                    pageMeta.heightPt,
                    plan.pageRotation,
                    RENDER_SCALE,
                  );
                  const shared = (pointConnectionCounts[point.id] ?? 0) > 1;
                  const isSource = joinSourcePointId === point.id;
                  const isTarget = joinTargetIds.includes(point.id);
                  const r = 5 / Math.max(viewport.zoom, 0.01);
                  const fill = isSource
                    ? "#7c3aed"
                    : isTarget
                      ? "#16a34a"
                      : shared
                        ? "#0f766e"
                        : "#ffffff";
                  const stroke = isSource || isTarget ? "#ffffff" : "#0f766e";
                  return (
                    <circle
                      key={point.id}
                      cx={c.x}
                      cy={c.y}
                      r={r}
                      fill={fill}
                      stroke={stroke}
                      strokeWidth={isSource || isTarget ? 2 : 1.5}
                    />
                  );
                })}
                {analysisVisible
                  ? analysisCandidates.map((candidate) => {
                      const topLeft = canonicalToWorkspace(
                        { x: candidate.x, y: candidate.y },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const bottomRight = canonicalToWorkspace(
                        {
                          x: candidate.x + candidate.width,
                          y: candidate.y + candidate.height,
                        },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const selected = candidate.id === selectedCandidateId;
                      const color =
                        candidate.review === "rejected" ||
                        candidate.status === "rejected"
                          ? "#9ca3af"
                          : candidate.review === "accepted"
                            ? "#16a34a"
                            : candidate.status === "warning"
                              ? "#f59e0b"
                              : "#2563eb";
                      const r = 6 / Math.max(viewport.zoom, 0.01);
                      return (
                        <g key={candidate.id}>
                          <rect
                            x={topLeft.x}
                            y={topLeft.y}
                            width={Math.max(bottomRight.x - topLeft.x, 1)}
                            height={Math.max(bottomRight.y - topLeft.y, 1)}
                            fill="none"
                            stroke={selected ? "#dc2626" : color}
                            strokeWidth={selected ? 2 : 1}
                            strokeDasharray="4 3"
                            opacity={selected ? 0.9 : 0.45}
                          />
                          <circle
                            cx={(topLeft.x + bottomRight.x) / 2}
                            cy={(topLeft.y + bottomRight.y) / 2}
                            r={r}
                            fill={color}
                            stroke="#ffffff"
                            strokeWidth={selected ? 2 : 1.5}
                          />
                        </g>
                      );
                    })
                  : null}
                {ocrRegionSelecting && ocrRegionStart && ocrRegionCurrent
                  ? (() => {
                      const a = canonicalToWorkspace(
                        ocrRegionStart,
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const b = canonicalToWorkspace(
                        ocrRegionCurrent,
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      return (
                        <rect
                          x={Math.min(a.x, b.x)}
                          y={Math.min(a.y, b.y)}
                          width={Math.abs(b.x - a.x)}
                          height={Math.abs(b.y - a.y)}
                          fill="rgba(37,99,235,0.12)"
                          stroke="#2563eb"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                        />
                      );
                    })()
                  : null}
                {wallDetection && showRawLines
                  ? wallDetection.rawLines.map((line) => {
                      const a = canonicalToWorkspace(
                        { x: line.x1, y: line.y1 },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const b = canonicalToWorkspace(
                        { x: line.x2, y: line.y2 },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      return (
                        <line
                          key={line.id}
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="#a1a1aa"
                          strokeWidth={1}
                          opacity={0.5}
                        />
                      );
                    })
                  : null}
                {wallDetection && showCleanedLines
                  ? wallDetection.cleanedLines.map((line) => {
                      const a = canonicalToWorkspace(
                        { x: line.x1, y: line.y1 },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const b = canonicalToWorkspace(
                        { x: line.x2, y: line.y2 },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      return (
                        <line
                          key={line.id}
                          x1={a.x}
                          y1={a.y}
                          x2={b.x}
                          y2={b.y}
                          stroke="#71717a"
                          strokeWidth={1.5}
                          strokeDasharray="5 4"
                          opacity={0.7}
                        />
                      );
                    })
                  : null}
                {wallDetection && showWallCandidates
                  ? wallDetection.candidates.map((candidate) => {
                      const display =
                        wallDragPreview && wallDragPreview.id === candidate.id
                          ? wallDragPreview
                          : candidate;
                      const a = canonicalToWorkspace(
                        { x: display.centerline.x1, y: display.centerline.y1 },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const b = canonicalToWorkspace(
                        { x: display.centerline.x2, y: display.centerline.y2 },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const selected = candidate.id === selectedWallCandidateId;
                      const color =
                        candidate.review === "accepted"
                          ? "#0f766e"
                          : candidate.review === "rejected"
                            ? "#d4d4d8"
                            : candidate.confidence >= 0.7
                              ? "#16a34a"
                              : candidate.confidence >= 0.45
                                ? "#f59e0b"
                                : "#dc2626";
                      const strokeWidth = Math.max(
                        4,
                        Math.min(
                          14,
                          display.thicknessPx * RENDER_SCALE,
                        ),
                      );
                      return (
                        <g key={candidate.id}>
                          {selected ? (
                            <line
                              x1={a.x}
                              y1={a.y}
                              x2={b.x}
                              y2={b.y}
                              stroke="#2563eb"
                              strokeWidth={strokeWidth + 4}
                              opacity={0.35}
                            />
                          ) : null}
                          <line
                            x1={a.x}
                            y1={a.y}
                            x2={b.x}
                            y2={b.y}
                            stroke={color}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            opacity={candidate.review === "rejected" ? 0.3 : 0.7}
                          />
                        </g>
                      );
                    })
                  : null}
                {showOpeningDetectionOverlay && openingDetection
                  ? openingDetection.candidates.map((candidate) => {
                      const geo = openingCandidateGeometry(candidate);
                      if (!geo) return null;
                      const a = {
                        x: geo.start.x + geo.dx * candidate.offset,
                        y: geo.start.y + geo.dy * candidate.offset,
                      };
                      const b = {
                        x: geo.start.x + geo.dx * (candidate.offset + candidate.width),
                        y: geo.start.y + geo.dy * (candidate.offset + candidate.width),
                      };
                      const wa = canonicalToWorkspace(a, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                      const wb = canonicalToWorkspace(b, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                      const selected = candidate.id === selectedOpeningCandidateId;
                      const color =
                        candidate.type === "door" ? "#2563eb" :
                        candidate.type === "window" ? "#06b6d4" :
                        candidate.type === "passage" ? "#8b5cf6" : "#f59e0b";
                      return (
                        <line
                          key={candidate.id}
                          x1={wa.x}
                          y1={wa.y}
                          x2={wb.x}
                          y2={wb.y}
                          stroke={selected ? "#dc2626" : color}
                          strokeWidth={selected ? 8 : 5}
                          strokeLinecap="round"
                          opacity={candidate.review === "rejected" ? 0.25 : 0.7}
                        />
                      );
                    })
                  : null}
                {traceMode === "review-wall-detection" && selectedWallCandidateId
                  ? (() => {
                      const committed = wallDetection?.candidates.find(
                        (candidate) => candidate.id === selectedWallCandidateId,
                      );
                      const candidate =
                        wallDragPreview &&
                        wallDragPreview.id === selectedWallCandidateId
                          ? wallDragPreview
                          : committed;
                      if (!candidate) {
                        return null;
                      }
                      const a = canonicalToWorkspace(
                        { x: candidate.centerline.x1, y: candidate.centerline.y1 },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const b = canonicalToWorkspace(
                        { x: candidate.centerline.x2, y: candidate.centerline.y2 },
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const r = 7 / Math.max(viewport.zoom, 0.01);
                      return (
                        <g>
                          <circle cx={a.x} cy={a.y} r={r + 8} fill="transparent" />
                          <circle
                            cx={a.x}
                            cy={a.y}
                            r={r}
                            fill="#0f766e"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                          <circle cx={b.x} cy={b.y} r={r + 8} fill="transparent" />
                          <circle
                            cx={b.x}
                            cy={b.y}
                            r={r}
                            fill="#2563eb"
                            stroke="#ffffff"
                            strokeWidth={2}
                          />
                        </g>
                      );
                    })()
                  : null}
                {selectedOpeningId && trace.openings[selectedOpeningId]
                  ? (() => {
                      const opening = trace.openings[selectedOpeningId];
                      const segment = openingWorkspace(opening);
                      if (!segment) {
                        return null;
                      }
                      const ppm = plan.calibration?.pixelsPerMeter ?? 1;
                      const fontSize =
                        11 / Math.max(viewport.zoom, 0.01);
                      const wall = trace.walls[opening.wallId];
                      const a = wall && trace.points[wall.startPointId];
                      const b = wall && trace.points[wall.endPointId];
                      const length =
                        a && b ? Math.hypot(b.x - a.x, b.y - a.y) : 0;
                      const widthFt = metersToFeet(opening.width / ppm);
                      const distStartFt = metersToFeet(opening.offset / ppm);
                      const distEndFt = metersToFeet(
                        (length - opening.offset - opening.width) / ppm,
                      );
                      const mid = {
                        x: (segment.start.x + segment.end.x) / 2,
                        y: (segment.start.y + segment.end.y) / 2,
                      };
                      return (
                        <>
                          <text
                            x={mid.x}
                            y={mid.y - 14}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fontWeight={600}
                            fill="#18181b"
                          >
                            {widthFt.toFixed(1)} ft
                          </text>
                          <text
                            x={segment.start.x}
                            y={segment.start.y - 12}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fill="#0f766e"
                          >
                            {distStartFt.toFixed(1)} ft
                          </text>
                          <text
                            x={segment.end.x}
                            y={segment.end.y - 12}
                            textAnchor="middle"
                            fontSize={fontSize}
                            fill="#0f766e"
                          >
                            {distEndFt.toFixed(1)} ft
                          </text>
                        </>
                      );
                    })()
                  : null}
                {hovered && (() => {
                  if (hovered.kind === "point") {
                    const p = trace.points[hovered.id];
                    if (!p) {
                      return null;
                    }
                    const c = canonicalToWorkspace(p, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                    return <circle cx={c.x} cy={c.y} r={8} fill="none" stroke="#0ea5e9" strokeWidth={2} />;
                  }
                  if (hovered.kind === "opening") {
                    const opening = trace.openings[hovered.id];
                    const segment = opening && openingWorkspace(opening);
                    if (!segment) {
                      return null;
                    }
                    return (
                      <line
                        x1={segment.start.x}
                        y1={segment.start.y}
                        x2={segment.end.x}
                        y2={segment.end.y}
                        stroke="#0ea5e9"
                        strokeWidth={9}
                        opacity={0.55}
                        strokeLinecap="round"
                      />
                    );
                  }
                  const wall = trace.walls[hovered.id];
                  const a = wall && trace.points[wall.startPointId];
                  const b = wall && trace.points[wall.endPointId];
                  if (!a || !b) {
                    return null;
                  }
                  const ca = canonicalToWorkspace(a, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                  const cb = canonicalToWorkspace(b, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                  return <line x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke="#0ea5e9" strokeWidth={4} opacity={0.6} />;
                })()}
                {openingMode && openingHover && openingPreview
                  ? (() => {
                      const wall = trace.walls[openingHover.wallId];
                      const a = wall && trace.points[wall.startPointId];
                      const b = wall && trace.points[wall.endPointId];
                      if (!a || !b) {
                        return null;
                      }
                      const ca = canonicalToWorkspace(
                        a,
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const cb = canonicalToWorkspace(
                        b,
                        pageMeta.widthPt,
                        pageMeta.heightPt,
                        plan.pageRotation,
                        RENDER_SCALE,
                      );
                      const segment = openingWorkspace(
                        openingPreview.candidate,
                      );
                      if (!segment) {
                        return null;
                      }
                      const statusColor =
                        openingPreview.status === "invalid"
                          ? "#dc2626"
                          : openingPreview.status === "warning"
                            ? "#f59e0b"
                            : "#16a34a";
                      const ppm =
                        plan.calibration?.pixelsPerMeter ?? 1;
                      const widthFt = metersToFeet(
                        openingPreview.candidate.width / ppm,
                      );
                      const length = Math.hypot(b.x - a.x, b.y - a.y);
                      const distStartFt = metersToFeet(
                        openingPreview.candidate.offset / ppm,
                      );
                      const distEndFt = metersToFeet(
                        (length -
                          openingPreview.candidate.offset -
                          openingPreview.candidate.width) /
                          ppm,
                      );
                      const mid = {
                        x: (segment.start.x + segment.end.x) / 2,
                        y: (segment.start.y + segment.end.y) / 2,
                      };
                      return (
                        <>
                          <line
                            x1={ca.x}
                            y1={ca.y}
                            x2={cb.x}
                            y2={cb.y}
                            stroke="#0ea5e9"
                            strokeWidth={5}
                            opacity={0.55}
                          />
                          <line
                            x1={segment.start.x}
                            y1={segment.start.y}
                            x2={segment.end.x}
                            y2={segment.end.y}
                            stroke={statusColor}
                            strokeWidth={8}
                            strokeLinecap="round"
                            opacity={0.75}
                          />
                          <circle
                            cx={mid.x}
                            cy={mid.y}
                            r={5}
                            fill={statusColor}
                            stroke="#ffffff"
                            strokeWidth={1.5}
                          />
                          <text
                            x={mid.x}
                            y={mid.y - 12}
                            textAnchor="middle"
                            fontSize={12}
                            fontWeight={600}
                            fill="#18181b"
                            style={{ pointerEvents: "none" }}
                          >
                            {capitalize(openingPreview.candidate.type)}{" "}
                            {widthFt.toFixed(1)} ft
                          </text>
                          <text
                            x={mid.x}
                            y={mid.y + 18}
                            textAnchor="middle"
                            fontSize={10}
                            fill={statusColor}
                            style={{ pointerEvents: "none" }}
                          >
                            {openingPreview.reason ??
                              (openingPreview.snapped &&
                              openingPreview.snapLabel
                                ? openingPreview.snapLabel
                                : openingPreview.status === "invalid"
                                  ? "Invalid"
                                  : openingPreview.status === "warning"
                                    ? "Warning"
                                    : "Valid")}
                          </text>
                          <text
                            x={segment.start.x}
                            y={segment.start.y - 12}
                            textAnchor="middle"
                            fontSize={10}
                            fill="#0f766e"
                            style={{ pointerEvents: "none" }}
                          >
                            {distStartFt.toFixed(1)} ft
                          </text>
                          <text
                            x={segment.end.x}
                            y={segment.end.y - 12}
                            textAnchor="middle"
                            fontSize={10}
                            fill="#0f766e"
                            style={{ pointerEvents: "none" }}
                          >
                            {distEndFt.toFixed(1)} ft
                          </text>
                        </>
                      );
                    })()
                  : null}
                {activeTracePointId && snapResult && trace.points[activeTracePointId] ? (() => {
                  const a = trace.points[activeTracePointId];
                  const ca = canonicalToWorkspace(a, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                  const cb = canonicalToWorkspace(snapResult.point, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE);
                  return <line x1={ca.x} y1={ca.y} x2={cb.x} y2={cb.y} stroke="#2563eb" strokeWidth={2} strokeDasharray="6 4" />;
                })() : null}
              </svg>
            </>
          ) : null}
          {pointA && pageMeta ? (
            <div
              className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-500"
              style={{
                left: canonicalToWorkspace(pointA, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE).x,
                top: canonicalToWorkspace(pointA, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE).y,
              }}
            />
          ) : null}
          {plan.calibration && pageMeta ? (
            <>
              <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500" style={{ left: canonicalToWorkspace(plan.calibration.pointA, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE).x, top: canonicalToWorkspace(plan.calibration.pointA, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE).y }} />
              <div className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-emerald-500" style={{ left: canonicalToWorkspace(plan.calibration.pointB, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE).x, top: canonicalToWorkspace(plan.calibration.pointB, pageMeta.widthPt, pageMeta.heightPt, plan.pageRotation, RENDER_SCALE).y }} />
            </>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-zinc-200 px-4 py-3">
        <button type="button" onClick={() => changeTraceMode(traceMode === "draw-wall" ? null : "draw-wall")} className={`h-9 rounded-md px-3 text-xs font-medium ${traceMode === "draw-wall" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>Trace Walls <span className="ml-1 opacity-60">W</span></button>
        <button type="button" onClick={() => changeTraceMode("select")} className={`h-9 rounded-md px-3 text-xs font-medium ${traceMode === "select" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>Select <span className="ml-1 opacity-60">V</span></button>
        <button type="button" onClick={() => { onSetTraceMode("select"); setOpeningMode(openingPlacementMode === "door" ? null : "door"); }} className={`h-9 rounded-md px-3 text-xs font-medium ${openingMode === "door" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>Door <span className="ml-1 opacity-60">D</span></button>
        <button type="button" onClick={() => { onSetTraceMode("select"); setOpeningMode(openingPlacementMode === "window" ? null : "window"); }} className={`h-9 rounded-md px-3 text-xs font-medium ${openingMode === "window" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>Window <span className="ml-1 opacity-60">N</span></button>
        <button type="button" onClick={() => { onSetTraceMode("select"); setOpeningMode(openingPlacementMode === "passage" ? null : "passage"); }} className={`h-9 rounded-md px-3 text-xs font-medium ${openingMode === "passage" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-600 hover:bg-zinc-50"}`}>Passage <span className="ml-1 opacity-60">P</span></button>
        <button type="button" onClick={onTraceFinish} className="h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Finish</button>
        <button type="button" onClick={onTraceBackspace} className="h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Backspace</button>
        <button type="button" onClick={onClearTrace} className="h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Clear</button>
        <button type="button" onClick={() => { setCalibrating(true); setPointA(null); }} className="h-9 rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800">Calibrate Scale</button>
        {calibrating ? <span className="text-xs text-zinc-500">Click the first endpoint…</span> : null}
        <div className="ml-auto flex items-center gap-2">
          <input type="number" step={1} value={feet} onChange={(e) => setFeet(e.target.value)} className="h-8 w-16 rounded-md border border-zinc-200 px-2 text-xs" />
          <span className="text-xs text-zinc-500">ft</span>
          <input type="number" step={0.25} value={inches} onChange={(e) => setInches(e.target.value)} className="h-8 w-16 rounded-md border border-zinc-200 px-2 text-xs" />
          <span className="text-xs text-zinc-500">in</span>
        </div>
        <button type="button" onClick={() => { onClearCalibration(); setPointA(null); setCalibrating(false); }} className="h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Clear</button>
        <button type="button" onClick={() => { onResetUnderlay(); onUnderlay(DEFAULT_UNDERLAY_ALIGNMENT); }} className="h-9 rounded-md border border-zinc-200 px-3 text-xs font-medium text-zinc-600 hover:bg-zinc-50">Reset Underlay</button>
        <button type="button" onClick={onRemove} className="h-9 rounded-md border border-red-200 px-3 text-xs font-medium text-red-600 hover:bg-red-50">Remove PDF</button>
      </div>
    </div>
  );
}
