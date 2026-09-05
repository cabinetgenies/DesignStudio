"use client";

import {
  type DimensionCandidate,
  type PlanAnalysis,
} from "@/lib/studio/plan-analysis";
import { feetToMeters, metersToFeet } from "@/lib/studio/transforms";
import { OCR_PRESETS, type OcrPreset } from "@/lib/studio/ocr-raster";

interface PlanAnalysisPanelProps {
  analysis: PlanAnalysis | null;
  stale: boolean;
  search: string;
  onSearchChange: (value: string) => void;
  minConfidence: number;
  onMinConfidenceChange: (value: number) => void;
  showOverlay: boolean;
  onShowOverlayChange: (value: boolean) => void;
  onAnalyze: () => void;
  candidates: DimensionCandidate[];
  selectedCandidateId: string | null;
  onSelectCandidate: (id: string | null) => void;
  onLocate: (id: string) => void;
  onUseForScale: (id: string) => void;
  onReview: (id: string, review: "accepted" | "rejected" | "unreviewed") => void;
  onCorrect: (id: string, meters: number) => void;
  fileIdentity: string | null;
  assistedActive: boolean;
  pendingAssisted: { meters: number; pixelsPerMeter: number } | null;
  onConfirmAssisted: () => void;
  onCancelAssisted: () => void;
  ocrStatus: "idle" | "initializing" | "recognizing" | "complete" | "failed" | "cancelled";
  ocrProgress: number;
  ocrError: string | null;
  ocrPreset: OcrPreset;
  onOcrPresetChange: (preset: OcrPreset) => void;
  ocrMode: "full" | "region";
  onOcrModeChange: (mode: "full" | "region") => void;
  onRunOcr: () => void;
  onCancelOcr: () => void;
  onStartRegion: () => void;
  regionSelecting: boolean;
  ocrWordCount: number;
  ocrAverageConfidence: number;
  ocrLowConfidenceCount: number;
  ocrCompletedAt: number | null;
  sourceFilter: "all" | "native" | "ocr" | "combined";
  onSourceFilterChange: (filter: "all" | "native" | "ocr" | "combined") => void;
  assistedWarning: string | null;
  assistedWarningsAcknowledged: boolean;
  onAssistedWarningsAcknowledgedChange: (value: boolean) => void;
}

function statusColor(status: DimensionCandidate["status"]): string {
  if (status === "rejected") {
    return "text-red-600";
  }
  if (status === "warning") {
    return "text-amber-600";
  }
  return "text-emerald-600";
}

