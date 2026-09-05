"use client";

import type {
  BackgroundPreset,
  ModelInfo,
  SceneNodeInfo,
  StudioSettings,
} from "@/lib/studio/types";
import { backgroundColors } from "@/lib/studio/camera-presets";
import {
  type MaterialZoneId,
  type ZoneMaterialSelections,
} from "@/lib/studio/material-zones";
import type {
  SnapConfig,
  TransformState,
} from "@/lib/studio/transforms";
import type { EditableObjectInfo } from "@/lib/studio/editable-objects";
import type {
  OpeningType,
  RoomLayout,
  RoomWall,
  WallOpening,
} from "@/lib/studio/room";
import type {
  ClearanceIssue,
  ClearanceThresholds,
} from "@/lib/studio/clearance";
import { inchesToMeters, metersToFeet } from "@/lib/studio/transforms";
import type { ImportAlignment } from "@/lib/studio/import-alignment";
import type {
  PlanCalibration,
  PlanState,
  PlanUnderlayAlignment,
} from "@/lib/studio/plan";
import type { RoomSyncStatus } from "@/lib/studio/room-generation";
import type {
  DimensionCandidate,
  PlanAnalysis,
} from "@/lib/studio/plan-analysis";
import type { OcrPreset } from "@/lib/studio/ocr-raster";
import type {
  WallCandidatePatch,
  WallDetectionAnalysis,
  WallDetectionSettings,
} from "@/lib/studio/wall-detection";
import type { WallDetectionPreset } from "@/lib/studio/wall-detect";
import type { CabinetInstance } from "@/lib/studio/cabinet";
import type { CabinetRun } from "@/lib/studio/cabinet-run";
import type {
  OpeningDetectionAnalysis,
  OpeningDetectionSettings,
} from "@/lib/studio/opening-detection";
import type {
  PlanTrace,
  TracePoint,
  TracedOpening,
  TracedWall,
  TraceInteractionMode,
} from "@/lib/studio/trace";
import type { TraceFinding } from "@/lib/studio/trace-validation";
import MaterialPalette from "./MaterialPalette";
import MaterialZonePanel from "./MaterialZonePanel";
import ModelInspector from "./ModelInspector";
import ModelUploader from "./ModelUploader";
import ObjectPanel from "./ObjectPanel";
import RoomInspector from "./RoomInspector";
import ImportAlignmentPanel from "./ImportAlignmentPanel";
import SceneGraphTree from "./SceneGraphTree";
import SpacePlanningPanel from "./SpacePlanningPanel";
import ZoneSummary from "./ZoneSummary";
import PlansPanel from "./PlansPanel";
import TracePanel from "./TracePanel";
import PlanAnalysisPanel from "./PlanAnalysisPanel";
import WallDetectionPanel from "./WallDetectionPanel";
import OpeningDetectionPanel from "./OpeningDetectionPanel";
import CabinetCatalogPanel from "./CabinetCatalogPanel";
import CabinetInspector from "./CabinetInspector";
import CabinetRunPanel from "./CabinetRunPanel";

