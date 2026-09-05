"use client";

import { useEffect, useRef, useState } from "react";
import type {
  WallCandidatePatch,
  WallDetectionAnalysis,
  WallDetectionSettings,
} from "@/lib/studio/wall-detection";
import { WALL_DETECTION_PRESETS, type WallDetectionPreset } from "@/lib/studio/wall-detect";
import { feetToMeters, metersToFeet } from "@/lib/studio/transforms";

function CandidateNumberInput({
  label,
  value,
  suffix,
  validate,
  onCommit,
}: {
  label: string;
  value: number;
  suffix: string;
  validate?: (value: number) => string | null;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  const [error, setError] = useState<string | null>(null);
  const committedRef = useRef(value);
  const suppressRef = useRef(false);

  useEffect(() => {
    if (value !== committedRef.current) {
      committedRef.current = value;
      setDraft(String(value));
      setError(null);
    }
  }, [value]);

  function commit() {
    if (suppressRef.current) {
      suppressRef.current = false;
      return;
    }
    const parsed = Number(draft);
    if (!Number.isFinite(parsed)) {
      setError("Invalid number");
      return;
    }
    if (validate) {
      const message = validate(parsed);
      if (message) {
        setError(message);
        return;
      }
    }
    setError(null);
    if (parsed === value) {
      return;
    }
    committedRef.current = parsed;
    onCommit(parsed);
  }

  return (
    <label className="block">
      <span className="text-[11px] text-zinc-500">
        {label} {suffix ? `(${suffix})` : ""}
      </span>
      <input
        type="number"
        step="any"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            suppressRef.current = true;
            commit();
          } else if (event.key === "Escape") {
            suppressRef.current = true;
            committedRef.current = value;
            setDraft(String(value));
            setError(null);
          }
        }}
        className="mt-0.5 h-7 w-full rounded-md border border-zinc-200 px-2 text-xs"
      />
      {error ? <span className="text-[10px] text-red-600">{error}</span> : null}
    </label>
  );
}

interface WallDetectionPanelProps {
  analysis: WallDetectionAnalysis | null;
  status: "idle" | "analyzing" | "complete" | "failed" | "cancelled";
  error: string | null;
  stale: boolean;
  preset: WallDetectionPreset;
  onPresetChange: (preset: WallDetectionPreset) => void;
  settings: WallDetectionSettings;
  onSettingsChange: (settings: WallDetectionSettings) => void;
  onDetect: () => void;
  onCancel: () => void;
  showRawLines: boolean;
  showCleanedLines: boolean;
  showCandidates: boolean;
  onToggleRawLines: (value: boolean) => void;
  onToggleCleanedLines: (value: boolean) => void;
  onToggleCandidates: (value: boolean) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReview: (id: string, review: "unreviewed" | "accepted" | "rejected" | "edited") => void;
  onBulkAccept: () => void;
  onBulkReject: () => void;
  onResetReviews: () => void;
  useTextAware: boolean;
  onUseTextAwareChange: (value: boolean) => void;
  onReviewDetection: () => void;
  onSplit: (id: string) => void;
  onReset: (id: string) => void;
  onTreatLineAsWall: (id: string) => void;
  onUpdateCandidate: (id: string, patch: WallCandidatePatch) => void;
  pixelsPerMeter: number | null;
  onCreateTraceFromDetection: () => void;
}