export default function PlanAnalysisPanel({
  analysis,
  stale,
  search,
  onSearchChange,
  minConfidence,
  onMinConfidenceChange,
  showOverlay,
  onShowOverlayChange,
  onAnalyze,
  candidates,
  selectedCandidateId,
  onSelectCandidate,
  onLocate,
  onUseForScale,
  onReview,
  onCorrect,
  fileIdentity,
  assistedActive,
  pendingAssisted,
  onConfirmAssisted,
  onCancelAssisted,
  ocrStatus,
  ocrProgress,
  ocrError,
  ocrPreset,
  onOcrPresetChange,
  ocrMode,
  onOcrModeChange,
  onRunOcr,
  onCancelOcr,
  onStartRegion,
  regionSelecting,
  ocrWordCount,
  ocrAverageConfidence,
  ocrLowConfidenceCount,
  ocrCompletedAt,
  sourceFilter,
  onSourceFilterChange,
  assistedWarning,
  assistedWarningsAcknowledged,
  onAssistedWarningsAcknowledgedChange,
}: PlanAnalysisPanelProps) {
  const warnings = analysis?.findings.filter((f) => f.severity === "warning") ?? [];

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onAnalyze}
        disabled={analysis?.status === "analyzing"}
        className="inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
      >
        {analysis && analysis.status !== "not-analyzed" && analysis.status !== "failed"
          ? "Reanalyze Page"
          : "Analyze Page"}
      </button>

      <div className="rounded-lg border border-zinc-200 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-zinc-700">OCR</span>
          <span className="text-[11px] text-zinc-500">{ocrStatus}</span>
        </div>
        {(ocrStatus === "initializing" || ocrStatus === "recognizing") ? (
          <div className="mt-1 h-1.5 w-full overflow-hidden rounded bg-zinc-100">
            <div
              className="h-full bg-blue-500"
              style={{ width: `${Math.round(ocrProgress * 100)}%` }}
            />
          </div>
        ) : null}
        <div className="mt-2 grid grid-cols-2 gap-1.5">
          <select
            value={ocrPreset}
            onChange={(event) => onOcrPresetChange(event.target.value as OcrPreset)}
            className="h-7 rounded-md border border-zinc-200 px-1 text-[11px]"
          >
            {OCR_PRESETS.map((preset) => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>
          <select
            value={ocrMode}
            onChange={(event) =>
              onOcrModeChange(event.target.value as "full" | "region")
            }
            className="h-7 rounded-md border border-zinc-200 px-1 text-[11px]"
          >
            <option value="full">Full Page</option>
            <option value="region">Select Region</option>
          </select>
        </div>
        <div className="mt-2 flex gap-1.5">
          <button
            type="button"
            onClick={onRunOcr}
            disabled={ocrStatus === "initializing" || ocrStatus === "recognizing"}
            className="h-7 flex-1 rounded-md bg-zinc-900 px-2 text-[11px] font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300"
          >
            {ocrStatus === "complete" ? "Re-run OCR" : "Run OCR"}
          </button>
          <button
            type="button"
            onClick={onCancelOcr}
            disabled={ocrStatus !== "initializing" && ocrStatus !== "recognizing"}
            className="h-7 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-700 disabled:opacity-40"
          >
            Cancel
          </button>
          {ocrMode === "region" ? (
            <button
              type="button"
              onClick={onStartRegion}
              className={`h-7 rounded-md px-2 text-[11px] ${
                regionSelecting
                  ? "bg-blue-600 text-white"
                  : "border border-zinc-200 text-zinc-700"
              }`}
            >
              Region
            </button>
          ) : null}
        </div>
        {ocrCompletedAt ? (
          <p className="mt-1 text-[11px] text-zinc-500">
            {ocrWordCount} words · avg{" "}
            {Math.round(ocrAverageConfidence * 100)}% ·{" "}
            {ocrLowConfidenceCount} low confidence
          </p>
        ) : null}
        {ocrError ? (
          <p className="mt-1 text-[11px] text-red-600">{ocrError}</p>
        ) : null}
      </div>

      <label className="block text-xs text-zinc-600">
        <span>Source</span>
        <select
          value={sourceFilter}
          onChange={(event) =>
            onSourceFilterChange(
              event.target.value as "all" | "native" | "ocr" | "combined",
            )
          }
          className="mt-1 h-7 w-full rounded-md border border-zinc-200 px-2 text-sm"
        >
          <option value="all">All results</option>
          <option value="native">Native text</option>
          <option value="ocr">OCR text</option>
          <option value="combined">Combined</option>
        </select>
      </label>

      {analysis ? (
        <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <p>
            Status{" "}
            <span className="font-medium text-zinc-800">
              {stale ? "stale" : analysis.status}
            </span>
          </p>
          <p>
            {analysis.textItems.length} text items · {analysis.candidates.length}{" "}
            dimensions · {warnings.length} warnings
          </p>
          <p className="truncate">
            {fileIdentity ?? "No PDF"} · page {analysis.pageNumber}
          </p>
          {analysis.completedAt ? (
            <p>
              Analyzed {new Date(analysis.completedAt).toLocaleTimeString()}
            </p>
          ) : null}
          {stale ? (
            <p className="font-medium text-amber-600">
              Reanalyze before using for scale.
            </p>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-zinc-400">No analysis yet.</p>
      )}

      <label className="flex items-center justify-between text-xs text-zinc-600">
        <span>Show overlay</span>
        <input
          type="checkbox"
          checked={showOverlay}
          onChange={(event) => onShowOverlayChange(event.target.checked)}
          className="h-4 w-4 rounded border-zinc-300"
        />
      </label>

      <label className="block text-xs text-zinc-600">
        <span>Search</span>
        <input
          type="text"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Filter dimensions"
          className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
        />
      </label>

      <label className="block text-xs text-zinc-600">
        <span>Min confidence: {Math.round(minConfidence * 100)}%</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={minConfidence}
          onChange={(event) =>
            onMinConfidenceChange(Number(event.target.value))
          }
          className="mt-1 w-full"
        />
      </label>

      {assistedActive ? (
        <p className="rounded-md border border-blue-200 bg-blue-50 p-2 text-xs text-blue-700">
          Click the two matching plan endpoints.
        </p>
      ) : null}

      {pendingAssisted ? (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-xs font-medium text-blue-800">
            Review assisted scale
          </p>
          <p className="mt-1 text-xs text-blue-700">
            {metersToFeet(pendingAssisted.meters).toFixed(2)} ft ·{" "}
            {pendingAssisted.pixelsPerMeter.toFixed(1)} px/m
          </p>
          {assistedWarning ? (
            <>
              <p className="mt-1 text-[11px] font-medium text-amber-700">
                {assistedWarning}
              </p>
              <label className="mt-1 flex items-start gap-2 text-[11px] text-blue-800">
                <input
                  type="checkbox"
                  checked={assistedWarningsAcknowledged}
                  onChange={(event) =>
                    onAssistedWarningsAcknowledgedChange(event.target.checked)
                  }
                  className="mt-0.5 h-3.5 w-3.5 rounded border-blue-300"
                />
                Confirm anyway
              </label>
            </>
          ) : null}
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={onConfirmAssisted}
              className="h-8 rounded-md bg-blue-600 text-xs font-medium text-white hover:bg-blue-500"
            >
              Confirm
            </button>
            <button
              type="button"
              onClick={onCancelAssisted}
              className="h-8 rounded-md border border-blue-200 text-xs text-blue-700 hover:bg-blue-100"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        {candidates.map((candidate) => {
          const selected = candidate.id === selectedCandidateId;
          return (
            <div
              key={candidate.id}
              className={`rounded-lg border p-2 ${
                selected ? "border-blue-400 bg-blue-50" : "border-zinc-200"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectCandidate(selected ? null : candidate.id)}
                className="flex w-full items-center justify-between gap-2 text-left"
              >
                <span className="text-xs font-semibold text-zinc-800">
                  {candidate.display}
                </span>
                <span
                  className={`text-[11px] font-medium ${statusColor(candidate.status)}`}
                >
                  {candidate.review === "accepted"
                    ? "Accepted"
                    : candidate.review === "rejected"
                      ? "Rejected"
                      : `${Math.round(candidate.confidence * 100)}%`}
                </span>
              </button>
              <p className="mt-0.5 truncate text-[11px] text-zinc-500">
                {candidate.raw}
                {candidate.reason ? ` · ${candidate.reason}` : ""}
              </p>

              {selected ? (
                <div className="mt-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step={0.05}
                      defaultValue={Number(
                        metersToFeet(
                          candidate.correctedMeters ?? candidate.meters,
                        ).toFixed(2),
                      )}
                      onBlur={(event) => {
                        const feet = Number.parseFloat(event.target.value);
                        if (Number.isFinite(feet) && feet > 0) {
                          onCorrect(candidate.id, feetToMeters(feet));
                        }
                      }}
                      className="h-7 w-20 rounded-md border border-zinc-200 px-2 text-xs"
                    />
                    <span className="text-xs text-zinc-500">ft</span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <button
                      type="button"
                      onClick={() => onLocate(candidate.id)}
                      className="h-7 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-700 hover:bg-zinc-50"
                    >
                      Locate
                    </button>
                    <button
                      type="button"
                      onClick={() => onUseForScale(candidate.id)}
                      disabled={stale}
                      className="h-7 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                    >
                      Use for Scale
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onReview(
                          candidate.id,
                          candidate.review === "accepted" ? "unreviewed" : "accepted",
                        )
                      }
                      className="h-7 rounded-md border border-zinc-200 px-2 text-[11px] text-zinc-700 hover:bg-zinc-50"
                    >
                      Accept
                    </button>
                    <button
                      type="button"
                      onClick={() => onReview(candidate.id, "rejected")}
                      className="h-7 rounded-md border border-red-200 px-2 text-[11px] text-red-600 hover:bg-red-50"
                    >
                      Reject
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {analysis?.findings.map((finding) => (
        <p
          key={finding.id}
          className={`text-xs ${
            finding.severity === "error"
              ? "text-red-600"
              : finding.severity === "warning"
                ? "text-amber-600"
                : "text-zinc-500"
          }`}
        >
          {finding.message}
        </p>
      ))}
    </div>
  );
}