interface StudioInspectorProps {
  settings: StudioSettings;
  onSettingChange: <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K],
  ) => void;
  fileName: string | null;
  fileSize: number | null;
  modelInfo: ModelInfo | null;
  tree: SceneNodeInfo[];
  hiddenIds: Set<string>;
  loading: boolean;
  error: string | null;
  onFile: (file: File) => void;
  onRemove: () => void;
  selectedCount: number;
  currentZone: MaterialZoneId | "mixed" | null;
  onAssignZone: (zone: MaterialZoneId) => void;
  onClearZone: () => void;
  onSelectNodes: (ids: string[], additive: boolean) => void;
  selectedIds: string[];
  zoneCounts: Record<MaterialZoneId, number>;
  unassigned: number;
  showZones: boolean;
  onToggleShowZones: (value: boolean) => void;
  onSelectZone: (zone: MaterialZoneId) => void;
  selections: ZoneMaterialSelections;
  onSelectMaterial: (zone: MaterialZoneId, materialId: string | null) => void;
  onRestoreOriginals: () => void;
  onApplyLook: () => void;
  object: EditableObjectInfo | null;
  transform: TransformState | null;
  onPositionChange: (axis: "x" | "y" | "z", meters: number) => void;
  onRotationAxisChange: (axis: "x" | "y" | "z", degrees: number) => void;
  onLockToggle: (locked: boolean) => void;
  onReset: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  canRename: boolean;
  room: RoomLayout;
  selectedWallId: string | null;
  selectedOpeningId: string | null;
  onSelectWall: (id: string) => void;
  onSelectOpening: (id: string) => void;
  onUpdateWall: (wall: RoomWall) => void;
  onAddWall: () => void;
  onRemoveWall: (id: string) => void;
  onAddOpening: (wallId: string, type: OpeningType) => void;
  onUpdateOpening: (wallId: string, opening: WallOpening) => void;
  onRemoveOpening: (wallId: string, openingId: string) => void;
  onDuplicateOpening: (wallId: string, openingId: string) => void;
  onResetRoom: () => void;
  clearances: ClearanceIssue[];
  clearanceThresholds: ClearanceThresholds;
  onClearanceThresholdsChange: (thresholds: ClearanceThresholds) => void;
  showRoomDimensions: boolean;
  showSelectionDimensions: boolean;
  showClearanceDimensions: boolean;
  onToggleRoomDimensions: (value: boolean) => void;
  onToggleSelectionDimensions: (value: boolean) => void;
  onToggleClearanceDimensions: (value: boolean) => void;
  importAlignment: ImportAlignment;
  importRawSize: [number, number, number];
  onImportAlignmentChange: (alignment: ImportAlignment) => void;
  onAlignImport: () => void;
  onResetImportAlignment: () => void;
  plan: PlanState;
  planCalibration: PlanCalibration | null;
  planPageDimensions: { widthPt: number; heightPt: number } | null;
  onPlanReplaceFile: (file: File) => void;
  onPlanRemove: () => void;
  onPlanUnderlay: (patch: Partial<PlanUnderlayAlignment>) => void;
  onPlanResetUnderlay: () => void;
  onPlanConfirmCalibration: () => void;
  onPlanAlignMode: (value: boolean) => void;
  onPlanHideFloor: (value: boolean) => void;
  onPlanCenterUnderlay: () => void;
  onPlanAlignToOrigin: () => void;
  planAnalysis: PlanAnalysis | null;
  analysisStale: boolean;
  analysisSearch: string;
  analysisMinConfidence: number;
  showAnalysisOverlay: boolean;
  analysisCandidates: DimensionCandidate[];
  selectedCandidateId: string | null;
  assistedCalibrationActive: boolean;
  pendingAssistedCalibration: {
    meters: number;
    pixelsPerMeter: number;
  } | null;
  onAnalyzePage: () => void;
  onAnalysisSearchChange: (value: string) => void;
  onAnalysisMinConfidenceChange: (value: number) => void;
  onShowAnalysisOverlayChange: (value: boolean) => void;
  onSelectCandidate: (id: string | null) => void;
  onLocateCandidate: (id: string) => void;
  onUseForScale: (id: string) => void;
  onReviewCandidate: (
    id: string,
    review: "accepted" | "rejected" | "unreviewed",
  ) => void;
  onCorrectCandidate: (id: string, meters: number) => void;
  onConfirmAssistedCalibration: () => void;
  onCancelAssistedCalibration: () => void;
  ocrStatus: "idle" | "initializing" | "recognizing" | "complete" | "failed" | "cancelled";
  ocrProgress: number;
  ocrError: string | null;
  ocrPreset: OcrPreset;
  ocrMode: "full" | "region";
  ocrRegionSelecting: boolean;
  ocrWordCount: number;
  ocrAverageConfidence: number;
  ocrLowConfidenceCount: number;
  ocrCompletedAt: number | null;
  sourceFilter: "all" | "native" | "ocr" | "combined";
  assistedCalibrationWarning: string | null;
  assistedWarningsAcknowledged: boolean;
  onOcrPresetChange: (preset: OcrPreset) => void;
  onOcrModeChange: (mode: "full" | "region") => void;
  onRunOcr: () => void;
  onCancelOcr: () => void;
  onStartOcrRegion: () => void;
  onSourceFilterChange: (filter: "all" | "native" | "ocr" | "combined") => void;
  onAssistedWarningsAcknowledgedChange: (value: boolean) => void;
  wallDetection: WallDetectionAnalysis | null;
  wallDetectStatus: "idle" | "analyzing" | "complete" | "failed" | "cancelled";
  wallDetectError: string | null;
  wallDetectionStale: boolean;
  wallPreset: WallDetectionPreset;
  wallSettings: WallDetectionSettings;
  showRawLines: boolean;
  showCleanedLines: boolean;
  showWallCandidates: boolean;
  selectedWallCandidateId: string | null;
  onWallPresetChange: (preset: WallDetectionPreset) => void;
  onWallSettingsChange: (settings: WallDetectionSettings) => void;
  onDetectWalls: () => void;
  onCancelWallDetection: () => void;
  onToggleRawLines: (value: boolean) => void;
  onToggleCleanedLines: (value: boolean) => void;
  onToggleWallCandidates: (value: boolean) => void;
  onSelectWallCandidate: (id: string | null) => void;
  onReviewWallCandidate: (
    id: string,
    review: "unreviewed" | "accepted" | "rejected" | "edited",
  ) => void;
  onBulkAcceptWallCandidates: () => void;
  onBulkRejectWallCandidates: () => void;
  onResetWallReviews: () => void;
  onReviewWallDetection: () => void;
  onSplitWallCandidate: (id: string) => void;
  onResetWallCandidate: (id: string) => void;
  onTreatLineAsWall: (id: string) => void;
  onUpdateWallCandidate: (id: string, patch: WallCandidatePatch) => void;
  wallPixelsPerMeter: number | null;
  useTextAwareWallFilter: boolean;
  onUseTextAwareWallFilterChange: (value: boolean) => void;
  onCreateTraceFromDetection: () => void;
  openingDetection: OpeningDetectionAnalysis | null;
  openingDetectionRunning: boolean;
  openingDetectionError: string | null;
  openingDetectionSettings: OpeningDetectionSettings;
  selectedOpeningCandidateId: string | null;
  onOpeningSettingsChange: (settings: OpeningDetectionSettings) => void;
  onDetectOpenings: () => void;
  onReviewOpenings: () => void;
  onSelectOpeningCandidate: (id: string | null) => void;
  onReviewOpeningCandidate: (
    id: string,
    review: "unreviewed" | "accepted" | "rejected" | "edited",
  ) => void;
  showOpeningDetectionOverlay: boolean;
  onShowOpeningDetectionOverlayChange: (value: boolean) => void;
  onAddReviewedOpenings: () => void;
  onAddCabinet: (catalogId: string) => void;
  selectedCabinet: CabinetInstance | null;
  onUpdateCabinet: (id: string, patch: Partial<CabinetInstance>) => void;
  onDuplicateCabinet: (id: string) => void;
  onResetCabinet: (id: string) => void;
  onToggleCabinetLock: (id: string) => void;
  onHideCabinet: (id: string) => void;
  onRenameCabinet: (id: string, name: string) => void;
  cabinetTransforming: boolean;
  selectedCabinetIds: string[];
  onAssignCabinetFinish: (
    ids: string[],
    finishZone: MaterialZoneId | null,
  ) => void;
  cabinetRunProposal: {
    run: CabinetRun;
    wallId: string;
    side: 1 | -1;
    name: string;
    startOffset: number;
    finishZone: "perimeter" | "island";
  } | null;
  cabinetRunCatalogIds: string[];
  cabinetRunWallLength: number;
  onOpenCabinetRun: () => void;
  onFlipCabinetRun: () => void;
  onCommitCabinetRun: () => void;
  onCancelCabinetRun: () => void;
  onAddCabinetRunItem: (catalogId: string) => void;
  onRemoveCabinetRunItem: (index: number) => void;
  onMoveCabinetRunItem: (index: number, direction: -1 | 1) => void;
  onSetCabinetRunName: (name: string) => void;
  onSetCabinetRunOffset: (offset: number) => void;
  onSetCabinetRunFinish: (zone: "perimeter" | "island") => void;
  trace: PlanTrace | null;
  traceFindings: TraceFinding[];
  traceMode: TraceInteractionMode | null;
  roomStatus: RoomSyncStatus;
  roomStatusText: string;
  onStartTrace: () => void;
  onFinishTrace: () => void;
  onTraceBackspace: () => void;
  onClearTrace: () => void;
  onGenerateRoom: () => void;
  onSetTraceMode: (mode: TraceInteractionMode | null) => void;
  selectedPoint: TracePoint | null;
  selectedWall: TracedWall | null;
  selectedPointConnections: number;
  tracePpm: number;
  onDeleteWall: (wallId: string) => void;
  onSplitWall: (wallId: string) => void;
  onReverseWall: (wallId: string) => void;
  onSetWallLength: (wallId: string, length: number) => void;
  onSetWallProps: (
    wallId: string,
    patch: Partial<{ height: number; thickness: number }>,
  ) => void;
  onDeletePoint: (pointId: string) => void;
  onMovePoint: (pointId: string, position: { x: number; y: number }) => void;
  onSeparateWall: (wallId: string, endpoint: "start" | "end") => void;
  onJoinNearby: (pointId: string) => void;
  connectedWalls: TracedWall[];
  selectedTraceOpening: TracedOpening | null;
  selectedTraceOpeningWall: TracedWall | null;
  onUpdateTraceOpening: (opening: TracedOpening) => void;
  onDuplicateTraceOpening: (openingId: string) => void;
  onDeleteTraceOpening: (openingId: string) => void;
  onCenterTraceOpening: (openingId: string) => void;
  snap: SnapConfig;
  onSnapChange: (snap: SnapConfig) => void;
}

