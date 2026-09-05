"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import {
  defaultSettings,
  demoCameraPresets,
  demoFocus,
} from "@/lib/studio/camera-presets";
import {
  FRAME_ASPECT,
  FRAME_FOV,
  computeCameraPresets,
  computeFocus,
} from "@/lib/studio/model-bounds";
import {
  computeZoneCounts,
  demoMeshZones,
  emptyZoneSelections,
  type MaterialAssignments,
  type MaterialZoneId,
  type ZoneMaterialSelections,
} from "@/lib/studio/material-zones";
import {
  DEFAULT_SNAP_CONFIG,
  DEFAULT_TRANSFORM,
  type LocalTransform,
  type SceneApi,
  type SnapConfig,
  type TransformState,
  type ViewMode,
} from "@/lib/studio/transforms";
import {
  DEMO_EDITABLE_OBJECTS,
  type EditableObjectInfo,
} from "@/lib/studio/editable-objects";
import {
  poseForView,
} from "@/lib/studio/space-planning";
import {
  clampOpening,
  createRoomLayout,
  roomLayoutBounds,
  wallPlanesFromRoom,
  type OpeningType,
  type RoomLayout,
  type RoomWall,
  type WallOpening,
} from "@/lib/studio/room";
import {
  DEFAULT_CLEARANCE_THRESHOLDS,
  computeClearances,
  type ClearanceThresholds,
} from "@/lib/studio/clearance";
import { DEFAULT_ENDPOINT_TOLERANCE } from "@/lib/studio/wall-editing";
import {
  addOpeningAtWall,
  deleteWall,
  deleteOpening,
  duplicateOpening,
  emptyTrace,
  joinCompatibleTargets,
  joinPoints,
  joinPointsError,
  movePoint,
  openingPlacementStatus,
  pointConnectedWalls,
  reverseWall,
  separateWallEndpoint,
  setWallLength,
  splitWallAtDistance,
  updateOpening,
  type TracedOpening,
  type PlanTrace,
  type TracePoint,
  type TraceInteractionMode,
} from "@/lib/studio/trace";
import { validateTrace, type TraceFinding } from "@/lib/studio/trace-validation";
import { traceToRoomLayout } from "@/lib/studio/trace-to-room";
import {
  calibrationSignature,
  compareRooms,
  computeRoomSyncStatus,
  traceSignature,
  underlaySignature,
  type RoomGenerationMetadata,
  type RoomImpact,
} from "@/lib/studio/room-generation";
import {
  analyzePlanText,
  analyzeOcrWords,
  mergePlanAnalyses,
  preserveCandidateReviews,
  PLAN_ANALYSIS_VERSION,
  type PlanAnalysis,
} from "@/lib/studio/plan-analysis";
import {
  OcrCancelledError,
  runTesseractOcr,
  terminateOcrWorker,
} from "@/lib/studio/ocr";
import {
  preprocessOcrImage,
  renderOcrRaster,
  type OcrPreset,
} from "@/lib/studio/ocr-raster";
import { validateCalibration } from "@/lib/studio/calibration-validation";
import {
  DEFAULT_WALL_DETECTION_SETTINGS,
  WALL_DETECTION_VERSION,
  inferSingleLineWall,
  splitWallCandidate,
  updateWallCandidateGeometry,
  wallDetectionSettingsSignature,
  type DetectedWallCandidate,
  type WallCandidatePatch,
  type WallDetectionAnalysis,
  type WallDetectionSettings,
} from "@/lib/studio/wall-detection";
import type { WallDetectionPreset } from "@/lib/studio/wall-detect";
import {
  cancelWallDetectionWorker,
  detectWallsInWorker,
} from "@/lib/studio/wall-detect-worker";
import {
  convertDetectionToTrace,
  type DetectionToTraceResult,
} from "@/lib/studio/detection-to-trace";
import DetectionToTraceReview from "./DetectionToTraceReview";
import SimpleStudioShell from "./SimpleStudioShell";
import SimpleMaterialPanel from "./SimpleMaterialPanel";
import {
  createCabinetInstance,
  getCatalogEntry,
  type CabinetInstance,
} from "@/lib/studio/cabinet";
import {
  runOpeningDetectionCore,
  type OpeningDetectionCoreInput,
} from "@/lib/studio/opening-detect";
import {
  DEFAULT_OPENING_DETECTION_SETTINGS,
  type OpeningDetectionAnalysis,
  type OpeningDetectionSettings,
} from "@/lib/studio/opening-detection";
import { convertDetectionToOpenings } from "@/lib/studio/detection-to-openings";
import {
  computeRunPlacement,
  type CabinetRun,
} from "@/lib/studio/cabinet-run";
import {
  computeIslandClearanceDimensions,
  computeRoomDimensions,
  computeSelectionDimensions,
  type DimensionItem,
} from "@/lib/studio/dimensions";
import {
  DEFAULT_IMPORT_ALIGNMENT,
  alignmentRotation,
  alignmentScale,
  computeAlignedPosition,
  type ImportAlignment,
} from "@/lib/studio/import-alignment";
import {
  DEFAULT_PLAN_STATE,
  type PlanCalibration,
  type PlanState,
  type PlanUnderlayAlignment,
} from "@/lib/studio/plan";
import {
  extractPageText,
  getPageMeta,
  loadPdfDocument,
  type PageMeta,
  type PdfDocument,
} from "@/lib/studio/pdf";
import { useStudioPresentation } from "@/lib/studio/presentation-context";
import { useGlbModel } from "@/lib/studio/use-gltf-model";
import type { CameraCommand, StudioSettings } from "@/lib/studio/types";
import GeneratedRoomReview from "./GeneratedRoomReview";
import PresentationMaterials from "./PresentationMaterials";
import PlanWorkspace from "./PlanWorkspace";
import SceneCanvas from "./SceneCanvas";
import SceneControls from "./SceneControls";
import StudioInspector from "./StudioInspector";
import StudioToolbar from "./StudioToolbar";

interface StudioShellProps {
  projectName: string;
}

interface ModelDescriptor {
  url: string;
  fileName: string;
  fileSize: number;
}

interface StudioSnapshot {
  transforms: Record<string, TransformState>;
  room: RoomLayout;
  roomGeneration: RoomGenerationMetadata | null;
  roomModifiedAfterGeneration: boolean;
  selectedKeys: string[];
  selectedWallId: string | null;
  selectedOpeningId: string | null;
  extraObjects: EditableObjectInfo[];
  trace: PlanTrace | null;
  wallDetection: WallDetectionAnalysis | null;
  openingDetection: OpeningDetectionAnalysis | null;
  cabinetInstances: Record<string, CabinetInstance>;
  cabinetRuns: Record<string, CabinetRun>;
  plan: {
    selectedPage: number;
    pageRotation: number;
    pageOpacity: number;
    calibration: PlanCalibration | null;
    underlay: PlanUnderlayAlignment;
  };
}