export default function WallDetectionPanel({
  analysis,
  status,
  error,
  stale,
  preset,
  onPresetChange,
  settings,
  onSettingsChange,
  onDetect,
  onCancel,
  showRawLines,
  showCleanedLines,
  showCandidates,
  onToggleRawLines,
  onToggleCleanedLines,
  onToggleCandidates,
  selectedId,
  onSelect,
  onReview,
  onBulkAccept,
  onBulkReject,
  onResetReviews,
  useTextAware,
  onUseTextAwareChange,
  onReviewDetection,
  onSplit,
  onReset,
  onTreatLineAsWall,
  onUpdateCandidate,
  pixelsPerMeter,
  onCreateTraceFromDetection,
}: WallDetectionPanelProps) {
  const highConfidence = analysis?.candidates.filter((c) => c.confidence >= 0.7).length ?? 0;
  const accepted = analysis?.candidates.filter((c) => c.review === "accepted").length ?? 0;
  const rejected = analysis?.candidates.filter((c) => c.review === "rejected").length ?? 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1.5">
        <select
          value={preset}
          onChange={(event) => onPresetChange(event.target.value as WallDetectionPreset)}
          className="h-7 rounded-md border border-zinc-200 px-1 text-[11px]"
        >
          {WALL_DETECTION_PRESETS.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={onDetect}
          disabled={status === "analyzing"}
          className="h-7 rounded-md bg-zinc-900 px-2 text-[11px] font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300"
        >
          {status === "analyzing" ? "Detecting…" : analysis ? "Re-run Detection" : "Detect Walls"}
        </button>
      </div>

      <button
        type="button"
        onClick={onReviewDetection}
        className="h-7 w-full rounded-md border border-zinc-200 px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
      >
        Review Detection
      </button>
      <button
        type="button"
        onClick={onCreateTraceFromDetection}
        disabled={!analysis}
        className="h-7 w-full rounded-md border border-zinc-200 px-2 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        Create Trace from Detection
      </button>

      {status === "analyzing" ? (
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-zinc-500">Detecting walls…</span>
          <button
            type="button"
            onClick={onCancel}
            className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900"
          >
            Cancel
          </button>
        </div>
      ) : null}

      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
      {stale ? <p className="text-[11px] font-medium text-amber-600">Stale results</p> : null}

      {analysis ? (
        <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
          <p>
            {analysis.rawLines.length} raw · {analysis.cleanedLines.length} cleaned ·{" "}
            {analysis.candidates.length} walls
          </p>
          <p>
            {highConfidence} high confidence · {accepted} accepted · {rejected} rejected
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <label className="block text-[11px] text-zinc-500">
          Min length (px)
          <input
            type="number"
            step={5}
            value={settings.minLengthPx}
            onChange={(event) =>
              onSettingsChange({ ...settings, minLengthPx: Number(event.target.value) })
            }
            className="mt-0.5 h-7 w-full rounded-md border border-zinc-200 px-1 text-xs"
          />
        </label>
        <label className="block text-[11px] text-zinc-500">
          Angle tol (°)
          <input
            type="number"
            step={0.5}
            value={settings.angleToleranceDeg}
            onChange={(event) =>
              onSettingsChange({ ...settings, angleToleranceDeg: Number(event.target.value) })
            }
            className="mt-0.5 h-7 w-full rounded-md border border-zinc-200 px-1 text-xs"
          />
        </label>
        <label className="block text-[11px] text-zinc-500">
          Min thickness (px)
          <input
            type="number"
            step={1}
            value={settings.minThicknessPx}
            onChange={(event) =>
              onSettingsChange({ ...settings, minThicknessPx: Number(event.target.value) })
            }
            className="mt-0.5 h-7 w-full rounded-md border border-zinc-200 px-1 text-xs"
          />
        </label>
        <label className="block text-[11px] text-zinc-500">
          Max thickness (px)
          <input
            type="number"
            step={1}
            value={settings.maxThicknessPx}
            onChange={(event) =>
              onSettingsChange({ ...settings, maxThicknessPx: Number(event.target.value) })
            }
            className="mt-0.5 h-7 w-full rounded-md border border-zinc-200 px-1 text-xs"
          />
        </label>
      </div>

      <div className="space-y-1">
        <label className="flex items-center justify-between text-[11px] text-zinc-600">
          <span>Raw lines</span>
          <input type="checkbox" checked={showRawLines} onChange={(e) => onToggleRawLines(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between text-[11px] text-zinc-600">
          <span>Cleaned lines</span>
          <input type="checkbox" checked={showCleanedLines} onChange={(e) => onToggleCleanedLines(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between text-[11px] text-zinc-600">
          <span>Wall candidates</span>
          <input type="checkbox" checked={showCandidates} onChange={(e) => onToggleCandidates(e.target.checked)} />
        </label>
        <label className="flex items-center justify-between text-[11px] text-zinc-600">
          <span>Text-aware filtering</span>
          <input type="checkbox" checked={useTextAware} onChange={(e) => onUseTextAwareChange(e.target.checked)} />
        </label>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        <button type="button" onClick={onBulkAccept} className="h-7 rounded-md border border-zinc-200 px-1 text-[11px] text-zinc-700 hover:bg-zinc-50">Accept High</button>
        <button type="button" onClick={onBulkReject} className="h-7 rounded-md border border-zinc-200 px-1 text-[11px] text-zinc-700 hover:bg-zinc-50">Reject Low</button>
        <button type="button" onClick={onResetReviews} className="h-7 rounded-md border border-zinc-200 px-1 text-[11px] text-zinc-700 hover:bg-zinc-50">Reset</button>
      </div>

      {analysis?.candidates.find((candidate) => candidate.id === selectedId)
        ? (() => {
            const candidate = analysis.candidates.find(
              (item) => item.id === selectedId,
            )!;
            const ppm = pixelsPerMeter;
            const toDisplay = (canonical: number) =>
              ppm ? metersToFeet(canonical / ppm) : canonical;
            const fromDisplay = (display: number) =>
              ppm ? feetToMeters(display) * ppm : display;
            const suffix = ppm ? "ft" : "plan units";
            const positive = (v: number) => (v <= 0 ? "Must be positive" : null);
            return (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <p className="text-xs font-medium text-blue-900">
                  Selected Wall Candidate
                </p>
                <p className="text-[11px] text-blue-700">
                  {candidate.id} · {candidate.review} ·{" "}
                  {Math.round(candidate.confidence * 100)}% confidence
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <CandidateNumberInput
                    label="Start X"
                    value={toDisplay(candidate.centerline.x1)}
                    suffix={suffix}
                    onCommit={(v) =>
                      onUpdateCandidate(candidate.id, {
                        start: { x: fromDisplay(v), y: candidate.centerline.y1 },
                      })
                    }
                  />
                  <CandidateNumberInput
                    label="Start Y"
                    value={toDisplay(candidate.centerline.y1)}
                    suffix={suffix}
                    onCommit={(v) =>
                      onUpdateCandidate(candidate.id, {
                        start: { x: candidate.centerline.x1, y: fromDisplay(v) },
                      })
                    }
                  />
                  <CandidateNumberInput
                    label="End X"
                    value={toDisplay(candidate.centerline.x2)}
                    suffix={suffix}
                    onCommit={(v) =>
                      onUpdateCandidate(candidate.id, {
                        end: { x: fromDisplay(v), y: candidate.centerline.y2 },
                      })
                    }
                  />
                  <CandidateNumberInput
                    label="End Y"
                    value={toDisplay(candidate.centerline.y2)}
                    suffix={suffix}
                    onCommit={(v) =>
                      onUpdateCandidate(candidate.id, {
                        end: { x: candidate.centerline.x2, y: fromDisplay(v) },
                      })
                    }
                  />
                  <CandidateNumberInput
                    label="Length"
                    value={toDisplay(candidate.lengthPx)}
                    suffix={suffix}
                    validate={positive}
                    onCommit={(v) =>
                      onUpdateCandidate(candidate.id, { length: fromDisplay(v) })
                    }
                  />
                  <CandidateNumberInput
                    label="Angle"
                    value={candidate.angleDeg}
                    suffix="deg"
                    onCommit={(v) =>
                      onUpdateCandidate(candidate.id, { angle: v })
                    }
                  />
                  <CandidateNumberInput
                    label="Thickness"
                    value={toDisplay(candidate.thicknessPx)}
                    suffix={suffix}
                    validate={positive}
                    onCommit={(v) =>
                      onUpdateCandidate(candidate.id, {
                        thicknessPx: fromDisplay(v),
                      })
                    }
                  />
                  <CandidateNumberInput
                    label="Height"
                    value={metersToFeet(candidate.heightM ?? 0)}
                    suffix="ft"
                    validate={positive}
                    onCommit={(v) =>
                      onUpdateCandidate(candidate.id, {
                        heightM: feetToMeters(v),
                      })
                    }
                  />
                </div>
                <button
                  type="button"
                  onClick={() => onReset(candidate.id)}
                  className="mt-2 h-7 w-full rounded-md border border-zinc-200 text-[11px] text-zinc-700 hover:bg-zinc-50"
                >
                  Reset Candidate
                </button>
              </div>
            );
          })()
        : null}

      <div className="space-y-1.5">
        {analysis?.candidates.map((candidate) => {
          const selected = candidate.id === selectedId;
          return (
            <div
              key={candidate.id}
              className={`rounded-md border p-2 ${selected ? "border-blue-400 bg-blue-50" : "border-zinc-200"}`}
            >
              <button
                type="button"
                onClick={() => onSelect(selected ? null : candidate.id)}
                className="flex w-full items-center justify-between text-left"
              >
                <span className="text-xs font-medium text-zinc-800">
                  {candidate.id} · {(candidate.lengthM ?? 0).toFixed(2)} m
                </span>
                <span
                  className={`text-[10px] font-medium ${
                    candidate.confidence >= 0.7
                      ? "text-emerald-600"
                      : candidate.confidence >= 0.45
                        ? "text-amber-600"
                        : "text-red-600"
                  }`}
                >
                  {Math.round(candidate.confidence * 100)}%
                </span>
              </button>
              {selected ? (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    onClick={() => onReview(candidate.id, "accepted")}
                    className="h-6 rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-700"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(candidate.id, "rejected")}
                    className="h-6 rounded border border-red-200 px-1.5 text-[10px] text-red-600"
                  >
                    Reject
                  </button>
                  <button
                    type="button"
                    onClick={() => onReview(candidate.id, "unreviewed")}
                    className="h-6 rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-700"
                  >
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => onSplit(candidate.id)}
                    className="h-6 rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-700"
                  >
                    Split
                  </button>
                  <button
                    type="button"
                    onClick={() => onReset(candidate.id)}
                    className="h-6 rounded border border-zinc-200 px-1.5 text-[10px] text-zinc-700"
                  >
                    Reset
                  </button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {analysis && analysis.cleanedLines.length > 0 ? (
        <div>
          <p className="mb-1 text-[11px] font-medium text-zinc-500">
            Unpaired structural lines
          </p>
          <div className="space-y-1">
            {analysis.cleanedLines.map((line) => (
              <div
                key={line.id}
                className="flex items-center justify-between gap-2 text-[11px] text-zinc-600"
              >
                <span className="truncate">{line.id}</span>
                <button
                  type="button"
                  onClick={() => onTreatLineAsWall(line.id)}
                  className="shrink-0 text-[10px] font-medium text-zinc-700 hover:text-zinc-900"
                >
                  Treat as Wall
                </button>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