const backgroundOptions: { value: BackgroundPreset; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "warm", label: "Warm" },
  { value: "dark", label: "Dark" },
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2.5">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-zinc-200 transition-colors peer-checked:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-zinc-100 py-5 last:border-b-0">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

export default function StudioInspector(props: StudioInspectorProps) {
  const {
    settings,
    onSettingChange,
    fileName,
    fileSize,
    modelInfo,
    tree,
    hiddenIds,
    loading,
    error,
    onFile,
    onRemove,
    selectedCount,
    currentZone,
    onAssignZone,
    onClearZone,
    onSelectNodes,
    selectedIds,
    zoneCounts,
    unassigned,
    showZones,
    onToggleShowZones,
    onSelectZone,
    selections,
    onSelectMaterial,
    onRestoreOriginals,
    onApplyLook,
    object,
    transform,
    onPositionChange,
    onRotationAxisChange,
    onLockToggle,
    onReset,
    onDuplicate,
    onDelete,
    onRename,
    canRename,
    room,
    selectedWallId,
    selectedOpeningId,
    onSelectWall,
    onSelectOpening,
    onUpdateWall,
    onAddWall,
    onRemoveWall,
    onAddOpening,
    onUpdateOpening,
    onRemoveOpening,
    onDuplicateOpening,
    onResetRoom,
    clearances,
    clearanceThresholds,
    onClearanceThresholdsChange,
    showRoomDimensions,
    showSelectionDimensions,
    showClearanceDimensions,
    onToggleRoomDimensions,
    onToggleSelectionDimensions,
    onToggleClearanceDimensions,
    importAlignment,
    importRawSize,
    onImportAlignmentChange,
    onAlignImport,
    onResetImportAlignment,
    plan,
    planCalibration,
    planPageDimensions,
    onPlanReplaceFile,
    onPlanRemove,
    onPlanUnderlay,
    onPlanResetUnderlay,
    onPlanConfirmCalibration,
    onPlanAlignMode,
    onPlanHideFloor,
    onPlanCenterUnderlay,
    onPlanAlignToOrigin,
    planAnalysis,
    analysisStale,
    analysisSearch,
    analysisMinConfidence,
    showAnalysisOverlay,
    analysisCandidates,
    selectedCandidateId,
    assistedCalibrationActive,
    pendingAssistedCalibration,
    onAnalyzePage,
    onAnalysisSearchChange,
    onAnalysisMinConfidenceChange,
    onShowAnalysisOverlayChange,
    onSelectCandidate,
    onLocateCandidate,
    onUseForScale,
    onReviewCandidate,
    onCorrectCandidate,
    onConfirmAssistedCalibration,
    onCancelAssistedCalibration,
    ocrStatus,
    ocrProgress,
    ocrError,
    ocrPreset,
    ocrMode,
    ocrRegionSelecting,
    ocrWordCount,
    ocrAverageConfidence,
    ocrLowConfidenceCount,
    ocrCompletedAt,
    sourceFilter,
    assistedCalibrationWarning,
    assistedWarningsAcknowledged,
    onOcrPresetChange,
    onOcrModeChange,
    onRunOcr,
    onCancelOcr,
    onStartOcrRegion,
    onSourceFilterChange,
    onAssistedWarningsAcknowledgedChange,
    wallDetection,
    wallDetectStatus,
    wallDetectError,
    wallDetectionStale,
    wallPreset,
    wallSettings,
    showRawLines,
    showCleanedLines,
    showWallCandidates,
    selectedWallCandidateId,
    onWallPresetChange,
    onWallSettingsChange,
    onDetectWalls,
    onCancelWallDetection,
    onToggleRawLines,
    onToggleCleanedLines,
    onToggleWallCandidates,
    onSelectWallCandidate,
    onReviewWallCandidate,
    onBulkAcceptWallCandidates,
    onBulkRejectWallCandidates,
    onResetWallReviews,
    onReviewWallDetection,
    onSplitWallCandidate,
    onResetWallCandidate,
    onTreatLineAsWall,
    onUpdateWallCandidate,
    wallPixelsPerMeter,
    useTextAwareWallFilter,
    onUseTextAwareWallFilterChange,
    onCreateTraceFromDetection,
    openingDetection,
    openingDetectionRunning,
    openingDetectionError,
    openingDetectionSettings,
    selectedOpeningCandidateId,
    onOpeningSettingsChange,
    onDetectOpenings,
    onReviewOpenings,
    onSelectOpeningCandidate,
    onReviewOpeningCandidate,
    showOpeningDetectionOverlay,
    onShowOpeningDetectionOverlayChange,
    onAddReviewedOpenings,
    onAddCabinet,
    selectedCabinet,
    onUpdateCabinet,
    onDuplicateCabinet,
    onResetCabinet,
    onToggleCabinetLock,
    onHideCabinet,
    onRenameCabinet,
    cabinetTransforming,
    selectedCabinetIds,
    onAssignCabinetFinish,
    cabinetRunProposal,
    cabinetRunCatalogIds,
    cabinetRunWallLength,
    onOpenCabinetRun,
    onFlipCabinetRun,
    onCommitCabinetRun,
    onCancelCabinetRun,
    onAddCabinetRunItem,
    onRemoveCabinetRunItem,
    onMoveCabinetRunItem,
    onSetCabinetRunName,
    onSetCabinetRunOffset,
    onSetCabinetRunFinish,
    trace,
    traceFindings,
    traceMode,
    roomStatus,
    roomStatusText,
    onStartTrace,
    onFinishTrace,
    onTraceBackspace,
    onClearTrace,
    onGenerateRoom,
    onSetTraceMode,
    selectedPoint,
    selectedWall,
    selectedPointConnections,
    tracePpm,
    onDeleteWall,
    onSplitWall,
    onReverseWall,
    onSetWallLength,
    onSetWallProps,
    onDeletePoint,
    onMovePoint,
    onSeparateWall,
    onJoinNearby,
    connectedWalls,
    selectedTraceOpening,
    selectedTraceOpeningWall,
    onUpdateTraceOpening,
    onDuplicateTraceOpening,
    onDeleteTraceOpening,
    onCenterTraceOpening,
    snap,
    onSnapChange,
  } = props;

  return (
    <aside className="w-full shrink-0 border-t border-zinc-200 bg-white lg:w-[320px] lg:border-l lg:border-t-0 lg:overflow-y-auto">
      <div className="p-5">
        <Section title="Model">
          <ModelUploader
            fileName={fileName}
            fileSize={fileSize}
            loading={loading}
            error={error}
            onFile={onFile}
          />
          {modelInfo && fileName ? (
            <div className="mt-4">
              <ModelInspector
                info={modelInfo}
                fileName={fileName}
                fileSize={fileSize ?? 0}
                onRemove={onRemove}
              />
            </div>
          ) : null}
        </Section>

        <Section title="Plans">
          <PlansPanel
            plan={plan}
            calibration={planCalibration}
            pageDimensions={planPageDimensions}
            onReplaceFile={onPlanReplaceFile}
            onRemove={onPlanRemove}
            onUnderlay={onPlanUnderlay}
            onResetUnderlay={onPlanResetUnderlay}
            onConfirmCalibration={onPlanConfirmCalibration}
            alignMode={plan.alignMode}
            hideFloor={plan.hideFloor}
            onAlignMode={onPlanAlignMode}
            onHideFloor={onPlanHideFloor}
            onCenterUnderlay={onPlanCenterUnderlay}
            onAlignToOrigin={onPlanAlignToOrigin}
          />
        </Section>

        <Section title="Plan Analysis">
          <PlanAnalysisPanel
            analysis={planAnalysis}
            stale={analysisStale}
            search={analysisSearch}
            onSearchChange={onAnalysisSearchChange}
            minConfidence={analysisMinConfidence}
            onMinConfidenceChange={onAnalysisMinConfidenceChange}
            showOverlay={showAnalysisOverlay}
            onShowOverlayChange={onShowAnalysisOverlayChange}
            onAnalyze={onAnalyzePage}
            candidates={analysisCandidates}
            selectedCandidateId={selectedCandidateId}
            onSelectCandidate={onSelectCandidate}
            onLocate={onLocateCandidate}
            onUseForScale={onUseForScale}
            onReview={onReviewCandidate}
            onCorrect={onCorrectCandidate}
            fileIdentity={plan.fileName}
            assistedActive={assistedCalibrationActive}
            pendingAssisted={pendingAssistedCalibration}
            onConfirmAssisted={onConfirmAssistedCalibration}
            onCancelAssisted={onCancelAssistedCalibration}
            ocrStatus={ocrStatus}
            ocrProgress={ocrProgress}
            ocrError={ocrError}
            ocrPreset={ocrPreset}
            onOcrPresetChange={onOcrPresetChange}
            ocrMode={ocrMode}
            onOcrModeChange={onOcrModeChange}
            onRunOcr={onRunOcr}
            onCancelOcr={onCancelOcr}
            onStartRegion={onStartOcrRegion}
            regionSelecting={ocrRegionSelecting}
            ocrWordCount={ocrWordCount}
            ocrAverageConfidence={ocrAverageConfidence}
            ocrLowConfidenceCount={ocrLowConfidenceCount}
            ocrCompletedAt={ocrCompletedAt}
            sourceFilter={sourceFilter}
            onSourceFilterChange={onSourceFilterChange}
            assistedWarning={assistedCalibrationWarning}
            assistedWarningsAcknowledged={assistedWarningsAcknowledged}
            onAssistedWarningsAcknowledgedChange={
              onAssistedWarningsAcknowledgedChange
            }
          />
        </Section>

        <Section title="Wall Detection">
          <WallDetectionPanel
            analysis={wallDetection}
            status={wallDetectStatus}
            error={wallDetectError}
            stale={wallDetectionStale}
            preset={wallPreset}
            onPresetChange={onWallPresetChange}
            settings={wallSettings}
            onSettingsChange={onWallSettingsChange}
            onDetect={onDetectWalls}
            onCancel={onCancelWallDetection}
            showRawLines={showRawLines}
            showCleanedLines={showCleanedLines}
            showCandidates={showWallCandidates}
            onToggleRawLines={onToggleRawLines}
            onToggleCleanedLines={onToggleCleanedLines}
            onToggleCandidates={onToggleWallCandidates}
            selectedId={selectedWallCandidateId}
            onSelect={onSelectWallCandidate}
            onReview={onReviewWallCandidate}
            onBulkAccept={onBulkAcceptWallCandidates}
            onBulkReject={onBulkRejectWallCandidates}
            onResetReviews={onResetWallReviews}
            onReviewDetection={onReviewWallDetection}
            onSplit={onSplitWallCandidate}
            onReset={onResetWallCandidate}
            onTreatLineAsWall={onTreatLineAsWall}
            onUpdateCandidate={onUpdateWallCandidate}
            pixelsPerMeter={wallPixelsPerMeter}
            useTextAware={useTextAwareWallFilter}
            onUseTextAwareChange={onUseTextAwareWallFilterChange}
            onCreateTraceFromDetection={onCreateTraceFromDetection}
          />
        </Section>

        <Section title="Opening Detection">
          <OpeningDetectionPanel
            analysis={openingDetection}
            running={openingDetectionRunning}
            error={openingDetectionError}
            settings={openingDetectionSettings}
            onSettingsChange={onOpeningSettingsChange}
            onDetect={onDetectOpenings}
            onReview={onReviewOpenings}
            selectedId={selectedOpeningCandidateId}
            onSelect={onSelectOpeningCandidate}
            onReviewCandidate={onReviewOpeningCandidate}
            showOverlay={showOpeningDetectionOverlay}
            onShowOverlayChange={onShowOpeningDetectionOverlayChange}
            onAddReviewed={onAddReviewedOpenings}
          />
        </Section>

        <Section title="Cabinets">
          <CabinetCatalogPanel onAdd={onAddCabinet} />
          <div className="mt-3">
            <CabinetRunPanel
              proposal={cabinetRunProposal}
              catalogIds={cabinetRunCatalogIds}
              wallLength={cabinetRunWallLength}
              onOpen={onOpenCabinetRun}
              onFlip={onFlipCabinetRun}
              onCommit={onCommitCabinetRun}
              onCancel={onCancelCabinetRun}
              onAdd={onAddCabinetRunItem}
              onRemove={onRemoveCabinetRunItem}
              onMove={onMoveCabinetRunItem}
              onName={onSetCabinetRunName}
              onOffset={onSetCabinetRunOffset}
              onFinish={onSetCabinetRunFinish}
            />
          </div>
        </Section>

        {selectedCabinet ? (
          <Section title="Cabinet Inspector">
            <CabinetInspector
              cabinet={selectedCabinet}
              onUpdate={onUpdateCabinet}
              onDuplicate={onDuplicateCabinet}
              onReset={onResetCabinet}
              onToggleLock={onToggleCabinetLock}
              onHide={onHideCabinet}
              onRename={onRenameCabinet}
              disabled={cabinetTransforming}
            />
          </Section>
        ) : null}

        {selectedCabinetIds.length > 1 ? (
          <Section title="Cabinet Materials">
            <p className="text-xs text-zinc-500">
              {selectedCabinetIds.length} cabinets selected
            </p>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onAssignCabinetFinish(selectedCabinetIds, "perimeter")}
                className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Perimeter
              </button>
              <button
                type="button"
                onClick={() => onAssignCabinetFinish(selectedCabinetIds, "island")}
                className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Island
              </button>
              <button
                type="button"
                onClick={() => onAssignCabinetFinish(selectedCabinetIds, null)}
                className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50"
              >
                Clear
              </button>
            </div>
          </Section>
        ) : null}

        <Section title="Trace">
          <TracePanel
            trace={trace}
            findings={traceFindings}
            calibrationConfirmed={Boolean(plan.calibration?.confirmed)}
            traceMode={traceMode}
            roomStatus={roomStatus}
            roomStatusText={roomStatusText}
            onStartTrace={onStartTrace}
            onFinishTrace={onFinishTrace}
            onBackspace={onTraceBackspace}
            onClearTrace={onClearTrace}
            onGenerateRoom={onGenerateRoom}
            onSetTraceMode={onSetTraceMode}
            selectedPoint={selectedPoint}
            selectedWall={selectedWall}
            selectedPointConnections={selectedPointConnections}
            ppm={tracePpm}
            onDeleteWall={onDeleteWall}
            onSplitWall={onSplitWall}
            onReverseWall={onReverseWall}
            onSetWallLength={onSetWallLength}
            onSetWallProps={onSetWallProps}
            onDeletePoint={onDeletePoint}
            onMovePoint={onMovePoint}
            onSeparateWall={onSeparateWall}
            onJoinNearby={onJoinNearby}
            connectedWalls={connectedWalls}
            selectedOpening={selectedTraceOpening}
            selectedOpeningWall={selectedTraceOpeningWall}
            onUpdateOpening={onUpdateTraceOpening}
            onDuplicateOpening={onDuplicateTraceOpening}
            onDeleteOpening={onDeleteTraceOpening}
            onCenterOpening={onCenterTraceOpening}
          />
        </Section>

        {modelInfo ? (
          <Section title="Import Alignment">
            <ImportAlignmentPanel
              alignment={importAlignment}
              rawSize={importRawSize}
              onChange={onImportAlignmentChange}
              onAlign={onAlignImport}
              onReset={onResetImportAlignment}
            />
          </Section>
        ) : null}

        {tree.length > 0 ? (
          <Section title="Model Structure">
            <SceneGraphTree
              tree={tree}
              selectedIds={selectedIds}
              hiddenIds={hiddenIds}
              onSelectNodes={onSelectNodes}
            />
          </Section>
        ) : null}

        <Section title="Selection">
          <MaterialZonePanel
            selectedCount={selectedCount}
            currentZone={currentZone}
            hasModel={Boolean(modelInfo)}
            onAssign={onAssignZone}
            onClear={onClearZone}
          />
        </Section>

        <Section title="Object">
          <ObjectPanel
            key={object?.id ?? "none"}
            object={object}
            transform={transform}
            count={selectedCount}
            onPositionChange={onPositionChange}
            onRotationAxisChange={onRotationAxisChange}
            onLockToggle={onLockToggle}
            onReset={onReset}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
            onRename={onRename}
            canRename={canRename}
          />
        </Section>

        <Section title="Dimensions">
          <Toggle
            label="Room Dimensions"
            checked={showRoomDimensions}
            onChange={onToggleRoomDimensions}
          />
          <Toggle
            label="Selection Dimensions"
            checked={showSelectionDimensions}
            onChange={onToggleSelectionDimensions}
          />
          <Toggle
            label="Clearances"
            checked={showClearanceDimensions}
            onChange={onToggleClearanceDimensions}
          />
        </Section>

        <Section title="Clearances">
          {clearances.length === 0 ? (
            <p className="text-sm text-zinc-500">No clearance issues.</p>
          ) : (
            <ul className="space-y-1">
              {clearances.map((issue) => {
                const color =
                  issue.status === "conflict"
                    ? "text-red-600"
                    : issue.status === "warning"
                      ? "text-amber-600"
                      : "text-zinc-500";
                return (
                  <li
                    key={issue.id}
                    className="flex items-center justify-between gap-3 text-xs"
                  >
                    <span className={`min-w-0 truncate ${color}`}>
                      {issue.label}
                    </span>
                    <span className={`shrink-0 tabular-nums ${color}`}>
                      {issue.value}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-zinc-500">Warn (in)</span>
              <input
                type="number"
                step={1}
                value={Number(
                  metersToFeet(clearanceThresholds.clearanceWarningMeters) * 12,
                ).toFixed(0)}
                onChange={(event) => {
                  const inches = Number.parseFloat(event.target.value);
                  if (Number.isFinite(inches) && inches > 0) {
                    onClearanceThresholdsChange({
                      ...clearanceThresholds,
                      clearanceWarningMeters: inchesToMeters(inches),
                    });
                  }
                }}
                className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-zinc-500">Conflict (in)</span>
              <input
                type="number"
                step={1}
                value={Number(
                  metersToFeet(clearanceThresholds.clearanceConflictMeters) * 12,
                ).toFixed(0)}
                onChange={(event) => {
                  const inches = Number.parseFloat(event.target.value);
                  if (Number.isFinite(inches) && inches > 0) {
                    onClearanceThresholdsChange({
                      ...clearanceThresholds,
                      clearanceConflictMeters: inchesToMeters(inches),
                    });
                  }
                }}
                className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
              />
            </label>
          </div>
        </Section>

        <Section title="Material Zones">
          <ZoneSummary
            counts={zoneCounts}
            unassigned={unassigned}
            showZones={showZones}
            onToggleShowZones={onToggleShowZones}
            onSelectZone={onSelectZone}
          />
        </Section>

        <Section title="Materials">
          <MaterialPalette selections={selections} onSelect={onSelectMaterial} />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onRestoreOriginals}
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Restore Originals
            </button>
            <button
              type="button"
              onClick={onApplyLook}
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
            >
              Apply Current Look
            </button>
          </div>
        </Section>

        <Section title="Room">
          <RoomInspector
            room={room}
            selectedWallId={selectedWallId}
            selectedOpeningId={selectedOpeningId}
            onSelectWall={onSelectWall}
            onSelectOpening={onSelectOpening}
            onUpdateWall={onUpdateWall}
            onAddWall={onAddWall}
            onRemoveWall={onRemoveWall}
            onAddOpening={onAddOpening}
            onUpdateOpening={onUpdateOpening}
            onRemoveOpening={onRemoveOpening}
            onDuplicateOpening={onDuplicateOpening}
            onResetRoom={onResetRoom}
          />
        </Section>

        <Section title="Snapping">
          <SpacePlanningPanel
            snap={snap}
            onSnapChange={onSnapChange}
          />
        </Section>

        <Section title="Scene">
          <Toggle
            label="Grid"
            checked={settings.showGrid}
            onChange={(checked) => onSettingChange("showGrid", checked)}
          />
          <Toggle
            label="Shadows"
            checked={settings.showShadows}
            onChange={(checked) => onSettingChange("showShadows", checked)}
          />
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-zinc-500">Background</p>
            <div className="grid grid-cols-3 gap-2">
              {backgroundOptions.map((option) => {
                const active = settings.background === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSettingChange("background", option.value)}
                    className={`flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-zinc-200"
                      style={{
                        backgroundColor: backgroundColors[option.value],
                      }}
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title="Saved Looks">
          <p className="text-sm text-zinc-500">No saved looks yet.</p>
        </Section>
      </div>
    </aside>
  );
}