export default function StudioShell({ projectName }: StudioShellProps) {
  const [experienceMode, setExperienceMode] = useState<"simple" | "advanced">(
    "simple",
  );
  const [simpleStage, setSimpleStage] = useState<"upload" | "review" | "design">(
    "upload",
  );
  const { presenting, setPresenting } = useStudioPresentation();
  const [settings, setSettings] = useState<StudioSettings>(defaultSettings);
  const [descriptor, setDescriptor] = useState<ModelDescriptor | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [planAnalysis, setPlanAnalysis] = useState<PlanAnalysis | null>(null);
  const [analysisSearch, setAnalysisSearch] = useState("");
  const [analysisMinConfidence, setAnalysisMinConfidence] = useState(0);
  const [showAnalysisOverlay, setShowAnalysisOverlay] = useState(true);
  const [selectedCandidateId, setSelectedCandidateId] = useState<string | null>(
    null,
  );
  const [assistedCalibration, setAssistedCalibration] = useState<{
    candidateId: string;
    meters: number;
  } | null>(null);
  const [pendingAssistedCalibration, setPendingAssistedCalibration] = useState<{
    candidateId: string;
    pointA: { x: number; y: number };
    pointB: { x: number; y: number };
    meters: number;
    pixelsPerMeter: number;
  } | null>(null);
  const [assistedCalibrationWarning, setAssistedCalibrationWarning] = useState<
    string | null
  >(null);
  const [assistedWarningsAcknowledged, setAssistedWarningsAcknowledged] =
    useState(false);
  const analysisRequestRef = useRef(0);
  const locateAnalysisRef = useRef<((id: string) => void) | null>(null);
  const nativeAnalysisRef = useRef<PlanAnalysis | null>(null);
  const ocrAnalysisRef = useRef<PlanAnalysis | null>(null);
  const ocrRequestRef = useRef(0);
  const ocrRegionRef = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [ocrStatus, setOcrStatus] = useState<
    "idle" | "initializing" | "recognizing" | "complete" | "failed" | "cancelled"
  >("idle");
  const [ocrProgress, setOcrProgress] = useState(0);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [ocrPreset, setOcrPreset] = useState<OcrPreset>("automatic");
  const [ocrMode, setOcrMode] = useState<"full" | "region">("full");
  const [ocrWordCount, setOcrWordCount] = useState(0);
  const [ocrAverageConfidence, setOcrAverageConfidence] = useState(0);
  const [ocrLowConfidenceCount, setOcrLowConfidenceCount] = useState(0);
  const [ocrCompletedAt, setOcrCompletedAt] = useState<number | null>(null);
  const [sourceFilter, setSourceFilter] = useState<
    "all" | "native" | "ocr" | "combined"
  >("all");
  const [ocrRegionSelecting, setOcrRegionSelecting] = useState(false);
  const wallDetectRequestRef = useRef(0);
  const [wallDetection, setWallDetection] = useState<WallDetectionAnalysis | null>(null);
  const [wallSettings, setWallSettings] = useState<WallDetectionSettings>(
    DEFAULT_WALL_DETECTION_SETTINGS,
  );
  const [wallPreset, setWallPreset] = useState<WallDetectionPreset>("automatic");
  const [useTextAwareWallFilter, setUseTextAwareWallFilter] = useState(true);
  const [openingDetection, setOpeningDetection] =
    useState<OpeningDetectionAnalysis | null>(null);
  const [openingDetectionSettings, setOpeningDetectionSettings] =
    useState<OpeningDetectionSettings>(DEFAULT_OPENING_DETECTION_SETTINGS);
  const [selectedOpeningCandidateId, setSelectedOpeningCandidateId] =
    useState<string | null>(null);
  const [showOpeningDetectionOverlay, setShowOpeningDetectionOverlay] =
    useState(true);
  const [openingDetectionRunning, setOpeningDetectionRunning] = useState(false);
  const [openingDetectionError, setOpeningDetectionError] = useState<
    string | null
  >(null);
  const [cabinetInstances, setCabinetInstances] = useState<
    Record<string, CabinetInstance>
  >({});
  const [selectedCabinetIds, setSelectedCabinetIds] = useState<string[]>([]);
  const [cabinetRuns, setCabinetRuns] = useState<Record<string, CabinetRun>>({});
  const [cabinetRunProposal, setCabinetRunProposal] = useState<{
    run: CabinetRun;
    cabinets: CabinetInstance[];
    wallId: string;
    side: 1 | -1;
    catalogIds: string[];
    name: string;
    startOffset: number;
    finishZone: "perimeter" | "island";
  } | null>(null);
  const [cabinetTransformPreview, setCabinetTransformPreview] = useState<
    | {
        kind: "move";
        id: string;
        start: [number, number, number];
        current: [number, number, number];
      }
    | {
        kind: "rotate";
        id: string;
        startRotation: [number, number, number];
        currentRotation: [number, number, number];
      }
    | null
  >(null);
  const [wallDetectStatus, setWallDetectStatus] = useState<
    "idle" | "analyzing" | "complete" | "failed" | "cancelled"
  >("idle");
  const [wallDetectError, setWallDetectError] = useState<string | null>(null);
  const [dtReviewOpen, setDtReviewOpen] = useState(false);
  const [dtMode, setDtMode] = useState<"replace" | "append">("replace");
  const [dtResult, setDtResult] = useState<DetectionToTraceResult | null>(null);
  const [dtAcknowledged, setDtAcknowledged] = useState(false);
  const [showRawLines, setShowRawLines] = useState(false);
  const [showCleanedLines, setShowCleanedLines] = useState(false);
  const [showWallCandidates, setShowWallCandidates] = useState(true);
  const [selectedWallCandidateId, setSelectedWallCandidateId] = useState<
    string | null
  >(null);
  const wallDragSourceRef = useRef<DetectedWallCandidate | null>(null);
  const [wallDragPreview, setWallDragPreview] =
    useState<DetectedWallCandidate | null>(null);

  const [selectedKeys, setSelectedKeys] = useState<string[]>([]);
  const [assignments, setAssignments] = useState<MaterialAssignments>({});
  const [zoneSelections, setZoneSelections] =
    useState<ZoneMaterialSelections>(emptyZoneSelections);
  const [materialsApplied, setMaterialsApplied] = useState(true);
  const [showZones, setShowZones] = useState(false);

  const [transformMode, setTransformMode] = useState<
    "translate" | "rotate" | null
  >(null);
  const [snap, setSnap] = useState<SnapConfig>(DEFAULT_SNAP_CONFIG);
  const [room, setRoom] = useState<RoomLayout>(() => createRoomLayout());
  const [selectedWallId, setSelectedWallId] = useState<string | null>(null);
  const [selectedOpeningId, setSelectedOpeningId] = useState<string | null>(
    null,
  );
  const [clearanceThresholds, setClearanceThresholds] =
    useState<ClearanceThresholds>(DEFAULT_CLEARANCE_THRESHOLDS);
  const [importAlignment, setImportAlignment] = useState<ImportAlignment>(
    DEFAULT_IMPORT_ALIGNMENT,
  );
  const [workspace, setWorkspace] = useState<"3d" | "plan">("3d");
  const [plan, setPlan] = useState<PlanState>(DEFAULT_PLAN_STATE);
  const [pdfDocument, setPdfDocument] = useState<PdfDocument | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [pageMetaEntry, setPageMetaEntry] = useState<{
    key: string;
    meta: PageMeta | null;
  }>({ key: "", meta: null });
  const [trace, setTrace] = useState<PlanTrace | null>(null);
  const [previewTrace, setPreviewTrace] = useState<PlanTrace | null>(null);
  const [traceMode, setTraceMode] = useState<TraceInteractionMode | null>(null);
  const [joinSourcePointId, setJoinSourcePointId] = useState<string | null>(
    null,
  );
  const [joinError, setJoinError] = useState<string | null>(null);
  const [roomGeneration, setRoomGeneration] =
    useState<RoomGenerationMetadata | null>(null);
  const [roomModifiedAfterGeneration, setRoomModifiedAfterGeneration] =
    useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [proposedRoom, setProposedRoom] = useState<RoomLayout | null>(null);
  const [previewRoom, setPreviewRoom] = useState<RoomLayout | null>(null);
  const [reviewAcknowledged, setReviewAcknowledged] = useState(false);
  const [selectedTracePointId, setSelectedTracePointId] = useState<string | null>(
    null,
  );
  const [selectedTraceWallId, setSelectedTraceWallId] = useState<string | null>(
    null,
  );
  const [activeTracePointId, setActiveTracePointId] = useState<string | null>(
    null,
  );
  const [traceOrder, setTraceOrder] = useState<string[]>([]);
  const [selectedTraceOpeningId, setSelectedTraceOpeningId] = useState<
    string | null
  >(null);
  const [openingDefaults, setOpeningDefaults] = useState<
    Record<"door" | "window" | "passage", { widthM: number; heightM: number; sillM: number }>
  >({
    door: { widthM: 0.9144, heightM: 2.032, sillM: 0 },
    window: { widthM: 1.8288, heightM: 1.2192, sillM: 0.9144 },
    passage: { widthM: 1.2192, heightM: 2.1336, sillM: 0 },
  });
  const traceCursorRef = useRef<string | null>(null);
  const traceOrderRef = useRef<string[]>([]);
  const idCounterRef = useRef(0);
  const traceDragRef = useRef<PlanTrace | null>(null);
  const [showRoomDimensions, setShowRoomDimensions] = useState(true);
  const [showSelectionDimensions, setShowSelectionDimensions] = useState(true);
  const [showClearanceDimensions, setShowClearanceDimensions] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>("perspective");
  const [transforms, setTransforms] = useState<Record<string, TransformState>>(
    {},
  );
  const [extraObjects, setExtraObjects] = useState<EditableObjectInfo[]>([]);
  const [snapFlash, setSnapFlash] = useState<string | null>(null);
  const [wallEditStatus, setWallEditStatus] = useState<string | null>(null);
  const [snapStatus, setSnapStatus] = useState<string | null>(null);

  const [past, setPast] = useState<StudioSnapshot[]>([]);
  const [future, setFuture] = useState<StudioSnapshot[]>([]);

  const commandRef = useRef<CameraCommand | null>(null);
  const sceneApiRef = useRef<SceneApi | null>(null);
  const descriptorRef = useRef(descriptor);
  const wallDragRef = useRef<RoomLayout | null>(null);
  const planUrlRef = useRef<string | null>(null);
  const underlayDragRef = useRef<PlanUnderlayAlignment | null>(null);
  const snapFlashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handlersRef = useRef<{
    onMove: () => void;
    onRotate: () => void;
    onCancel: () => void;
    onDelete: () => void;
    onUndo: () => void;
    onRedo: () => void;
    onTraceSelect: () => void;
    onTraceWalls: () => void;
    onTraceJoin: () => void;
    onTraceEscape: () => void;
    onTraceEnter: () => void;
    onTraceBackspace: () => void;
    onTraceBackspaceOrDelete: () => void;
    onTraceDelete: () => void;
  } | null>(null);
  const workspaceRef = useRef(workspace);

  const {
    scene,
    sceneRef,
    model,
    editableObjects: importedObjects,
    loading,
    error: loadError,
  } = useGlbModel(descriptor?.url ?? null);

  const modelInfo = model?.info ?? null;
  const tree = useMemo(() => model?.tree ?? [], [model]);
  const activeObjects = useMemo(
    () =>
      model
        ? [...importedObjects, ...extraObjects]
        : [...DEMO_EDITABLE_OBJECTS, ...extraObjects],
    [model, importedObjects, extraObjects],
  );

  const runtimeTree = useMemo(() => {
    const extraNodes = extraObjects.map((object) => ({
      id: object.id,
      name: object.name,
      type: "Mesh",
      isMesh: true,
      hasMaterial: true,
      meshCount: 1,
      children: [],
    }));
    if (model) {
      return [...tree, ...extraNodes];
    }
    const demoNodes = DEMO_EDITABLE_OBJECTS.map((object) => ({
      id: object.id,
      name: object.name,
      type: "Mesh",
      isMesh: true,
      hasMaterial: true,
      meshCount: 1,
      children: [],
    }));
    return [...demoNodes, ...extraNodes];
  }, [tree, model, extraObjects]);

  const originals = useMemo<Record<string, LocalTransform>>(() => {
    const map: Record<string, LocalTransform> = {};
    for (const object of activeObjects) {
      map[object.id] = {
        position: object.originalPosition,
        rotation: object.originalRotation,
      };
    }
    return map;
  }, [activeObjects]);

  const focus = useMemo(
    () => (modelInfo ? computeFocus(modelInfo.bounds) : demoFocus),
    [modelInfo],
  );

  const gridOrigin = useMemo<[number, number, number]>(() => {
    if (!modelInfo) {
      return [0, 0.01, 0];
    }
    return [
      modelInfo.bounds.center[0],
      modelInfo.bounds.min[1] + 0.01,
      modelInfo.bounds.center[2],
    ];
  }, [modelInfo]);

  const wallPlanes = useMemo(() => wallPlanesFromRoom(room), [room]);

  const zoneCounts = useMemo(
    () =>
      computeZoneCounts(
        Boolean(model),
        assignments,
        modelInfo?.meshCount ?? 0,
      ),
    [model, modelInfo, assignments],
  );

  const selectedMeshIds = useMemo(() => {
    if (!model) {
      return selectedKeys;
    }
    const meshIds: string[] = [];
    const seen = new Set<string>();
    for (const key of selectedKeys) {
      const object = model.nodeMap.get(key);
      if (!object) {
        continue;
      }
      object.traverse((child) => {
        const mesh = child as THREE.Mesh;
        if (mesh.isMesh && !seen.has(mesh.uuid)) {
          seen.add(mesh.uuid);
          meshIds.push(mesh.uuid);
        }
      });
    }
    return meshIds;
  }, [model, selectedKeys]);

  const currentZone = useMemo<MaterialZoneId | "mixed" | null>(() => {
    if (selectedMeshIds.length === 0) {
      return null;
    }
    const zones = new Set<MaterialZoneId | null>();
    for (const key of selectedMeshIds) {
      const zone = model
        ? (assignments[key] ?? null)
        : (assignments[key] ?? demoMeshZones[key] ?? null);
      zones.add(zone);
    }
    if (zones.size === 1) {
      return [...zones][0];
    }
    return "mixed";
  }, [selectedMeshIds, assignments, model]);

  const selectedObject = useMemo(
    () => (selectedKeys.length === 1 ? activeObjects.find((o) => o.id === selectedKeys[0]) ?? null : null),
    [selectedKeys, activeObjects],
  );

  const selectedObjectsInfo = useMemo(
    () => activeObjects.filter((o) => selectedKeys.includes(o.id)),
    [activeObjects, selectedKeys],
  );

  const clearances = useMemo(
    () =>
      computeClearances(
        selectedObjectsInfo,
        transforms,
        room,
        clearanceThresholds,
      ),
    [selectedObjectsInfo, transforms, room, clearanceThresholds],
  );

  const roomDimensions = useMemo(
    () => computeRoomDimensions(room),
    [room],
  );

  const selectionDimensions = useMemo(
    () =>
      computeSelectionDimensions({
        room,
        objects: activeObjects,
        selected: selectedObjectsInfo,
        transforms,
        thresholds: clearanceThresholds,
      }),
    [room, activeObjects, selectedObjectsInfo, transforms, clearanceThresholds],
  );

  const islandDimensions = useMemo(
    () =>
      computeIslandClearanceDimensions({
        objects: activeObjects,
        transforms,
        islandZone: (id) =>
          demoMeshZones[id] === "island" || assignments[id] === "island",
        perimeterZone: (id) =>
          demoMeshZones[id] === "perimeter" || assignments[id] === "perimeter",
        thresholds: clearanceThresholds,
        y: room.floorY + 0.02,
      }),
    [activeObjects, transforms, assignments, clearanceThresholds, room.floorY],
  );

  const dimensions = useMemo<DimensionItem[]>(() => {
    if (presenting) {
      return [];
    }
    const list: DimensionItem[] = [];
    if (showRoomDimensions) {
      list.push(...roomDimensions);
    }
    if (showSelectionDimensions) {
      list.push(...selectionDimensions);
    }
    if (showClearanceDimensions) {
      list.push(...islandDimensions);
    }
    return list;
  }, [
    presenting,
    showRoomDimensions,
    showSelectionDimensions,
    showClearanceDimensions,
    roomDimensions,
    selectionDimensions,
    islandDimensions,
  ]);

  const hiddenIds = useMemo(
    () =>
      new Set(
        Object.entries(transforms)
          .filter(([, state]) => state.hidden)
          .map(([id]) => id),
      ),
    [transforms],
  );

  const importTransform = useMemo(
    () => ({
      position: importAlignment.confirmed
        ? importAlignment.position
        : ([0, 0, 0] as [number, number, number]),
      rotation: alignmentRotation(importAlignment),
      scale: alignmentScale(importAlignment),
    }),
    [importAlignment],
  );

  const selectedTransform = useMemo(() => {
    if (!selectedObject) {
      return null;
    }
    return (
      transforms[selectedObject.id] ?? {
        position: selectedObject.originalPosition,
        rotation: selectedObject.originalRotation,
        locked: false,
        hidden: false,
      }
    );
  }, [selectedObject, transforms]);

  const canRenameSelected = selectedObject
    ? extraObjects.some((object) => object.id === selectedObject.id)
    : false;

  useEffect(() => {
    descriptorRef.current = descriptor;
  }, [descriptor]);

  useEffect(() => {
    return () => {
      if (descriptorRef.current?.url) {
        URL.revokeObjectURL(descriptorRef.current.url);
      }
    };
  }, []);

  useEffect(() => {
    if (modelInfo) {
      const framed = computeCameraPresets(
        modelInfo.bounds,
        FRAME_FOV,
        FRAME_ASPECT,
      );
      commandRef.current = { view: "home", ...framed.home };
    }
  }, [modelInfo]);

  useEffect(() => {
    if (!pdfDocument) {
      return;
    }
    let cancelled = false;
    const key = `${pdfDocument.numPages}:${plan.selectedPage}`;
    getPageMeta(pdfDocument, plan.selectedPage)
      .then((meta) => {
        if (!cancelled) {
          setPageMetaEntry({ key, meta });
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [pdfDocument, plan.selectedPage]);

  function captureSnapshot(): StudioSnapshot {
    return {
      transforms,
      room,
      roomGeneration,
      roomModifiedAfterGeneration,
      selectedKeys,
      selectedWallId,
      selectedOpeningId,
      extraObjects,
      trace,
      wallDetection,
      openingDetection,
      cabinetInstances,
      cabinetRuns,
      plan: {
        selectedPage: plan.selectedPage,
        pageRotation: plan.pageRotation,
        pageOpacity: plan.pageOpacity,
        calibration: plan.calibration,
        underlay: plan.underlay,
      },
    };
  }

  function restoreSnapshot(snapshot: StudioSnapshot) {
    setTransforms(snapshot.transforms);
    setRoom(snapshot.room);
    setRoomGeneration(snapshot.roomGeneration);
    setRoomModifiedAfterGeneration(snapshot.roomModifiedAfterGeneration);
    setSelectedKeys(snapshot.selectedKeys);
    setSelectedWallId(snapshot.selectedWallId);
    setSelectedOpeningId(snapshot.selectedOpeningId);
    setExtraObjects(snapshot.extraObjects);
    setTrace(snapshot.trace);
    setWallDetection(snapshot.wallDetection);
    setOpeningDetection(snapshot.openingDetection);
    setCabinetInstances(snapshot.cabinetInstances);
    setCabinetRuns(snapshot.cabinetRuns);
    setPlan((current) => ({
      ...current,
      selectedPage: snapshot.plan.selectedPage,
      pageRotation: snapshot.plan.pageRotation,
      pageOpacity: snapshot.plan.pageOpacity,
      calibration: snapshot.plan.calibration,
      underlay: snapshot.plan.underlay,
    }));
  }

  function pushHistory() {
    setPast((current) => [...current, captureSnapshot()]);
    setFuture([]);
  }

  function undo() {
    if (past.length === 0) {
      return;
    }
    const current = captureSnapshot();
    const previous = past[past.length - 1];
    setFuture((f) => [...f, current]);
    setPast((p) => p.slice(0, -1));
    restoreSnapshot(previous);
    reconcileScene(previous);
  }

  function redo() {
    if (future.length === 0) {
      return;
    }
    const current = captureSnapshot();
    const next = future[future.length - 1];
    setPast((p) => [...p, current]);
    setFuture((f) => f.slice(0, -1));
    restoreSnapshot(next);
    reconcileScene(next);
  }

  function reconcileScene(snapshot: StudioSnapshot) {
    // Remove duplicate clones that no longer exist in the restored snapshot.
    const restoredIds = new Set(snapshot.extraObjects.map((o) => o.id));
    for (const object of extraObjects) {
      if (!restoredIds.has(object.id)) {
        sceneApiRef.current?.removeObject(object.id);
      }
    }
    // Re-create duplicate clones restored by redo.
    const currentIds = new Set(extraObjects.map((o) => o.id));
    for (const object of snapshot.extraObjects) {
      if (!currentIds.has(object.id) && object.duplicateSourceId) {
        sceneApiRef.current?.duplicate(object.duplicateSourceId, object.id);
      }
    }
  }

  function applyViewMode(view: ViewMode) {
    const targetRoom = reviewing && previewRoom ? previewRoom : room;
    const bounds = roomLayoutBounds(targetRoom);
    const pose = poseForView(view, bounds);
    commandRef.current = { view: "home", ...pose };
    setViewMode(view);
    setTransformMode(null);
  }

  function handleFrameSelection() {
    sceneApiRef.current?.frameSelection(selectedKeys);
  }

  function handleFrameRoom() {
    sceneApiRef.current?.frameRoom(roomLayoutBounds(room));
  }

  function handleUpdateWall(wall: RoomWall) {
    pushHistory();
    markRoomManuallyEdited();
    setRoom((current) => ({
      ...current,
      walls: current.walls.map((w) => (w.id === wall.id ? wall : w)),
    }));
  }

  function handleAddWall() {
    pushHistory();
    markRoomManuallyEdited();
    const id = `wall-${Date.now()}`;
    const wall: RoomWall = {
      id,
      start: { x: 0, z: 0 },
      end: { x: 2, z: 0 },
      height: 2.7,
      thickness: 0.15,
      openings: [],
    };
    setRoom((current) => ({ ...current, walls: [...current.walls, wall] }));
    setSelectedWallId(id);
    setSelectedOpeningId(null);
  }

  function handleRemoveWall(id: string) {
    pushHistory();
    markRoomManuallyEdited();
    setRoom((current) => ({
      ...current,
      walls: current.walls.filter((wall) => wall.id !== id),
    }));
    if (selectedWallId === id) {
      setSelectedWallId(null);
      setSelectedOpeningId(null);
    }
  }

  function handleAddOpening(wallId: string, type: OpeningType) {
    pushHistory();
    markRoomManuallyEdited();
    const id = `opening-${Date.now()}`;
    const opening: WallOpening = {
      id,
      wallId,
      type,
      offset: 0.4,
      width: type === "door" ? 0.91 : type === "window" ? 1.83 : 1.2,
      height: type === "door" ? 2.03 : type === "window" ? 1.07 : 2.13,
      sillHeight: type === "window" ? 0.91 : 0,
    };
    setRoom((current) => ({
      ...current,
      walls: current.walls.map((wall) =>
        wall.id === wallId
          ? { ...wall, openings: [...wall.openings, clampOpening(wall, opening)] }
          : wall,
      ),
    }));
    setSelectedWallId(wallId);
    setSelectedOpeningId(id);
  }

  function handleUpdateOpening(wallId: string, opening: WallOpening) {
    pushHistory();
    markRoomManuallyEdited();
    setRoom((current) => ({
      ...current,
      walls: current.walls.map((wall) =>
        wall.id === wallId
          ? {
              ...wall,
              openings: wall.openings.map((o) =>
                o.id === opening.id ? clampOpening(wall, opening) : o,
              ),
            }
          : wall,
      ),
    }));
  }

  function handleRemoveOpening(wallId: string, openingId: string) {
    pushHistory();
    markRoomManuallyEdited();
    setRoom((current) => ({
      ...current,
      walls: current.walls.map((wall) =>
        wall.id === wallId
          ? {
              ...wall,
              openings: wall.openings.filter((o) => o.id !== openingId),
            }
          : wall,
      ),
    }));
    if (selectedOpeningId === openingId) {
      setSelectedOpeningId(null);
    }
  }

  function handleDuplicateOpening(wallId: string, openingId: string) {
    const source = room.walls
      .find((wall) => wall.id === wallId)
      ?.openings.find((opening) => opening.id === openingId);
    if (!source) {
      return;
    }
    pushHistory();
    markRoomManuallyEdited();
    const id = `opening-${Date.now()}`;
    const duplicate: WallOpening = {
      ...source,
      id,
      offset: source.offset + 0.2,
    };
    setRoom((current) => ({
      ...current,
      walls: current.walls.map((wall) =>
        wall.id === wallId
          ? {
              ...wall,
              openings: [...wall.openings, clampOpening(wall, duplicate)],
            }
          : wall,
      ),
    }));
    setSelectedOpeningId(id);
  }

  function handleResetRoom() {
    pushHistory();
    markRoomManuallyEdited();
    setRoom(createRoomLayout());
    setSelectedWallId(null);
    setSelectedOpeningId(null);
  }

  function handleWallDragStart() {
    wallDragRef.current = room;
  }

  function handleWallPreview(nextRoom: RoomLayout) {
    setRoom(nextRoom);
  }

  function handleWallCommit() {
    const preRoom = wallDragRef.current;
    if (!preRoom) {
      return;
    }
    const snapshot: StudioSnapshot = {
      transforms,
      room: preRoom,
      roomGeneration,
      roomModifiedAfterGeneration,
      selectedKeys,
      selectedWallId,
      selectedOpeningId,
      extraObjects,
      trace,
      wallDetection,
      openingDetection,
      cabinetInstances,
      cabinetRuns,
      plan: {
        selectedPage: plan.selectedPage,
        pageRotation: plan.pageRotation,
        pageOpacity: plan.pageOpacity,
        calibration: plan.calibration,
        underlay: plan.underlay,
      },
    };
    setPast((current) => [...current, snapshot]);
    setFuture([]);
    markRoomManuallyEdited();
    wallDragRef.current = null;
  }

  function handleWallCancel() {
    const preRoom = wallDragRef.current;
    if (preRoom) {
      setRoom(preRoom);
    }
    wallDragRef.current = null;
  }

  function handleAlignImport() {
    if (!modelInfo) {
      return;
    }
    setImportAlignment((current) => ({
      ...current,
      position: computeAlignedPosition(
        modelInfo.bounds,
        current,
        room.floorY,
      ),
      rotation: alignmentRotation(current),
      confirmed: true,
    }));
  }

  function handleResetAlignment() {
    setImportAlignment(DEFAULT_IMPORT_ALIGNMENT);
  }

  function handlePlanFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".pdf")) {
      setPdfError("Please choose a PDF file.");
      return;
    }
    if (planUrlRef.current) {
      URL.revokeObjectURL(planUrlRef.current);
    }
    planUrlRef.current = URL.createObjectURL(file);
    setPdfLoading(true);
    setPdfError(null);
    file
      .arrayBuffer()
      .then((buffer) => loadPdfDocument(buffer))
      .then((document) => {
        analysisRequestRef.current += 1;
        ocrRequestRef.current += 1;
        wallDetectRequestRef.current += 1;
        handleCandidateDragCancel();
        handleCancelDt();
        setSelectedWallCandidateId(null);
        setPlanAnalysis(null);
        setSelectedCandidateId(null);
        setAssistedCalibration(null);
        setPendingAssistedCalibration(null);
        setPdfDocument(document);
        setPlan((current) => ({
          ...current,
          fileName: file.name,
          fileSize: file.size,
          pageCount: document.numPages,
          selectedPage: 1,
          calibration: null,
          underlay: { ...current.underlay, visible: false },
        }));
        setPdfLoading(false);
      })
      .catch((loadError: unknown) => {
        setPdfError(
          loadError instanceof Error
            ? loadError.message
            : "The PDF could not be read.",
        );
        setPdfLoading(false);
      });
  }

  function handlePlanRemove() {
    if (planUrlRef.current) {
      URL.revokeObjectURL(planUrlRef.current);
    }
    planUrlRef.current = null;
    analysisRequestRef.current += 1;
    ocrRequestRef.current += 1;
    wallDetectRequestRef.current += 1;
    handleCandidateDragCancel();
    handleCancelDt();
    setSelectedWallCandidateId(null);
    setPlanAnalysis(null);
    setSelectedCandidateId(null);
    setAssistedCalibration(null);
    setPendingAssistedCalibration(null);
    setPdfDocument(null);
    setPdfError(null);
    setPdfLoading(false);
    setPlan(DEFAULT_PLAN_STATE);
  }

  function handleSelectPage(pageNumber: number) {
    pushHistory();
    analysisRequestRef.current += 1;
    ocrRequestRef.current += 1;
    wallDetectRequestRef.current += 1;
    handleCandidateDragCancel();
    handleCancelDt();
    setSelectedWallCandidateId(null);
    setSelectedCandidateId(null);
    setPlan((current) => ({
      ...current,
      selectedPage: pageNumber,
      calibration:
        current.calibration?.pageNumber === pageNumber
          ? current.calibration
          : null,
    }));
  }

  function handleCalibration(calibration: PlanCalibration) {
    pushHistory();
    setPlan((current) => ({ ...current, calibration }));
  }

  function handleClearCalibration() {
    pushHistory();
    setPlan((current) => ({ ...current, calibration: null }));
  }

  function handleConfirmCalibration() {
    if (!plan.calibration) {
      return;
    }
    pushHistory();
    setPlan((current) => ({
      ...current,
      calibration: current.calibration
        ? { ...current.calibration, confirmed: true }
        : null,
    }));
  }

  async function handleAnalyzePage() {
    if (!pdfDocument || !planPageMeta) {
      return;
    }
    const requestId = analysisRequestRef.current + 1;
    analysisRequestRef.current = requestId;
    const analysisId = `analysis-${plan.fileName ?? "pdf"}-${plan.selectedPage}`;
    const startedAt = Date.now();
    setPlanAnalysis({
      id: analysisId,
      sourceFile: plan.fileName,
      pageNumber: plan.selectedPage,
      pageWidth: planPageMeta.widthPt,
      pageHeight: planPageMeta.heightPt,
      pageRotation: plan.pageRotation,
      status: "analyzing",
      startedAt,
      completedAt: null,
      version: PLAN_ANALYSIS_VERSION,
      source: "native-pdf-text",
      stale: false,
      textItems: [],
      candidates: [],
      findings: [],
    });
    try {
      const rawItems = await extractPageText(pdfDocument, plan.selectedPage);
      if (requestId !== analysisRequestRef.current) {
        return;
      }
      const result = analyzePlanText({
        rawItems,
        sourceFile: plan.fileName,
        pageNumber: plan.selectedPage,
        pageWidth: planPageMeta.widthPt,
        pageHeight: planPageMeta.heightPt,
        pageRotation: plan.pageRotation,
        analysisId,
        startedAt,
      });
      nativeAnalysisRef.current = result;
      const combined = ocrAnalysisRef.current
        ? mergePlanAnalyses(result, ocrAnalysisRef.current)
        : result;
      setPlanAnalysis({
        ...combined,
        candidates: preserveCandidateReviews(
          planAnalysis?.candidates ?? [],
          combined.candidates,
        ),
      });
    } catch (error) {
      if (requestId !== analysisRequestRef.current) {
        return;
      }
      setPlanAnalysis((current) =>
        current
          ? {
              ...current,
              status: "failed",
              completedAt: Date.now(),
              findings: [
                {
                  id: "extract-error",
                  severity: "error",
                  message:
                    error instanceof Error
                      ? error.message
                      : "Native text extraction failed.",
                },
              ],
            }
          : current,
      );
    }
  }

  function handleSelectCandidate(id: string | null) {
    setSelectedCandidateId(id);
  }

  function handleReviewCandidate(
    id: string,
    review: "accepted" | "rejected" | "unreviewed",
  ) {
    setPlanAnalysis((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) =>
              candidate.id === id ? { ...candidate, review } : candidate,
            ),
          }
        : current,
    );
  }

  function handleCorrectCandidate(id: string, meters: number) {
    setPlanAnalysis((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) =>
              candidate.id === id
                ? { ...candidate, correctedMeters: meters, review: "accepted" }
                : candidate,
            ),
          }
        : current,
    );
  }

  function handleLocateCandidate(id: string) {
    locateAnalysisRef.current?.(id);
  }

  function handleUseForScale(id: string) {
    const candidate = planAnalysis?.candidates.find((item) => item.id === id);
    if (!candidate || analysisStale) {
      return;
    }
    const meters = candidate.correctedMeters ?? candidate.meters;
    setAssistedCalibration({ candidateId: id, meters });
    setPendingAssistedCalibration(null);
    setAssistedCalibrationWarning(null);
    setAssistedWarningsAcknowledged(false);
    setWorkspace("plan");
    setPlan((current) => ({ ...current, alignMode: false }));
  }

  function handleAssistedCalibrationComplete(
    candidateId: string,
    pointA: { x: number; y: number },
    pointB: { x: number; y: number },
    pixels: number,
  ) {
    const candidate = planAnalysis?.candidates.find(
      (item) => item.id === candidateId,
    );
    if (!candidate || pixels <= 4) {
      return;
    }
    const meters = candidate.correctedMeters ?? candidate.meters;
    if (!Number.isFinite(meters) || meters <= 0) {
      return;
    }
    setPendingAssistedCalibration({
      candidateId,
      pointA,
      pointB,
      meters,
      pixelsPerMeter: pixels / meters,
    });
    setAssistedCalibration(null);
  }

  function handleConfirmAssistedCalibration() {
    const pending = pendingAssistedCalibration;
    if (!pending) {
      return;
    }
    const candidate = planAnalysis?.candidates.find(
      (item) => item.id === pending.candidateId,
    );
    const source: "native-pdf-text" | "raster-ocr" | "combined" =
      candidate?.sourceType ?? "native-pdf-text";
    const calibration: PlanCalibration = {
      pageNumber: plan.selectedPage,
      pointA: pending.pointA,
      pointB: pending.pointB,
      realDistanceMeters: pending.meters,
      pixelsPerMeter: pending.pixelsPerMeter,
      confirmed: true,
      assisted: { candidateId: pending.candidateId, source },
    };
    const validation = validateCalibration(
      calibration,
      plan.selectedPage,
      planPageMeta,
    );
    if (validation.severity === "error") {
      setAssistedCalibrationWarning(validation.message);
      return;
    }
    if (validation.severity === "warning" && !assistedWarningsAcknowledged) {
      setAssistedCalibrationWarning(validation.message);
      return;
    }
    pushHistory();
    setPlan((current) => ({ ...current, calibration }));
    setPlanAnalysis((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) =>
              candidate.id === pending.candidateId
                ? { ...candidate, review: "accepted" }
                : candidate,
            ),
          }
        : current,
    );
    setPendingAssistedCalibration(null);
    setAssistedCalibrationWarning(null);
    setAssistedWarningsAcknowledged(false);
  }

  function handleCancelAssistedCalibration() {
    setPendingAssistedCalibration(null);
    setAssistedCalibration(null);
    setAssistedCalibrationWarning(null);
    setAssistedWarningsAcknowledged(false);
  }

  async function handleRunOcr() {
    if (!pdfDocument || !planPageMeta) {
      return;
    }
    if (ocrStatus === "initializing" || ocrStatus === "recognizing") {
      return;
    }
    const requestId = ocrRequestRef.current + 1;
    ocrRequestRef.current = requestId;
    setOcrStatus("initializing");
    setOcrProgress(0);
    setOcrError(null);
    setOcrRegionSelecting(false);

    try {
      const crop = ocrMode === "region" ? ocrRegionRef.current : null;
      const raster = await renderOcrRaster(pdfDocument, plan.selectedPage, crop ?? undefined);
      if (requestId !== ocrRequestRef.current) {
        return;
      }
      const preprocessed = preprocessOcrImage(raster.canvas, ocrPreset);
      const result = await runTesseractOcr(
        preprocessed,
        (progress) => {
          if (requestId !== ocrRequestRef.current) {
            return;
          }
          if (progress.status === "recognizing text") {
            setOcrStatus("recognizing");
            setOcrProgress(progress.progress);
          }
        },
        () => requestId !== ocrRequestRef.current,
      );
      if (requestId !== ocrRequestRef.current) {
        return;
      }

      const words = result.words;
      const totalConfidence = words.reduce((sum, word) => sum + word.confidence, 0);
      const averageConfidence = words.length > 0 ? totalConfidence / words.length : 0;
      setOcrWordCount(words.length);
      setOcrAverageConfidence(averageConfidence);
      setOcrLowConfidenceCount(words.filter((word) => word.confidence < 0.6).length);
      setOcrCompletedAt(Date.now());

      const ocrAnalysis = analyzeOcrWords({
        words,
        mapping: {
          scale: raster.scale,
          crop: raster.crop,
          pageWidth: raster.widthPt,
          pageHeight: raster.heightPt,
        },
        sourceFile: plan.fileName,
        pageNumber: plan.selectedPage,
        pageRotation: plan.pageRotation,
        analysisId: `ocr-${plan.fileName ?? "pdf"}-${plan.selectedPage}`,
        startedAt: Date.now(),
      });
      ocrAnalysisRef.current = ocrAnalysis;
      const combined = nativeAnalysisRef.current
        ? mergePlanAnalyses(nativeAnalysisRef.current, ocrAnalysis)
        : ocrAnalysis;
      setPlanAnalysis({
        ...combined,
        candidates: preserveCandidateReviews(
          planAnalysis?.candidates ?? [],
          combined.candidates,
        ),
      });
      setOcrStatus("complete");
      setOcrProgress(1);
    } catch (error) {
      if (requestId !== ocrRequestRef.current) {
        return;
      }
      if (error instanceof OcrCancelledError) {
        setOcrStatus("cancelled");
      } else {
        setOcrStatus("failed");
        setOcrError(error instanceof Error ? error.message : "OCR failed.");
      }
    }
  }

  function handleCancelOcr() {
    ocrRequestRef.current += 1;
    setOcrRegionSelecting(false);
    void terminateOcrWorker();
    setOcrStatus("cancelled");
  }

  function handleStartOcrRegion() {
    setOcrMode("region");
    setOcrRegionSelecting(true);
    setWorkspace("plan");
  }

  function handleOcrRegionSelected(crop: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) {
    ocrRegionRef.current = crop;
    setOcrRegionSelecting(false);
  }

  async function handleDetectWalls() {
    if (!pdfDocument || !planPageMeta) {
      return;
    }
    if (wallDetectStatus === "analyzing") {
      return;
    }
    const requestId = wallDetectRequestRef.current + 1;
    wallDetectRequestRef.current = requestId;
    handleCancelDt();
    setWallDetectStatus("analyzing");
    setWallDetectError(null);
    try {
      const raster = await renderOcrRaster(pdfDocument, plan.selectedPage);
      if (requestId !== wallDetectRequestRef.current) {
        return;
      }
      const context = raster.canvas.getContext("2d", { willReadFrequently: true });
      const pixels = context
        ? context.getImageData(0, 0, raster.canvas.width, raster.canvas.height).data
        : new Uint8ClampedArray(raster.canvas.width * raster.canvas.height * 4);
      const textBounds =
        planAnalysis?.textItems.map((item) => ({
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        })) ?? [];
      const analysis = await detectWallsInWorker({
        raster: {
          pixels,
          width: raster.canvas.width,
          height: raster.canvas.height,
          scale: raster.scale,
          crop: raster.crop,
          widthPt: raster.widthPt,
          heightPt: raster.heightPt,
        },
        preset: wallPreset,
        settings: wallSettings,
        sourceFile: plan.fileName,
        pageNumber: plan.selectedPage,
        pageRotation: plan.pageRotation,
        analysisId: `walls-${plan.fileName ?? "pdf"}-${plan.selectedPage}`,
        startedAt: Date.now(),
        pixelsPerMeter: plan.calibration?.pixelsPerMeter ?? null,
        textBounds,
        useTextAware: useTextAwareWallFilter,
      });
      if (requestId !== wallDetectRequestRef.current) {
        return;
      }
      setWallDetection(analysis);
      setWallDetectStatus("complete");
      setSelectedWallCandidateId(null);
    } catch (error) {
      if (requestId !== wallDetectRequestRef.current) {
        return;
      }
      setWallDetectStatus("failed");
      setWallDetectError(
        error instanceof Error ? error.message : "Wall detection failed.",
      );
    }
  }

  function handleCancelWallDetection() {
    wallDetectRequestRef.current += 1;
    cancelWallDetectionWorker();
    setWallDetectStatus("cancelled");
  }

  function handleReviewWallCandidate(
    id: string,
    review: "unreviewed" | "accepted" | "rejected" | "edited",
  ) {
    pushHistory();
    setWallDetection((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) =>
              candidate.id === id ? { ...candidate, review } : candidate,
            ),
          }
        : current,
    );
  }

  function handleBulkAcceptHighConfidence() {
    pushHistory();
    setWallDetection((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) =>
              candidate.confidence >= 0.7 ? { ...candidate, review: "accepted" } : candidate,
            ),
          }
        : current,
    );
  }

  function handleBulkRejectBelowThreshold() {
    pushHistory();
    setWallDetection((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) =>
              candidate.confidence < wallSettings.minConfidence
                ? { ...candidate, review: "rejected" }
                : candidate,
            ),
          }
        : current,
    );
  }

  function handleResetWallReviews() {
    pushHistory();
    setWallDetection((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) => ({
              ...candidate,
              review: "unreviewed",
            })),
          }
        : current,
    );
  }

  function handleReviewWallDetection() {
    setTraceMode("review-wall-detection");
    setSelectedTracePointId(null);
    setSelectedTraceWallId(null);
    setSelectedTraceOpeningId(null);
    setSelectedWallCandidateId(null);
    setWorkspace("plan");
    setPlan((current) => ({ ...current, alignMode: false }));
  }

  function handleExitWallReview() {
    handleCandidateDragCancel();
    if (traceMode === "review-wall-detection") {
      setTraceMode("select");
    }
    setSelectedWallCandidateId(null);
  }

  function handleSplitWallCandidate(id: string) {
    pushHistory();
    setWallDetection((current) => {
      if (!current) return current;
      const candidate = current.candidates.find((item) => item.id === id);
      if (!candidate) return current;
      const split = splitWallCandidate(candidate, 0.5);
      if (!split) return current;
      return {
        ...current,
        candidates: [
          ...current.candidates.filter((item) => item.id !== id),
          { ...split.a, review: "edited" },
          { ...split.b, review: "edited" },
        ],
      };
    });
    setSelectedWallCandidateId(null);
  }

  function handleTreatLineAsWall(id: string) {
    pushHistory();
    setWallDetection((current) => {
      if (!current) return current;
      const line = current.cleanedLines.find((item) => item.id === id);
      if (!line) return current;
      const canonicalThickness = plan.calibration?.pixelsPerMeter
        ? 0.1143 * plan.calibration.pixelsPerMeter
        : wallSettings.minThicknessPx;
      const candidate = inferSingleLineWall(line, canonicalThickness, null);
      return { ...current, candidates: [...current.candidates, candidate] };
    });
  }

  function handleResetWallCandidate(id: string) {
    pushHistory();
    setWallDetection((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) => {
              if (candidate.id !== id || !candidate.original) return candidate;
              return {
                ...candidate,
                centerline: candidate.original.centerline,
                thicknessPx: candidate.original.thicknessPx,
                thicknessM: candidate.original.thicknessM,
                heightM: candidate.original.heightM,
                angleDeg: candidate.original.angleDeg,
                lengthPx: candidate.original.lengthPx,
                lengthM: candidate.original.lengthM,
                confidence: candidate.original.confidence,
                reasons: candidate.original.reasons,
                review: "unreviewed",
              };
            }),
          }
        : current,
    );
  }

  function handleUpdateWallCandidate(
    candidateId: string,
    patch: WallCandidatePatch,
  ) {
    const candidate = wallDetection?.candidates.find(
      (item) => item.id === candidateId,
    );
    if (!candidate) {
      return;
    }
    const updated = updateWallCandidateGeometry(
      candidate,
      patch,
      plan.calibration?.pixelsPerMeter ?? null,
    );
    pushHistory();
    setWallDetection((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((item) =>
              item.id === candidateId ? updated : item,
            ),
          }
        : current,
    );
  }

  function buildDetectionToTraceResult(mode: "replace" | "append") {
    if (!wallDetection) {
      return null;
    }
    return convertDetectionToTrace(wallDetection, trace, {
      mode,
      minConfidence: wallSettings.minConfidence,
      endpointTolerance: 8,
      defaultWallHeight: 2.7,
      defaultWallThickness: 0.15,
    });
  }

  function handleOpenDetectionToTrace() {
    if (!wallDetection) {
      return;
    }
    const mode = trace && Object.keys(trace.walls).length > 0 ? "append" : "replace";
    const result = buildDetectionToTraceResult(mode);
    if (!result) {
      return;
    }
    setDtMode(mode);
    setDtResult(result);
    setDtAcknowledged(false);
    setPreviewTrace(null);
    setDtReviewOpen(true);
  }

  function handleChangeDtMode(mode: "replace" | "append") {
    const result = buildDetectionToTraceResult(mode);
    if (!result) {
      return;
    }
    setDtMode(mode);
    setDtResult(result);
    setDtAcknowledged(false);
    setPreviewTrace(null);
  }

  function handlePreviewDt() {
    if (dtResult) {
      setPreviewTrace(dtResult.trace);
    }
  }

  function handleCommitDt() {
    if (!dtResult) {
      return;
    }
    pushHistory();
    setTrace(dtResult.trace);
    setDtReviewOpen(false);
    setDtResult(null);
    setDtAcknowledged(false);
    setPreviewTrace(null);
    setTraceMode("select");
    setSelectedTracePointId(null);
    setSelectedTraceWallId(null);
    setSelectedTraceOpeningId(null);
  }

  function handleCancelDt() {
    setDtReviewOpen(false);
    setDtResult(null);
    setDtAcknowledged(false);
    setPreviewTrace(null);
  }

  function handleDetectOpenings() {
    const structuralSegments = wallDetection?.cleanedLines ?? [];
    const textItems = planAnalysis?.textItems ?? [];
    const input: OpeningDetectionCoreInput = {
      detectedWalls: wallDetection?.candidates,
      tracedWalls: trace
        ? Object.values(trace.walls).map((wall) => ({ wall, points: trace.points }))
        : [],
      structuralSegments,
      textItems,
      pixelsPerMeter: plan.calibration?.pixelsPerMeter ?? null,
      settings: openingDetectionSettings,
      sourceFile: plan.fileName,
      pageNumber: plan.selectedPage,
    };
    if (
      (!wallDetection || wallDetection.candidates.length === 0) &&
      (!trace || Object.keys(trace.walls).length === 0)
    ) {
      setOpeningDetectionError("Create or accept wall geometry before detecting openings.");
      return;
    }
    setOpeningDetectionRunning(true);
    setOpeningDetectionError(null);
    setSelectedOpeningCandidateId(null);
    setTraceMode("select");
    setTimeout(() => {
      const result = runOpeningDetectionCore(input);
      setOpeningDetection(result);
      setOpeningDetectionRunning(false);
    }, 0);
  }

  function handleReviewOpeningCandidate(
    id: string,
    review: "unreviewed" | "accepted" | "rejected" | "edited",
  ) {
    pushHistory();
    setOpeningDetection((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((c) =>
              c.id === id ? { ...c, review } : c,
            ),
          }
        : current,
    );
  }

  function handleReviewOpenings() {
    setTraceMode("review-opening-detection");
    setSelectedOpeningCandidateId(null);
    setWorkspace("plan");
  }

  function handleExitOpeningReview() {
    if (traceMode === "review-opening-detection") {
      setTraceMode("select");
    }
    setSelectedOpeningCandidateId(null);
  }

  function handleAddReviewedOpenings() {
    if (!openingDetection || !trace) {
      return;
    }
    const result = convertDetectionToOpenings(openingDetection, trace, {
      includeAccepted: true,
      includeEdited: true,
      allowAcceptedUnknown: true,
      duplicateTolerance: 1,
    });
    if (result.errors.length > 0 || result.addedIds.length === 0) {
      return;
    }
    pushHistory();
    setTrace(result.trace);
    setTraceMode("select");
    setSelectedOpeningCandidateId(null);
  }

  function handleAddCabinet(catalogId: string) {
    const entry = getCatalogEntry(catalogId);
    if (!entry) {
      return;
    }
    idCounterRef.current += 1;
    const id = `cab-${idCounterRef.current}`;
    const y = entry.category === "wall" ? 1.37 : 0;
    const count = Object.keys(cabinetInstances).length;
    const instance = createCabinetInstance(catalogId, id, [count * 0.4, y, 0]);
    if (!instance) {
      return;
    }
    pushHistory();
    setCabinetInstances((current) => ({ ...current, [id]: instance }));
    setSelectedCabinetIds([id]);
    setWorkspace("3d");
  }

  function handleSelectCabinet(id: string, additive: boolean) {
    setSelectedCabinetIds((current) =>
      additive
        ? current.includes(id)
          ? current.filter((x) => x !== id)
          : [...current, id]
        : [id],
    );
  }

  function handleUpdateCabinet(id: string, patch: Partial<CabinetInstance>) {
    pushHistory();
    setCabinetInstances((current) =>
      current[id] ? { ...current, [id]: { ...current[id], ...patch } } : current,
    );
  }

  function handleDuplicateCabinet(id: string) {
    const source = cabinetInstances[id];
    if (!source) return;
    idCounterRef.current += 1;
    const newId = `cab-${idCounterRef.current}`;
    const copy: CabinetInstance = {
      ...source,
      id: newId,
      name: `${source.name} Copy`,
      position: [source.position[0] + 0.4, source.position[1], source.position[2]],
    };
    pushHistory();
    setCabinetInstances((current) => ({ ...current, [newId]: copy }));
    setSelectedCabinetIds([newId]);
  }

  function handleResetCabinet(id: string) {
    const source = cabinetInstances[id];
    const entry = source && getCatalogEntry(source.catalogId);
    if (!source || !entry) return;
    pushHistory();
    setCabinetInstances((current) => {
      const reset = createCabinetInstance(source.catalogId, id, source.position);
      return reset ? { ...current, [id]: reset } : current;
    });
  }

  function handleToggleCabinetLock(id: string) {
    pushHistory();
    setCabinetInstances((current) =>
      current[id] ? { ...current, [id]: { ...current[id], locked: !current[id].locked } } : current,
    );
  }

  function handleHideCabinet(id: string) {
    pushHistory();
    setCabinetInstances((current) =>
      current[id] ? { ...current, [id]: { ...current[id], hidden: true } } : current,
    );
    setSelectedCabinetIds((current) => current.filter((x) => x !== id));
  }

  function handleRenameCabinet(id: string, name: string) {
    if (!name) return;
    pushHistory();
    setCabinetInstances((current) =>
      current[id] ? { ...current, [id]: { ...current[id], name } } : current,
    );
  }

  function handleCabinetMoveCommit(
    id: string,
    position: [number, number, number],
  ) {
    const cabinet = cabinetInstances[id];
    setCabinetTransformPreview(null);
    if (!cabinet) return;
    const changed =
      cabinet.position[0] !== position[0] ||
      cabinet.position[1] !== position[1] ||
      cabinet.position[2] !== position[2];
    if (!changed) return;
    pushHistory();
    setCabinetInstances((current) =>
      current[id] ? { ...current, [id]: { ...current[id], position } } : current,
    );
  }

  function handleCabinetMoveStart(id: string, position: [number, number, number]) {
    setCabinetTransformPreview({
      kind: "move",
      id,
      start: position,
      current: position,
    });
  }

  function handleCabinetMovePreview(
    id: string,
    position: [number, number, number],
  ) {
    setCabinetTransformPreview((current) =>
      current && current.kind === "move"
        ? { ...current, current: position }
        : current,
    );
  }

  function handleCabinetMoveCancel() {
    setCabinetTransformPreview(null);
  }

  function handleCabinetRotateStart(
    id: string,
    rotation: [number, number, number],
  ) {
    setCabinetTransformPreview({
      kind: "rotate",
      id,
      startRotation: rotation,
      currentRotation: rotation,
    });
  }

  function handleCabinetRotatePreview(
    id: string,
    rotation: [number, number, number],
  ) {
    setCabinetTransformPreview((current) =>
      current && current.kind === "rotate"
        ? { ...current, currentRotation: rotation }
        : current,
    );
  }

  function handleCabinetRotateCommit(
    id: string,
    rotation: [number, number, number],
  ) {
    const cabinet = cabinetInstances[id];
    setCabinetTransformPreview(null);
    if (!cabinet) return;
    const changed =
      cabinet.rotation[0] !== rotation[0] ||
      cabinet.rotation[1] !== rotation[1] ||
      cabinet.rotation[2] !== rotation[2];
    if (!changed) return;
    pushHistory();
    setCabinetInstances((current) =>
      current[id] ? { ...current, [id]: { ...current[id], rotation } } : current,
    );
  }

  function handleAssignCabinetFinish(
    ids: string[],
    finishZone: MaterialZoneId | null,
  ) {
    const changed = ids.some(
      (id) =>
        cabinetInstances[id] &&
        cabinetInstances[id].finishZone !== finishZone,
    );
    if (!changed) return;
    pushHistory();
    setCabinetInstances((current) => {
      const next = { ...current };
      for (const id of ids) {
        if (next[id]) next[id] = { ...next[id], finishZone };
      }
      return next;
    });
  }

  function handleCreateStarterRun() {
    const wall = room.walls.find((w) => w.id === selectedWallId);
    if (!wall) return;
    idCounterRef.current += 1;
    const runId = `run-${idCounterRef.current}`;
    const result = computeRunPlacement(
      wall, "base", ["B24", "B24", "B24"], 0.2, 1, 0, runId, "perimeter",
    );
    if (result.errors.length > 0) return;
    setCabinetRunProposal({
      run: {
        id: runId,
        name: "Base Run 1",
        wallId: wall.id,
        type: "base",
        memberIds: result.cabinets.map((c) => c.id),
        startOffset: 0.2,
        occupiedLength: result.occupiedLength,
        side: 1,
        finishZone: "perimeter",
        mountingHeight: 0,
        modified: false,
      },
      cabinets: result.cabinets,
      wallId: wall.id,
      side: 1,
      catalogIds: ["B24", "B24", "B24"],
      name: "Base Run 1",
      startOffset: 0.2,
      finishZone: "perimeter",
    });
    setWorkspace("3d");
  }

  function rebuildRunProposal(
    wallId: string,
    side: 1 | -1,
    catalogIds: string[],
    name: string,
    startOffset: number,
    finishZone: "perimeter" | "island",
  ) {
    const wall = room.walls.find((w) => w.id === wallId);
    if (!wall || !cabinetRunProposal) return;
    const result = computeRunPlacement(
      wall, "base", catalogIds, startOffset, side, 0,
      cabinetRunProposal.run.id, finishZone,
    );
    setCabinetRunProposal({
      ...cabinetRunProposal,
      side,
      catalogIds,
      name,
      startOffset,
      finishZone,
      run: {
        ...cabinetRunProposal.run,
        name,
        side,
        startOffset,
        finishZone,
        memberIds: result.cabinets.map((c) => c.id),
        occupiedLength: result.occupiedLength,
      },
      cabinets: result.cabinets,
    });
  }

  function handleFlipRunSide() {
    if (!cabinetRunProposal) return;
    const nextSide = cabinetRunProposal.side === 1 ? -1 : 1;
    rebuildRunProposal(
      cabinetRunProposal.wallId,
      nextSide,
      cabinetRunProposal.catalogIds,
      cabinetRunProposal.name,
      cabinetRunProposal.startOffset,
      cabinetRunProposal.finishZone,
    );
  }

  function handleAddRunItem(catalogId: string) {
    if (!cabinetRunProposal) return;
    rebuildRunProposal(
      cabinetRunProposal.wallId,
      cabinetRunProposal.side,
      [...cabinetRunProposal.catalogIds, catalogId],
      cabinetRunProposal.name,
      cabinetRunProposal.startOffset,
      cabinetRunProposal.finishZone,
    );
  }

  function handleRemoveRunItem(index: number) {
    if (!cabinetRunProposal) return;
    rebuildRunProposal(
      cabinetRunProposal.wallId,
      cabinetRunProposal.side,
      cabinetRunProposal.catalogIds.filter((_, i) => i !== index),
      cabinetRunProposal.name,
      cabinetRunProposal.startOffset,
      cabinetRunProposal.finishZone,
    );
  }

  function handleMoveRunItem(index: number, direction: -1 | 1) {
    if (!cabinetRunProposal) return;
    const ids = [...cabinetRunProposal.catalogIds];
    const target = index + direction;
    if (target < 0 || target >= ids.length) return;
    [ids[index], ids[target]] = [ids[target], ids[index]];
    rebuildRunProposal(
      cabinetRunProposal.wallId,
      cabinetRunProposal.side,
      ids,
      cabinetRunProposal.name,
      cabinetRunProposal.startOffset,
      cabinetRunProposal.finishZone,
    );
  }

  function handleSetRunName(name: string) {
    if (!cabinetRunProposal) return;
    setCabinetRunProposal({ ...cabinetRunProposal, name, run: { ...cabinetRunProposal.run, name } });
  }

  function handleSetRunOffset(startOffset: number) {
    if (!cabinetRunProposal) return;
    rebuildRunProposal(
      cabinetRunProposal.wallId,
      cabinetRunProposal.side,
      cabinetRunProposal.catalogIds,
      cabinetRunProposal.name,
      startOffset,
      cabinetRunProposal.finishZone,
    );
  }

  function handleSetRunFinish(finishZone: "perimeter" | "island") {
    if (!cabinetRunProposal) return;
    rebuildRunProposal(
      cabinetRunProposal.wallId,
      cabinetRunProposal.side,
      cabinetRunProposal.catalogIds,
      cabinetRunProposal.name,
      cabinetRunProposal.startOffset,
      finishZone,
    );
  }

  function handleCommitRunProposal() {
    if (!cabinetRunProposal) return;
    pushHistory();
    const members: Record<string, CabinetInstance> = {};
    for (const cabinet of cabinetRunProposal.cabinets) members[cabinet.id] = cabinet;
    setCabinetInstances((current) => ({ ...current, ...members }));
    setCabinetRuns((current) => ({ ...current, [cabinetRunProposal.run.id]: cabinetRunProposal.run }));
    setSelectedCabinetIds(cabinetRunProposal.cabinets.map((c) => c.id));
    setCabinetRunProposal(null);
  }

  function handleCancelRunProposal() {
    setCabinetRunProposal(null);
  }

  function handleReturnToSimple() {
    handleCancelRunProposal();
    handleCancelReview();
    handleCancelDt();
    handleExitWallReview();
    handleExitOpeningReview();
    handleCandidateDragCancel();
    handleWallCancel();
    handleUnderlayCancel();
    handleTraceCancel();
    setTransformMode(null);
    setWorkspace("3d");
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setSelectedKeys([]);
    setSelectedCabinetIds([]);
    setTraceMode(null);
    setJoinSourcePointId(null);
    setSelectedTracePointId(null);
    setSelectedTraceWallId(null);
    setSelectedTraceOpeningId(null);
    setSelectedWallCandidateId(null);
    setSelectedOpeningCandidateId(null);
    setOcrRegionSelecting(false);
    setAssistedCalibration(null);
    setPendingAssistedCalibration(null);
    setPlan((current) => ({ ...current, alignMode: false }));
    setExperienceMode("simple");
    if (room.walls.length > 0) {
      setSimpleStage("design");
    } else if (plan.fileName) {
      setSimpleStage("review");
    } else {
      setSimpleStage("upload");
    }
  }

  function handleCandidateDragStart() {
    const candidate = wallDetection?.candidates.find(
      (item) => item.id === selectedWallCandidateId,
    );
    if (!candidate) {
      return;
    }
    wallDragSourceRef.current = candidate;
    setWallDragPreview(candidate);
  }

  function handleCandidateDragPreview(candidate: DetectedWallCandidate) {
    setWallDragPreview(candidate);
  }

  function handleCandidateDragCommit() {
    const source = wallDragSourceRef.current;
    const preview = wallDragPreview;
    wallDragSourceRef.current = null;
    setWallDragPreview(null);
    if (!source || !preview || preview === source) {
      return;
    }
    pushHistory();
    setWallDetection((current) =>
      current
        ? {
            ...current,
            candidates: current.candidates.map((candidate) =>
              candidate.id === preview.id
                ? { ...preview, review: "edited" }
                : candidate,
            ),
          }
        : current,
    );
  }

  function handleCandidateDragCancel() {
    wallDragSourceRef.current = null;
    setWallDragPreview(null);
  }

  function handleUnderlay(patch: Partial<PlanUnderlayAlignment>) {
    pushHistory();
    setPlan((current) => ({
      ...current,
      underlay: { ...current.underlay, ...patch },
    }));
  }

  function handleResetUnderlay() {
    pushHistory();
    setPlan((current) => ({
      ...current,
      underlay: DEFAULT_PLAN_STATE.underlay,
    }));
  }

  function handleAlignMode(mode: boolean) {
    setPlan((current) => ({ ...current, alignMode: mode }));
  }

  function handleHideFloor(hidden: boolean) {
    setPlan((current) => ({ ...current, hideFloor: hidden }));
  }

  function handleCenterUnderlay() {
    pushHistory();
    setPlan((current) => ({
      ...current,
      underlay: { ...current.underlay, position: { x: 0, z: 0 } },
    }));
  }

  function handleAlignToOrigin() {
    pushHistory();
    setPlan((current) => ({
      ...current,
      underlay: { ...current.underlay, position: { x: 0, z: 0 }, rotation: 0 },
    }));
  }

  const calibrationId = plan.calibration
    ? `cal-${plan.selectedPage}-${plan.calibration.pixelsPerMeter}`
    : null;

  const traceFindings = useMemo<TraceFinding[]>(() => {
    if (!trace) {
      return [];
    }
    return validateTrace({
      trace,
      calibrationId,
      activePage: plan.selectedPage,
    });
  }, [trace, calibrationId, plan.selectedPage]);

  function handleStartTrace() {
    if (!plan.calibration?.confirmed || !planPageMeta) {
      return;
    }
    idCounterRef.current += 1;
    const id = `trace-${idCounterRef.current}`;
    setTrace(
      emptyTrace(
        plan.selectedPage,
        calibrationId ?? id,
        planPageMeta.widthPt,
        planPageMeta.heightPt,
        plan.pageRotation,
      ),
    );
    traceOrderRef.current = [];
    traceCursorRef.current = null;
    setTraceOrder([]);
    setActiveTracePointId(null);
    setTraceMode("draw-wall");
  }

  function handleTraceClick(point: { x: number; y: number }) {
    if (traceMode !== "draw-wall" || !trace) {
      return;
    }
    const order = traceOrderRef.current;
    const firstPoint = order.length > 0 ? trace.points[order[0]] : null;
    const cursor = traceCursorRef.current;

    if (cursor && firstPoint) {
      const distanceToFirst = Math.hypot(
        point.x - firstPoint.x,
        point.y - firstPoint.y,
      );
      if (distanceToFirst < 12) {
        idCounterRef.current += 1;
        const wallId = `w-${idCounterRef.current}`;
        setTrace((current) =>
          current
            ? {
                ...current,
                walls: {
                  ...current.walls,
                  [wallId]: {
                    id: wallId,
                    startPointId: cursor,
                    endPointId: firstPoint.id,
                    height: 2.7,
                    thickness: 0.15,
                  },
                },
                closed: true,
              }
            : current,
        );
        traceCursorRef.current = null;
        setActiveTracePointId(null);
        setTraceMode("select");
        return;
      }
    }

    idCounterRef.current += 1;
    const pointId = `p-${idCounterRef.current}`;
    const newPoint: TracePoint = { id: pointId, x: point.x, y: point.y };
    setTrace((current) => {
      if (!current) {
        return current;
      }
      const next: PlanTrace = {
        ...current,
        points: { ...current.points, [pointId]: newPoint },
      };
      if (cursor) {
        idCounterRef.current += 1;
        const wallId = `w-${idCounterRef.current}`;
        next.walls = {
          ...current.walls,
          [wallId]: {
            id: wallId,
            startPointId: cursor,
            endPointId: pointId,
            height: 2.7,
            thickness: 0.15,
          },
        };
      }
      return next;
    });
    traceOrderRef.current = [...order, pointId];
    traceCursorRef.current = pointId;
    setTraceOrder([...order, pointId]);
    setActiveTracePointId(pointId);
  }

  function handleFinishTrace() {
    traceCursorRef.current = null;
    setActiveTracePointId(null);
    setTraceMode("select");
  }

  function handleTraceBackspace() {
    if (traceMode !== "draw-wall" || !trace) {
      return;
    }
    const order = traceOrderRef.current;
    if (order.length === 0) {
      setTrace(null);
      setTraceMode(null);
      return;
    }
    const lastPointId = order[order.length - 1];
    setTrace((current) => {
      if (!current) {
        return current;
      }
      const points = { ...current.points };
      delete points[lastPointId];
      const walls = Object.fromEntries(
        Object.entries(current.walls).filter(
          ([, wall]) =>
            wall.startPointId !== lastPointId && wall.endPointId !== lastPointId,
        ),
      );
      return { ...current, points, walls, closed: false };
    });
    traceOrderRef.current = order.slice(0, -1);
    traceCursorRef.current = order.length > 1 ? order[order.length - 2] : null;
    setTraceOrder(order.slice(0, -1));
    setActiveTracePointId(order.length > 1 ? order[order.length - 2] : null);
  }

  function handleClearTrace() {
    setTrace(null);
    traceOrderRef.current = [];
    traceCursorRef.current = null;
    setTraceOrder([]);
    setActiveTracePointId(null);
    setTraceMode(null);
  }

  function buildRoomGenerationMetadata(
    generated: RoomLayout,
  ): RoomGenerationMetadata {
    const openings = generated.walls.flatMap((wall) => wall.openings);
    return {
      generatedAt: Date.now(),
      roomId: `generated-room-${Date.now()}`,
      traceSignature: traceSignature(trace) ?? "",
      calibrationSignature: calibrationSignature(plan.calibration) ?? "",
      sourceFileName: plan.fileName,
      sourcePage: plan.selectedPage,
      underlaySignature: underlaySignature(plan.underlay),
      wallCount: generated.walls.length,
      openingCount: openings.length,
      doorCount: openings.filter((opening) => opening.type === "door").length,
      windowCount: openings.filter((opening) => opening.type === "window")
        .length,
      passageCount: openings.filter((opening) => opening.type === "passage")
        .length,
    };
  }

  function markRoomManuallyEdited() {
    if (roomGeneration) {
      setRoomModifiedAfterGeneration(true);
    }
  }

  function handleOpenReview() {
    if (!trace || !plan.calibration) {
      return;
    }
    const generated = traceToRoomLayout(trace, plan.calibration, plan.underlay);
    setProposedRoom(generated);
    setPreviewRoom(null);
    setReviewAcknowledged(false);
    setWorkspace("3d");
    setTransformMode(null);
    setPlan((current) => ({ ...current, alignMode: false }));
    setReviewing(true);
  }

  function handlePreviewRoom() {
    if (!proposedRoom) {
      return;
    }
    setPreviewRoom(proposedRoom);
    setWorkspace("3d");
    commandRef.current = {
      view: "home",
      ...poseForView("perspective", roomLayoutBounds(proposedRoom)),
    };
  }

  function handleCancelReview() {
    setReviewing(false);
    setProposedRoom(null);
    setPreviewRoom(null);
    setReviewAcknowledged(false);
    commandRef.current = {
      view: "home",
      ...poseForView("perspective", roomLayoutBounds(room)),
    };
  }

  function handleReplaceRoom() {
    if (!proposedRoom) {
      return;
    }
    pushHistory();
    setRoom(proposedRoom);
    setRoomGeneration(buildRoomGenerationMetadata(proposedRoom));
    setRoomModifiedAfterGeneration(false);
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setSelectedTracePointId(null);
    setSelectedTraceWallId(null);
    setSelectedTraceOpeningId(null);
    setTransformMode(null);
    setPlan((current) => ({ ...current, alignMode: false }));
    setReviewing(false);
    setProposedRoom(null);
    setPreviewRoom(null);
    setReviewAcknowledged(false);
    commandRef.current = {
      view: "home",
      ...poseForView("perspective", roomLayoutBounds(proposedRoom)),
    };
  }

  function commitTrace(next: PlanTrace | null) {
    pushHistory();
    setTrace(next);
  }

  function handleTraceDeleteWall(wallId: string) {
    if (!trace) {
      return;
    }
    const hasOpenings = Object.values(trace.openings).some(
      (opening) => opening.wallId === wallId,
    );
    if (
      hasOpenings &&
      !window.confirm(
        "This wall contains openings. Deleting it will remove them too. Continue?",
      )
    ) {
      return;
    }
    commitTrace(deleteWall(trace, wallId));
    setSelectedTraceWallId(null);
    setSelectedTraceOpeningId(null);
  }

  function handleTraceSplitWall(wallId: string) {
    if (!trace) {
      return;
    }
    const wall = trace.walls[wallId];
    const start = wall && trace.points[wall.startPointId];
    const end = wall && trace.points[wall.endPointId];
    if (!start || !end) {
      return;
    }
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const next = splitWallAtDistance(trace, wallId, length / 2);
    if (next) {
      commitTrace(next);
    }
  }

  function handleTraceReverse(wallId: string) {
    if (!trace) {
      return;
    }
    commitTrace(reverseWall(trace, wallId));
  }

  function handleTraceSetWallLength(wallId: string, length: number) {
    if (!trace) {
      return;
    }
    const next = setWallLength(trace, wallId, length);
    if (next) {
      commitTrace(next);
    }
  }

  function handleTraceSetWallProps(
    wallId: string,
    patch: Partial<{ height: number; thickness: number }>,
  ) {
    if (!trace) {
      return;
    }
    const wall = trace.walls[wallId];
    if (!wall) {
      return;
    }
    commitTrace({
      ...trace,
      walls: { ...trace.walls, [wallId]: { ...wall, ...patch } },
    });
  }

  function handleTraceDeletePoint(pointId: string) {
    if (!trace) {
      return;
    }
    const connected = pointConnectedWalls(trace, pointId);
    if (connected.length > 0) {
      return;
    }
    const points = { ...trace.points };
    delete points[pointId];
    commitTrace({ ...trace, points });
    setSelectedTracePointId(null);
  }

  function handleTraceMovePoint(pointId: string, position: { x: number; y: number }) {
    if (!trace) {
      return;
    }
    commitTrace(movePoint(trace, pointId, position));
  }

  function handleTraceSeparateWallEndpoint(wallId: string, endpoint: "start" | "end") {
    if (!trace) {
      return;
    }
    idCounterRef.current += 1;
    const newPointId = `p-sep-${idCounterRef.current}`;
    commitTrace(separateWallEndpoint(trace, wallId, endpoint, newPointId));
  }

  function handleTraceJoinPoints(keepId: string, removeId: string) {
    if (!trace) {
      return;
    }
    const next = joinPoints(trace, keepId, removeId);
    if (next) {
      commitTrace(next);
      setSelectedTracePointId(keepId);
    }
  }

  function handleTraceJoinNearby(pointId: string) {
    if (!trace) {
      return;
    }
    const source = trace.points[pointId];
    if (!source) {
      return;
    }
    const tolerance = 12;
    const candidates = Object.values(trace.points).filter(
      (point) =>
        point.id !== pointId &&
        Math.hypot(point.x - source.x, point.y - source.y) <= tolerance,
    );
    if (candidates.length === 1) {
      handleTraceJoinPoints(pointId, candidates[0].id);
    }
  }

  function handleSetTraceMode(mode: TraceInteractionMode | null) {
    setTraceMode(mode);
    if (mode === "join-points") {
      setJoinSourcePointId(selectedTracePointId);
      setJoinError(null);
      setSelectedTraceWallId(null);
      setSelectedTraceOpeningId(null);
    } else {
      setJoinSourcePointId(null);
      setJoinError(null);
    }
  }

  function handleJoinPointClick(pointId: string) {
    if (!trace) {
      return;
    }
    if (!joinSourcePointId) {
      setJoinSourcePointId(pointId);
      setSelectedTracePointId(pointId);
      setSelectedTraceWallId(null);
      setSelectedTraceOpeningId(null);
      setJoinError(null);
      return;
    }
    if (pointId === joinSourcePointId) {
      setJoinSourcePointId(null);
      setJoinError(null);
      return;
    }
    const error = joinPointsError(trace, joinSourcePointId, pointId);
    if (error) {
      setJoinError(error);
      return;
    }
    handleTraceJoinPoints(pointId, joinSourcePointId);
    setJoinSourcePointId(null);
    setJoinError(null);
    setTraceMode("select");
  }

  function handleCancelJoin() {
    setTraceMode("select");
    setJoinSourcePointId(null);
    setJoinError(null);
  }

  function handleDeleteSelectedTraceEntity() {
    if (selectedTraceOpeningId) {
      handleDeleteTraceOpening(selectedTraceOpeningId);
    } else if (selectedTraceWallId) {
      handleTraceDeleteWall(selectedTraceWallId);
    } else if (selectedTracePointId) {
      handleTraceDeletePoint(selectedTracePointId);
    }
  }

  function handleAddTraceOpening(
    type: "door" | "window" | "passage",
    wallId: string,
    offsetPx: number,
  ) {
    if (!trace || !plan.calibration) {
      return;
    }
    const wall = trace.walls[wallId];
    const start = wall && trace.points[wall.startPointId];
    const end = wall && trace.points[wall.endPointId];
    if (!wall || !start || !end) {
      return;
    }
    const ppm = plan.calibration.pixelsPerMeter;
    const def = openingDefaults[type];
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    const widthPx = Math.min(def.widthM * ppm, length);
    idCounterRef.current += 1;
    const id = `opening-${idCounterRef.current}`;
    const opening: TracedOpening = {
      id,
      wallId: wall.id,
      type,
      offset: Math.min(
        Math.max(offsetPx - widthPx / 2, 0),
        Math.max(length - widthPx, 0),
      ),
      width: widthPx,
      height: def.heightM,
      sillHeight: def.sillM,
    };
    if (openingPlacementStatus(trace, opening) === "invalid") {
      return;
    }
    commitTrace(addOpeningAtWall(trace, wall.id, opening));
    setSelectedTraceOpeningId(id);
    setSelectedTraceWallId(wallId);
    setSelectedTracePointId(null);
  }

  function handleUpdateTraceOpening(opening: TracedOpening) {
    if (!trace) {
      return;
    }
    commitTrace(updateOpening(trace, opening));
    const ppm = plan.calibration?.pixelsPerMeter ?? 1;
    setOpeningDefaults((current) => ({
      ...current,
      [opening.type]: {
        widthM: opening.width / ppm,
        heightM: opening.height,
        sillM: opening.sillHeight,
      },
    }));
  }

  function handleDuplicateTraceOpening(openingId: string) {
    if (!trace) {
      return;
    }
    idCounterRef.current += 1;
    const newId = `opening-${idCounterRef.current}`;
    commitTrace(duplicateOpening(trace, openingId, newId));
    setSelectedTraceOpeningId(newId);
  }

  function handleDeleteTraceOpening(openingId: string) {
    if (!trace) {
      return;
    }
    commitTrace(deleteOpening(trace, openingId));
    setSelectedTraceOpeningId(null);
  }

  function handleCenterTraceOpening(openingId: string) {
    if (!trace) {
      return;
    }
    const opening = trace.openings[openingId];
    const wall = opening && trace.walls[opening.wallId];
    const start = wall && trace.points[wall.startPointId];
    const end = wall && trace.points[wall.endPointId];
    if (!opening || !wall || !start || !end) {
      return;
    }
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    commitTrace(
      updateOpening(trace, {
        ...opening,
        offset: Math.max((length - opening.width) / 2, 0),
      }),
    );
  }

  function handleTraceDragStart() {
    traceDragRef.current = trace;
    setPreviewTrace(trace);
  }

  function handleTracePreview(next: PlanTrace) {
    setPreviewTrace(next);
  }

  function handleTraceCommit() {
    const source = traceDragRef.current;
    if (!source) {
      return;
    }
    const next = previewTrace ?? source;
    traceDragRef.current = null;
    setPreviewTrace(null);
    if (next === source) {
      return;
    }
    pushHistory();
    setTrace(next);
  }

  function handleTraceCancel() {
    traceDragRef.current = null;
    setPreviewTrace(null);
  }

  function handleUnderlayDragStart() {
    underlayDragRef.current = plan.underlay;
  }

  function handleUnderlayPreview(patch: Partial<PlanUnderlayAlignment>) {
    setPlan((current) => ({
      ...current,
      underlay: { ...current.underlay, ...patch },
    }));
  }

  function handleUnderlayCommit() {
    const previous = underlayDragRef.current;
    if (!previous) {
      return;
    }
    const snapshot: StudioSnapshot = {
      transforms,
      room,
      roomGeneration,
      roomModifiedAfterGeneration,
      selectedKeys,
      selectedWallId,
      selectedOpeningId,
      extraObjects,
      trace,
      wallDetection,
      openingDetection,
      cabinetInstances,
      cabinetRuns,
      plan: {
        selectedPage: plan.selectedPage,
        pageRotation: plan.pageRotation,
        pageOpacity: plan.pageOpacity,
        calibration: plan.calibration,
        underlay: previous,
      },
    };
    setPast((current) => [...current, snapshot]);
    setFuture([]);
    underlayDragRef.current = null;
  }

  function handleUnderlayCancel() {
    if (underlayDragRef.current) {
      setPlan((current) => ({
        ...current,
        underlay: underlayDragRef.current!,
      }));
    }
    underlayDragRef.current = null;
  }

  function handleCommitTransforms(patch: Record<string, LocalTransform>) {
    pushHistory();
    setTransforms((current) => {
      const next = { ...current };
      for (const [id, transform] of Object.entries(patch)) {
        next[id] = {
          ...(current[id] ?? DEFAULT_TRANSFORM),
          position: transform.position,
          rotation: transform.rotation,
        };
      }
      return next;
    });
  }

  function handlePositionChange(
    axis: "x" | "y" | "z",
    meters: number,
  ) {
    if (!selectedObject) {
      return;
    }
    pushHistory();
    setTransforms((current) => {
      const id = selectedObject.id;
      const prev = current[id] ?? selectedTransform ?? DEFAULT_TRANSFORM;
      const position: [number, number, number] = [...prev.position];
      position[axis === "x" ? 0 : axis === "y" ? 1 : 2] = meters;
      return { ...current, [id]: { ...prev, position } };
    });
  }

  function handleRotationAxisChange(
    axis: "x" | "y" | "z",
    degrees: number,
  ) {
    if (!selectedObject) {
      return;
    }
    pushHistory();
    setTransforms((current) => {
      const id = selectedObject.id;
      const prev = current[id] ?? selectedTransform ?? DEFAULT_TRANSFORM;
      const rotation: [number, number, number] = [...prev.rotation];
      rotation[axis === "x" ? 0 : axis === "y" ? 1 : 2] =
        THREE.MathUtils.degToRad(degrees);
      return { ...current, [id]: { ...prev, rotation } };
    });
  }

  function handleLockToggle(locked: boolean) {
    if (!selectedObject) {
      return;
    }
    setTransforms((current) => {
      const id = selectedObject.id;
      const prev = current[id] ?? DEFAULT_TRANSFORM;
      return { ...current, [id]: { ...prev, locked } };
    });
  }

  function handleReset() {
    if (selectedKeys.length === 0) {
      return;
    }
    pushHistory();
    setTransforms((current) => {
      const next = { ...current };
      for (const id of selectedKeys) {
        delete next[id];
      }
      return next;
    });
  }

  function handleDelete() {
    if (selectedKeys.length === 0) {
      return;
    }
    if (
      !window.confirm(
        `Delete ${selectedKeys.length} selected object${selectedKeys.length === 1 ? "" : "s"}?`,
      )
    ) {
      return;
    }
    pushHistory();
    setTransforms((current) => {
      const next = { ...current };
      for (const id of selectedKeys) {
        next[id] = {
          ...(current[id] ?? DEFAULT_TRANSFORM),
          hidden: true,
        };
      }
      return next;
    });
    setSelectedKeys([]);
    setTransformMode(null);
  }

  function handleDuplicate() {
    if (selectedKeys.length !== 1) {
      return;
    }
    const sourceId = selectedKeys[0];
    const source = activeObjects.find((o) => o.id === sourceId);
    if (!source) {
      return;
    }
    const targetId = `${sourceId}-copy-${Date.now()}`;
    const ok = sceneApiRef.current?.duplicate(sourceId, targetId);
    if (!ok) {
      return;
    }

    const sourceCurrent =
      transforms[sourceId] ?? {
        position: source.originalPosition,
        rotation: source.originalRotation,
      };
    const newPosition: [number, number, number] = [
      sourceCurrent.position[0] + 0.15,
      sourceCurrent.position[1],
      sourceCurrent.position[2],
    ];

    pushHistory();
    const info: EditableObjectInfo = {
      id: targetId,
      name: `${source.name} copy`,
      size: source.size,
      originalPosition: newPosition,
      originalRotation: sourceCurrent.rotation,
      isDemo: source.isDemo,
      duplicateSourceId: sourceId,
    };
    setExtraObjects((current) => [...current, info]);
    setTransforms((current) => ({
      ...current,
      [targetId]: {
        position: newPosition,
        rotation: sourceCurrent.rotation,
        locked: false,
        hidden: false,
      },
    }));
    setSelectedKeys([targetId]);
  }

  function handleRename(name: string) {
    if (!selectedObject) {
      return;
    }
    const trimmed = name.trim();
    if (!trimmed) {
      return;
    }
    setExtraObjects((current) =>
      current.map((object) =>
        object.id === selectedObject.id ? { ...object, name: trimmed } : object,
      ),
    );
  }

  function handleSelectObject(appId: string | null, additive: boolean) {
    if (!appId) {
      if (!additive) {
        setSelectedKeys([]);
      }
      return;
    }
    setSelectedKeys((current) => {
      if (additive) {
        return current.includes(appId)
          ? current.filter((id) => id !== appId)
          : [...current, appId];
      }
      return [appId];
    });
  }

  function handleSelectNodes(ids: string[], additive: boolean) {
    setSelectedKeys((current) => {
      if (!additive) {
        return ids;
      }
      const next = new Set(current);
      for (const id of ids) {
        next.add(id);
      }
      return [...next];
    });
  }

  function handleSelectZone(zone: MaterialZoneId) {
    if (model) {
      setSelectedKeys(
        Object.entries(assignments)
          .filter(([, assignedZone]) => assignedZone === zone)
          .map(([key]) => key),
      );
    } else {
      setSelectedKeys(
        Object.entries(demoMeshZones)
          .filter(([, assignedZone]) => assignedZone === zone)
          .map(([name]) => name),
      );
    }
  }

  function handleAssignZone(zone: MaterialZoneId) {
    if (!model) {
      return;
    }
    setAssignments((current) => {
      const next = { ...current };
      for (const key of selectedMeshIds) {
        next[key] = zone;
      }
      return next;
    });
  }

  function handleClearZone() {
    if (!model) {
      return;
    }
    setAssignments((current) => {
      const next = { ...current };
      for (const key of selectedMeshIds) {
        delete next[key];
      }
      return next;
    });
  }

  function handleSelectMaterial(
    zone: MaterialZoneId,
    materialId: string | null,
  ) {
    setZoneSelections((current) => ({ ...current, [zone]: materialId }));
    setMaterialsApplied(true);
  }

  function handleFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".glb")) {
      setValidationError("Please choose a .glb file.");
      return;
    }
    if (descriptor?.url) {
      URL.revokeObjectURL(descriptor.url);
    }
    setSelectedKeys([]);
    setAssignments({});
    setTransforms({});
    setExtraObjects([]);
    setRoom(createRoomLayout());
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setImportAlignment(DEFAULT_IMPORT_ALIGNMENT);
    setPast([]);
    setFuture([]);
    setTransformMode(null);
    setValidationError(null);
    setDescriptor({
      url: URL.createObjectURL(file),
      fileName: file.name,
      fileSize: file.size,
    });
  }

  function handleRemove() {
    if (descriptor?.url) {
      URL.revokeObjectURL(descriptor.url);
    }
    setSelectedKeys([]);
    setAssignments({});
    setTransforms({});
    setExtraObjects([]);
    setRoom(createRoomLayout());
    setSelectedWallId(null);
    setSelectedOpeningId(null);
    setImportAlignment(DEFAULT_IMPORT_ALIGNMENT);
    setPast([]);
    setFuture([]);
    setTransformMode(null);
    setValidationError(null);
    setDescriptor(null);
    commandRef.current = { view: "home", ...demoCameraPresets.home };
  }

  function showSnap(message: string) {
    setSnapFlash(message);
    if (snapFlashTimerRef.current) {
      clearTimeout(snapFlashTimerRef.current);
    }
    snapFlashTimerRef.current = setTimeout(() => {
      setSnapFlash(null);
    }, 1200);
  }

  useEffect(() => {
    handlersRef.current = {
      onMove: () => setTransformMode("translate"),
      onRotate: () => setTransformMode("rotate"),
      onCancel: () => {
        if (dtReviewOpen) {
          handleCancelDt();
        } else if (cabinetTransformPreview) {
          handleCabinetMoveCancel();
        } else if (cabinetRunProposal) {
          handleCancelRunProposal();
        } else if (reviewing) {
          handleCancelReview();
        } else {
          setTransformMode(null);
        }
      },
      onDelete: handleDelete,
      onUndo: undo,
      onRedo: redo,
      onTraceSelect: () => handleSetTraceMode("select"),
      onTraceWalls: () => {
        if (plan.calibration?.confirmed) {
          handleSetTraceMode("draw-wall");
        }
      },
      onTraceJoin: () => handleSetTraceMode("join-points"),
      onTraceEscape: () => {
        if (traceMode === "join-points" || joinSourcePointId) {
          handleCancelJoin();
        } else if (traceMode === "review-wall-detection") {
          handleExitWallReview();
        } else if (traceMode === "review-opening-detection") {
          handleExitOpeningReview();
        } else if (ocrRegionSelecting) {
          setOcrRegionSelecting(false);
        } else if (assistedCalibration || pendingAssistedCalibration) {
          handleCancelAssistedCalibration();
        }
      },
      onTraceEnter: handleFinishTrace,
      onTraceBackspace: handleTraceBackspace,
      onTraceDelete: handleDeleteSelectedTraceEntity,
      onTraceBackspaceOrDelete: () => {
        if (traceMode === "draw-wall") {
          handleTraceBackspace();
        } else {
          handleDeleteSelectedTraceEntity();
        }
      },
    };
    workspaceRef.current = workspace;
  });

  useEffect(() => {
    return () => {
      void terminateOcrWorker();
      cancelWallDetectionWorker();
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (presenting) {
        return;
      }
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.tagName === "SELECT")
      ) {
        return;
      }

      const handlers = handlersRef.current;
      if (!handlers) {
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (mod && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          handlers.onRedo();
        } else {
          handlers.onUndo();
        }
        return;
      }

      if (workspaceRef.current === "plan") {
        switch (event.key.toLowerCase()) {
          case "v":
            handlers.onTraceSelect();
            return;
          case "w":
            handlers.onTraceWalls();
            return;
          case "j":
            handlers.onTraceJoin();
            return;
          case "escape":
            handlers.onTraceEscape();
            return;
          case "enter":
            event.preventDefault();
            handlers.onTraceEnter();
            return;
          case "backspace":
            event.preventDefault();
            handlers.onTraceBackspaceOrDelete();
            return;
          case "delete":
            event.preventDefault();
            handlers.onTraceDelete();
            return;
          default:
            break;
        }
      }

      switch (event.key.toLowerCase()) {
        case "w":
          handlers.onMove();
          break;
        case "e":
          handlers.onRotate();
          break;
        case "escape":
          handlers.onCancel();
          break;
        case "delete":
        case "backspace":
          event.preventDefault();
          handlers.onDelete();
          break;
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [presenting]);

  const error = validationError ?? loadError;
  const planPageMeta =
    pdfDocument && pageMetaEntry.key === `${pdfDocument.numPages}:${plan.selectedPage}`
      ? pageMetaEntry.meta
      : null;
  const snapStatusLabel =
    snapStatus ?? (snap.enabled ? `Grid: ${snap.translationInches}"` : "Snap off");
  const selectedTracePoint =
    trace && selectedTracePointId
      ? (trace.points[selectedTracePointId] ?? null)
      : null;
  const selectedTraceWall =
    trace && selectedTraceWallId
      ? (trace.walls[selectedTraceWallId] ?? null)
      : null;
  const selectedTraceOpening =
    trace && selectedTraceOpeningId
      ? (trace.openings[selectedTraceOpeningId] ?? null)
      : null;
  const selectedTraceOpeningWall =
    trace && selectedTraceOpening
      ? (trace.walls[selectedTraceOpening.wallId] ?? null)
      : null;
  const selectedPointConnections =
    trace && selectedTracePoint
      ? pointConnectedWalls(trace, selectedTracePoint.id).length
      : 0;
  const selectedPointConnectedWalls =
    trace && selectedTracePoint
      ? pointConnectedWalls(trace, selectedTracePoint.id)
      : [];
  const joinTargetIds =
    trace && joinSourcePointId
      ? joinCompatibleTargets(trace, joinSourcePointId)
      : [];
  const tracePpm = plan.calibration?.pixelsPerMeter ?? 1;
  const displayTrace = previewTrace ?? trace;

  const currentTraceSig = traceSignature(trace);
  const currentCalSig = calibrationSignature(plan.calibration);
  const currentUnderlaySig = underlaySignature(plan.underlay);
  const traceErrors = traceFindings.filter(
    (finding) => finding.severity === "error",
  );
  const traceWarnings = traceFindings.filter(
    (finding) => finding.severity === "warning",
  );
  const roomOutOfDate = Boolean(
    roomGeneration &&
      (roomGeneration.traceSignature !== currentTraceSig ||
        roomGeneration.calibrationSignature !== currentCalSig ||
        roomGeneration.underlaySignature !== currentUnderlaySig ||
        roomGeneration.sourceFileName !== plan.fileName ||
        roomGeneration.sourcePage !== plan.selectedPage),
  );
  const roomSyncStatus = computeRoomSyncStatus({
    hasTrace: Boolean(trace),
    traceHasErrors: traceErrors.length > 0,
    generation: roomGeneration,
    modifiedAfterGeneration: roomModifiedAfterGeneration,
    outOfDate: roomOutOfDate,
    reviewing,
  });
  const roomStatusText =
    roomSyncStatus === "no-room"
      ? "No room generated"
      : roomSyncStatus === "trace-invalid"
        ? "Trace invalid"
        : roomSyncStatus === "reviewing"
          ? "Reviewing generated room"
          : roomSyncStatus === "modified"
            ? "Room modified after generation"
            : roomSyncStatus === "out-of-date"
              ? "Room out of date"
              : "Room matches trace";
  const roomImpacts: RoomImpact[] = [];
  if (modelInfo) {
    roomImpacts.push({ label: "Imported model will remain in place" });
  }
  if (importAlignment.confirmed) {
    roomImpacts.push({ label: "Import alignment will be preserved" });
  }
  if (Object.keys(transforms).length > 0) {
    roomImpacts.push({ label: "Object transforms will be preserved" });
  }
  if (extraObjects.length > 0) {
    roomImpacts.push({ label: "Runtime duplicates will be preserved" });
  }
  if (hiddenIds.size > 0) {
    roomImpacts.push({ label: "Hidden objects will stay hidden" });
  }
  if (Object.keys(assignments).length > 0) {
    roomImpacts.push({ label: "Material-zone assignments will be preserved" });
  }
  if (Object.values(zoneSelections).some((material) => material !== null)) {
    roomImpacts.push({ label: "Material overrides will be preserved" });
  }
  if (roomModifiedAfterGeneration) {
    roomImpacts.push({
      label: "Current room was manually edited",
      warning: true,
    });
  }
  roomImpacts.push({
    label: "Cabinetry and imported models are not repositioned automatically",
  });
  const proposedDifference = proposedRoom
    ? compareRooms(room, proposedRoom)
    : null;
  const analysisStale = Boolean(
    planAnalysis &&
      (planAnalysis.sourceFile !== plan.fileName ||
        planAnalysis.pageNumber !== plan.selectedPage ||
        planAnalysis.version !== PLAN_ANALYSIS_VERSION),
  );
  const analysisFilteredCandidates =
    planAnalysis?.candidates.filter(
      (candidate) =>
        candidate.confidence >= analysisMinConfidence &&
        (sourceFilter === "all" ||
          (sourceFilter === "native" && candidate.sourceType === "native-pdf-text") ||
          (sourceFilter === "ocr" && candidate.sourceType === "raster-ocr") ||
          (sourceFilter === "combined" && candidate.sourceType === "combined")) &&
        (!analysisSearch ||
          candidate.raw.toLowerCase().includes(analysisSearch.toLowerCase()) ||
          candidate.display.toLowerCase().includes(analysisSearch.toLowerCase())),
    ) ?? [];
  const wallDetectionStale = Boolean(
    wallDetection &&
      (wallDetection.sourceFile !== plan.fileName ||
        wallDetection.pageNumber !== plan.selectedPage ||
        wallDetection.version !== WALL_DETECTION_VERSION ||
        wallDetection.settingsSignature !==
          wallDetectionSettingsSignature(wallSettings) ||
        wallDetection.preset !== wallPreset ||
        wallDetection.useTextAware !== useTextAwareWallFilter),
  );

  const sceneCanvas = (
    <SceneCanvas
      settings={settings}
      commandRef={commandRef}
      focus={focus}
      gridOrigin={gridOrigin}
      modelScene={scene}
      modelSceneRef={sceneRef}
      hasModel={Boolean(model)}
      onSelectObject={handleSelectObject}
      assignments={assignments}
      zoneSelections={zoneSelections}
      materialsApplied={materialsApplied}
      showZones={showZones}
      selectedKeys={selectedKeys}
      room={room}
      previewRoom={previewRoom}
      reviewing={reviewing}
      presenting={presenting}
      viewMode={viewMode}
      selectedWallId={selectedWallId}
      endpointTolerance={DEFAULT_ENDPOINT_TOLERANCE}
      onSelectWall={(id) => setSelectedWallId(id)}
      onSelectOpening={(id) => setSelectedOpeningId(id)}
      onWallPreview={handleWallPreview}
      onWallCommit={handleWallCommit}
      onWallCancel={handleWallCancel}
      onWallDragStart={handleWallDragStart}
      onWallStatus={setWallEditStatus}
      onWallDraggingChange={() => {}}
      dimensions={dimensions}
      activeObjects={activeObjects}
      onSnapStatus={setSnapStatus}
      plan={plan}
      pdfDocument={pdfDocument}
      onUnderlayDragStart={handleUnderlayDragStart}
      onUnderlayPreview={handleUnderlayPreview}
      onUnderlayCommit={handleUnderlayCommit}
      onUnderlayCancel={handleUnderlayCancel}
      onUnderlayStatus={setSnapStatus}
      onUnderlayDraggingChange={() => {}}
      importTransform={importTransform}
      transforms={transforms}
      originals={originals}
      transformMode={transformMode}
      snap={snap}
      wallPlanes={wallPlanes}
      sceneApiRef={sceneApiRef}
      onCommitTransforms={handleCommitTransforms}
      onSnap={showSnap}
      cabinetInstances={cabinetInstances}
      selectedCabinetIds={selectedCabinetIds}
      onSelectCabinet={handleSelectCabinet}
      onCabinetMoveCommit={handleCabinetMoveCommit}
      onCabinetMoveStart={handleCabinetMoveStart}
      onCabinetMovePreview={handleCabinetMovePreview}
      onCabinetMoveCancel={handleCabinetMoveCancel}
      onCabinetRotateCommit={handleCabinetRotateCommit}
      onCabinetRotateStart={handleCabinetRotateStart}
      onCabinetRotatePreview={handleCabinetRotatePreview}
      cabinetRunPreview={cabinetRunProposal?.cabinets ?? null}
    />
  );

  const simpleMaterialsPanel = (
    <SimpleMaterialPanel
      selections={zoneSelections}
      onSelect={handleSelectMaterial}
    />
  );

  if (experienceMode === "simple") {
    return (
      <SimpleStudioShell
        stage={simpleStage}
        onStage={setSimpleStage}
        fileName={plan.fileName}
        fileSize={plan.fileSize}
        pageCount={plan.pageCount}
        hasRoom={room.walls.length > 0}
        cabinetCount={Object.keys(cabinetInstances).length}
        openingCount={trace ? Object.keys(trace.openings).length : 0}
        hasCalibration={Boolean(plan.calibration?.confirmed)}
        onAnalyze={() => {
          handleAnalyzePage();
          setSimpleStage("review");
        }}
        onOpenAdvanced={() => setExperienceMode("advanced")}
        onPresent={() => setPresenting(true)}
        presenting={presenting}
        onExitPresent={() => setPresenting(false)}
        onFile={handlePlanFile}
        onRemove={handlePlanRemove}
        pdfError={pdfError}
        viewport={sceneCanvas}
        materialsPanel={simpleMaterialsPanel}
      />
    );
  }

  return (
    <div className="flex h-full flex-col">
      <StudioToolbar
        projectName={projectName}
        presenting={presenting}
        viewMode={viewMode}
        transformMode={transformMode}
        workspace={workspace}
        onWorkspaceChange={setWorkspace}
        onTransformModeChange={setTransformMode}
        onViewModeChange={applyViewMode}
        onFrameSelection={handleFrameSelection}
        onFrameRoom={handleFrameRoom}
        onTogglePresentation={() => {
          if (!presenting) {
            setMaterialsApplied(true);
            setTransformMode(null);
            setWorkspace("3d");
            setPlan((current) => ({ ...current, alignMode: false }));
            handleCancelReview();
            handleCancelDt();
            handleExitWallReview();
            handleExitOpeningReview();
            handleCancelRunProposal();
          }
          setPresenting(!presenting);
        }}
        onReturnToSimple={handleReturnToSimple}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-[58vh] min-h-[320px] w-full lg:h-auto lg:flex-1">
          {workspace === "plan" ? (
            <PlanWorkspace
              key={`${plan.fileName ?? "no-pdf"}:${plan.selectedPage}`}
              plan={plan}
              document={pdfDocument}
              loading={pdfLoading}
              error={pdfError}
              onFile={handlePlanFile}
              onRemove={handlePlanRemove}
              onSelectPage={handleSelectPage}
              onCalibration={handleCalibration}
              onClearCalibration={handleClearCalibration}
              onUnderlay={handleUnderlay}
              onResetUnderlay={handleResetUnderlay}
              trace={displayTrace}
              traceMode={traceMode}
              onTraceClick={handleTraceClick}
              onTraceFinish={handleFinishTrace}
              onTraceBackspace={handleTraceBackspace}
              onClearTrace={handleClearTrace}
              onSetTraceMode={handleSetTraceMode}
              onSelectPoint={(id) => {
                setSelectedTracePointId(id);
                if (id) {
                  setSelectedTraceOpeningId(null);
                }
              }}
              onSelectWall={(id) => {
                setSelectedTraceWallId(id);
                if (id) {
                  setSelectedTraceOpeningId(null);
                }
              }}
              onSelectOpening={(id) => {
                setSelectedTraceOpeningId(id);
                if (id) {
                  setSelectedTraceWallId(null);
                  setSelectedTracePointId(null);
                }
              }}
              selectedOpeningId={selectedTraceOpeningId}
              onAddOpening={handleAddTraceOpening}
              selectedWallId={selectedTraceWallId}
              joinSourcePointId={joinSourcePointId}
              joinTargetIds={joinTargetIds}
              joinError={joinError}
              onJoinPoint={handleJoinPointClick}
              onCancelJoin={handleCancelJoin}
              openingDefaults={openingDefaults}
              onTraceDragStart={handleTraceDragStart}
              onTracePreview={handleTracePreview}
              onTraceCommit={handleTraceCommit}
              onTraceCancel={handleTraceCancel}
              activeTracePointId={activeTracePointId}
              firstTracePointId={traceOrder[0] ?? null}
              analysis={planAnalysis}
              analysisVisible={showAnalysisOverlay && !analysisStale}
              analysisCandidates={analysisFilteredCandidates}
              selectedCandidateId={selectedCandidateId}
              onSelectCandidate={handleSelectCandidate}
              onRegisterLocate={(fn) => {
                locateAnalysisRef.current = fn;
              }}
              assistedCalibration={assistedCalibration}
              onAssistedCalibrationComplete={handleAssistedCalibrationComplete}
              ocrRegionSelecting={ocrRegionSelecting}
              onOcrRegionSelected={handleOcrRegionSelected}
              wallDetection={wallDetection}
              showRawLines={showRawLines}
              showCleanedLines={showCleanedLines}
              showWallCandidates={showWallCandidates}
              selectedWallCandidateId={selectedWallCandidateId}
              onSelectWallCandidate={setSelectedWallCandidateId}
              wallDragPreview={wallDragPreview}
              onWallDragStart={handleCandidateDragStart}
              onWallDragPreview={handleCandidateDragPreview}
              onWallDragCommit={handleCandidateDragCommit}
              onWallDragCancel={handleCandidateDragCancel}
              openingDetection={openingDetection}
              selectedOpeningCandidateId={selectedOpeningCandidateId}
              showOpeningDetectionOverlay={
                showOpeningDetectionOverlay && !presenting
              }
              onSelectOpeningCandidate={setSelectedOpeningCandidateId}
            />
          ) : (
            <>
          <SceneCanvas
            settings={settings}
            commandRef={commandRef}
            focus={focus}
            gridOrigin={gridOrigin}
            modelScene={scene}
            modelSceneRef={sceneRef}
            hasModel={Boolean(model)}
            onSelectObject={handleSelectObject}
            assignments={assignments}
            zoneSelections={zoneSelections}
            materialsApplied={materialsApplied}
            showZones={showZones}
            selectedKeys={selectedKeys}
            room={room}
            previewRoom={previewRoom}
            reviewing={reviewing}
            presenting={presenting}
            viewMode={viewMode}
            selectedWallId={selectedWallId}
            endpointTolerance={DEFAULT_ENDPOINT_TOLERANCE}
            onSelectWall={(id) => setSelectedWallId(id)}
            onSelectOpening={(id) => setSelectedOpeningId(id)}
            onWallPreview={handleWallPreview}
            onWallCommit={handleWallCommit}
            onWallCancel={handleWallCancel}
            onWallDragStart={handleWallDragStart}
            onWallStatus={setWallEditStatus}
            onWallDraggingChange={() => {}}
            dimensions={dimensions}
            activeObjects={activeObjects}
            onSnapStatus={setSnapStatus}
            plan={plan}
            pdfDocument={pdfDocument}
            onUnderlayDragStart={handleUnderlayDragStart}
            onUnderlayPreview={handleUnderlayPreview}
            onUnderlayCommit={handleUnderlayCommit}
            onUnderlayCancel={handleUnderlayCancel}
            onUnderlayStatus={setSnapStatus}
            onUnderlayDraggingChange={() => {}}
            importTransform={importTransform}
            transforms={transforms}
            originals={originals}
            transformMode={transformMode}
            snap={snap}
            wallPlanes={wallPlanes}
            sceneApiRef={sceneApiRef}
            onCommitTransforms={handleCommitTransforms}
            onSnap={showSnap}
            cabinetInstances={cabinetInstances}
            selectedCabinetIds={selectedCabinetIds}
            onSelectCabinet={handleSelectCabinet}
            onCabinetMoveCommit={handleCabinetMoveCommit}
            onCabinetMoveStart={handleCabinetMoveStart}
            onCabinetMovePreview={handleCabinetMovePreview}
            onCabinetMoveCancel={handleCabinetMoveCancel}
            onCabinetRotateCommit={handleCabinetRotateCommit}
            onCabinetRotateStart={handleCabinetRotateStart}
            onCabinetRotatePreview={handleCabinetRotatePreview}
            cabinetRunPreview={cabinetRunProposal?.cabinets ?? null}
          />
          <SceneControls
            presenting={presenting}
            viewMode={viewMode}
            snapFlash={snapFlash}
            wallEditStatus={wallEditStatus}
            snapStatus={snapStatusLabel}
          />
            </>
          )}
        </div>

        {presenting ? (
          <PresentationMaterials
            selections={zoneSelections}
            onSelect={handleSelectMaterial}
          />
        ) : dtReviewOpen && dtResult ? (
          <DetectionToTraceReview
            result={dtResult}
            mode={dtMode}
            acknowledged={dtAcknowledged}
            existingWallCount={Object.keys(trace?.walls ?? {}).length}
            existingOpeningCount={Object.keys(trace?.openings ?? {}).length}
            onModeChange={handleChangeDtMode}
            onPreview={handlePreviewDt}
            onCommit={handleCommitDt}
            onCancel={handleCancelDt}
            onAcknowledge={setDtAcknowledged}
          />
        ) : reviewing && proposedRoom && proposedDifference ? (
          <GeneratedRoomReview
            proposed={proposedRoom}
            current={room}
            difference={proposedDifference}
            impacts={roomImpacts}
            errors={traceErrors.map((finding) => finding.message)}
            warnings={traceWarnings.map((finding) => finding.message)}
            hasGeneration={Boolean(roomGeneration)}
            outOfDate={roomOutOfDate}
            modifiedAfterGeneration={roomModifiedAfterGeneration}
            previewVisible={Boolean(previewRoom)}
            acknowledged={reviewAcknowledged}
            onAcknowledgedChange={setReviewAcknowledged}
            onPreview={handlePreviewRoom}
            onReplace={handleReplaceRoom}
            onCancel={handleCancelReview}
          />
        ) : (
          <StudioInspector
            settings={settings}
            onSettingChange={(key, value) =>
              setSettings((current) => ({ ...current, [key]: value }))
            }
            fileName={descriptor?.fileName ?? null}
            fileSize={descriptor?.fileSize ?? null}
            modelInfo={modelInfo}
            tree={runtimeTree}
            hiddenIds={hiddenIds}
            loading={loading}
            error={error}
            onFile={handleFile}
            onRemove={handleRemove}
            selectedCount={selectedKeys.length}
            currentZone={currentZone}
            onAssignZone={handleAssignZone}
            onClearZone={handleClearZone}
            onSelectNodes={handleSelectNodes}
            selectedIds={selectedKeys}
            zoneCounts={zoneCounts.byZone}
            unassigned={zoneCounts.unassigned}
            showZones={showZones}
            onToggleShowZones={setShowZones}
            onSelectZone={handleSelectZone}
            selections={zoneSelections}
            onSelectMaterial={handleSelectMaterial}
            onRestoreOriginals={() => setMaterialsApplied(false)}
            onApplyLook={() => setMaterialsApplied(true)}
            object={selectedObject}
            transform={selectedTransform}
            onPositionChange={handlePositionChange}
            onRotationAxisChange={handleRotationAxisChange}
            onLockToggle={handleLockToggle}
            onReset={handleReset}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onRename={handleRename}
            canRename={canRenameSelected}
            snap={snap}
            onSnapChange={setSnap}
            room={room}
            selectedWallId={selectedWallId}
            selectedOpeningId={selectedOpeningId}
            onSelectWall={setSelectedWallId}
            onSelectOpening={setSelectedOpeningId}
            onUpdateWall={handleUpdateWall}
            onAddWall={handleAddWall}
            onRemoveWall={handleRemoveWall}
            onAddOpening={handleAddOpening}
            onUpdateOpening={handleUpdateOpening}
            onRemoveOpening={handleRemoveOpening}
            onDuplicateOpening={handleDuplicateOpening}
            onResetRoom={handleResetRoom}
            clearances={clearances}
            clearanceThresholds={clearanceThresholds}
            onClearanceThresholdsChange={setClearanceThresholds}
            showRoomDimensions={showRoomDimensions}
            showSelectionDimensions={showSelectionDimensions}
            showClearanceDimensions={showClearanceDimensions}
            onToggleRoomDimensions={setShowRoomDimensions}
            onToggleSelectionDimensions={setShowSelectionDimensions}
            onToggleClearanceDimensions={setShowClearanceDimensions}
            importAlignment={importAlignment}
            importRawSize={modelInfo?.bounds.size ?? [0, 0, 0]}
            onImportAlignmentChange={setImportAlignment}
            onAlignImport={handleAlignImport}
            onResetImportAlignment={handleResetAlignment}
            plan={plan}
            planCalibration={plan.calibration}
            planPageDimensions={planPageMeta}
            onPlanReplaceFile={handlePlanFile}
            onPlanRemove={handlePlanRemove}
            onPlanUnderlay={handleUnderlay}
            onPlanResetUnderlay={handleResetUnderlay}
            onPlanConfirmCalibration={handleConfirmCalibration}
            onPlanAlignMode={handleAlignMode}
            onPlanHideFloor={handleHideFloor}
            onPlanCenterUnderlay={handleCenterUnderlay}
            onPlanAlignToOrigin={handleAlignToOrigin}
            planAnalysis={planAnalysis}
            analysisStale={analysisStale}
            analysisSearch={analysisSearch}
            analysisMinConfidence={analysisMinConfidence}
            showAnalysisOverlay={showAnalysisOverlay}
            analysisCandidates={analysisFilteredCandidates}
            selectedCandidateId={selectedCandidateId}
            assistedCalibrationActive={Boolean(assistedCalibration)}
            pendingAssistedCalibration={pendingAssistedCalibration}
            onAnalyzePage={handleAnalyzePage}
            onAnalysisSearchChange={setAnalysisSearch}
            onAnalysisMinConfidenceChange={setAnalysisMinConfidence}
            onShowAnalysisOverlayChange={setShowAnalysisOverlay}
            onSelectCandidate={handleSelectCandidate}
            onLocateCandidate={handleLocateCandidate}
            onUseForScale={handleUseForScale}
            onReviewCandidate={handleReviewCandidate}
            onCorrectCandidate={handleCorrectCandidate}
            onConfirmAssistedCalibration={handleConfirmAssistedCalibration}
            onCancelAssistedCalibration={handleCancelAssistedCalibration}
            ocrStatus={ocrStatus}
            ocrProgress={ocrProgress}
            ocrError={ocrError}
            ocrPreset={ocrPreset}
            ocrMode={ocrMode}
            ocrRegionSelecting={ocrRegionSelecting}
            ocrWordCount={ocrWordCount}
            ocrAverageConfidence={ocrAverageConfidence}
            ocrLowConfidenceCount={ocrLowConfidenceCount}
            ocrCompletedAt={ocrCompletedAt}
            sourceFilter={sourceFilter}
            assistedCalibrationWarning={assistedCalibrationWarning}
            assistedWarningsAcknowledged={assistedWarningsAcknowledged}
            onOcrPresetChange={setOcrPreset}
            onOcrModeChange={setOcrMode}
            onRunOcr={handleRunOcr}
            onCancelOcr={handleCancelOcr}
            onStartOcrRegion={handleStartOcrRegion}
            onSourceFilterChange={setSourceFilter}
            onAssistedWarningsAcknowledgedChange={
              setAssistedWarningsAcknowledged
            }
            wallDetection={wallDetection}
            wallDetectStatus={wallDetectStatus}
            wallDetectError={wallDetectError}
            wallDetectionStale={wallDetectionStale}
            wallPreset={wallPreset}
            wallSettings={wallSettings}
            showRawLines={showRawLines}
            showCleanedLines={showCleanedLines}
            showWallCandidates={showWallCandidates}
            selectedWallCandidateId={selectedWallCandidateId}
            onWallPresetChange={setWallPreset}
            onWallSettingsChange={setWallSettings}
            onDetectWalls={handleDetectWalls}
            onCancelWallDetection={handleCancelWallDetection}
            onToggleRawLines={setShowRawLines}
            onToggleCleanedLines={setShowCleanedLines}
            onToggleWallCandidates={setShowWallCandidates}
            onSelectWallCandidate={setSelectedWallCandidateId}
            onReviewWallCandidate={handleReviewWallCandidate}
            onBulkAcceptWallCandidates={handleBulkAcceptHighConfidence}
            onBulkRejectWallCandidates={handleBulkRejectBelowThreshold}
            onResetWallReviews={handleResetWallReviews}
            onReviewWallDetection={handleReviewWallDetection}
            onSplitWallCandidate={handleSplitWallCandidate}
            onResetWallCandidate={handleResetWallCandidate}
            onTreatLineAsWall={handleTreatLineAsWall}
            onUpdateWallCandidate={handleUpdateWallCandidate}
            wallPixelsPerMeter={plan.calibration?.pixelsPerMeter ?? null}
            useTextAwareWallFilter={useTextAwareWallFilter}
            onUseTextAwareWallFilterChange={setUseTextAwareWallFilter}
            onCreateTraceFromDetection={handleOpenDetectionToTrace}
            openingDetection={openingDetection}
            openingDetectionRunning={openingDetectionRunning}
            openingDetectionError={openingDetectionError}
            openingDetectionSettings={openingDetectionSettings}
            selectedOpeningCandidateId={selectedOpeningCandidateId}
            onOpeningSettingsChange={setOpeningDetectionSettings}
            onDetectOpenings={handleDetectOpenings}
            onReviewOpenings={handleReviewOpenings}
            onSelectOpeningCandidate={setSelectedOpeningCandidateId}
            onReviewOpeningCandidate={handleReviewOpeningCandidate}
            showOpeningDetectionOverlay={showOpeningDetectionOverlay}
            onShowOpeningDetectionOverlayChange={setShowOpeningDetectionOverlay}
            onAddReviewedOpenings={handleAddReviewedOpenings}
            onAddCabinet={handleAddCabinet}
            selectedCabinet={
              selectedCabinetIds.length === 1
                ? (() => {
                    const cabinet = cabinetInstances[selectedCabinetIds[0]];
                    if (!cabinet) return null;
                    return cabinetTransformPreview &&
                      cabinetTransformPreview.id === cabinet.id
                      ? cabinetTransformPreview.kind === "move"
                        ? { ...cabinet, position: cabinetTransformPreview.current }
                        : { ...cabinet, rotation: cabinetTransformPreview.currentRotation }
                      : cabinet;
                  })()
                : null
            }
            onUpdateCabinet={handleUpdateCabinet}
            onDuplicateCabinet={handleDuplicateCabinet}
            onResetCabinet={handleResetCabinet}
            onToggleCabinetLock={handleToggleCabinetLock}
            onHideCabinet={handleHideCabinet}
            onRenameCabinet={handleRenameCabinet}
            cabinetTransforming={Boolean(cabinetTransformPreview)}
            selectedCabinetIds={selectedCabinetIds}
            onAssignCabinetFinish={handleAssignCabinetFinish}
            cabinetRunProposal={
              cabinetRunProposal
                ? {
                    run: cabinetRunProposal.run,
                    wallId: cabinetRunProposal.wallId,
                    side: cabinetRunProposal.side,
                    name: cabinetRunProposal.name,
                    startOffset: cabinetRunProposal.startOffset,
                    finishZone: cabinetRunProposal.finishZone,
                  }
                : null
            }
            cabinetRunCatalogIds={cabinetRunProposal?.catalogIds ?? []}
            cabinetRunWallLength={
              room.walls.find((w) => w.id === selectedWallId)
                ? Math.hypot(
                    (room.walls.find((w) => w.id === selectedWallId)!.end.x -
                      room.walls.find((w) => w.id === selectedWallId)!.start.x),
                    (room.walls.find((w) => w.id === selectedWallId)!.end.z -
                      room.walls.find((w) => w.id === selectedWallId)!.start.z),
                  )
                : 0
            }
            onOpenCabinetRun={handleCreateStarterRun}
            onFlipCabinetRun={handleFlipRunSide}
            onCommitCabinetRun={handleCommitRunProposal}
            onCancelCabinetRun={handleCancelRunProposal}
            onAddCabinetRunItem={handleAddRunItem}
            onRemoveCabinetRunItem={handleRemoveRunItem}
            onMoveCabinetRunItem={handleMoveRunItem}
            onSetCabinetRunName={handleSetRunName}
            onSetCabinetRunOffset={handleSetRunOffset}
            onSetCabinetRunFinish={handleSetRunFinish}
            trace={trace}
            traceFindings={traceFindings}
            traceMode={traceMode}
            roomStatus={roomSyncStatus}
            roomStatusText={roomStatusText}
            onStartTrace={handleStartTrace}
            onFinishTrace={handleFinishTrace}
            onTraceBackspace={handleTraceBackspace}
            onClearTrace={handleClearTrace}
            onGenerateRoom={handleOpenReview}
            onSetTraceMode={handleSetTraceMode}
            selectedPoint={selectedTracePoint}
            selectedWall={selectedTraceWall}
            selectedPointConnections={selectedPointConnections}
            tracePpm={tracePpm}
            onDeleteWall={handleTraceDeleteWall}
            onSplitWall={handleTraceSplitWall}
            onReverseWall={handleTraceReverse}
            onSetWallLength={handleTraceSetWallLength}
            onSetWallProps={handleTraceSetWallProps}
            onDeletePoint={handleTraceDeletePoint}
            onMovePoint={handleTraceMovePoint}
            onSeparateWall={handleTraceSeparateWallEndpoint}
            onJoinNearby={handleTraceJoinNearby}
            connectedWalls={selectedPointConnectedWalls}
            selectedTraceOpening={selectedTraceOpening}
            selectedTraceOpeningWall={selectedTraceOpeningWall}
            onUpdateTraceOpening={handleUpdateTraceOpening}
            onDuplicateTraceOpening={handleDuplicateTraceOpening}
            onDeleteTraceOpening={handleDeleteTraceOpening}
            onCenterTraceOpening={handleCenterTraceOpening}
          />
        )}
      </div>
    </div>
  );
}
