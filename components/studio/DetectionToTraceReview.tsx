"use client";

import type { DetectionToTraceResult } from "@/lib/studio/detection-to-trace";

export default function DetectionToTraceReview({
  result,
  mode,
  acknowledged,
  existingWallCount,
  existingOpeningCount,
  onModeChange,
  onPreview,
  onCommit,
  onCancel,
  onAcknowledge,
}: {
  result: DetectionToTraceResult;
  mode: "replace" | "append";
  acknowledged: boolean;
  existingWallCount: number;
  existingOpeningCount: number;
  onModeChange: (mode: "replace" | "append") => void;
  onPreview: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onAcknowledge: (value: boolean) => void;
}) {
  const errors = result.findings.filter((f) => f.severity === "error");
  const warnings = result.findings.filter((f) => f.severity === "warning");
  const requiresAck =
    mode === "replace" && (existingWallCount > 0 || existingOpeningCount > 0);

  return (
    <div className="p-5">
      <h2 className="text-sm font-semibold text-zinc-900">
        Create Trace from Detection
      </h2>
      <div className="mt-2 rounded-md bg-zinc-50 p-3 text-xs text-zinc-600">
        <p>{result.summary.eligibleCount} eligible · {result.summary.skippedCount} skipped</p>
        <p>{result.summary.wallCount} walls · {result.summary.pointCount} points</p>
        <p>{result.summary.endpointJoins} joins · {result.summary.duplicateWallsSkipped} duplicates</p>
        <p>Existing: {existingWallCount} walls · {existingOpeningCount} openings</p>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onModeChange("replace")}
          className={`h-8 rounded-md text-xs font-medium ${mode === "replace" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-700"}`}
        >
          Replace Existing Trace
        </button>
        <button
          type="button"
          onClick={() => onModeChange("append")}
          className={`h-8 rounded-md text-xs font-medium ${mode === "append" ? "bg-zinc-900 text-white" : "border border-zinc-200 text-zinc-700"}`}
        >
          Add to Existing Trace
        </button>
      </div>

      {requiresAck ? (
        <label className="mt-3 flex items-start gap-2 rounded-md border border-amber-200 bg-amber-50 p-2">
          <input type="checkbox" checked={acknowledged} onChange={(e) => onAcknowledge(e.target.checked)} className="mt-0.5 h-4 w-4" />
          <span className="text-xs text-amber-700">Replacing will remove existing trace geometry.</span>
        </label>
      ) : null}

      {errors.map((f) => (
        <p key={f.message} className="mt-2 text-xs text-red-600">{f.message}</p>
      ))}
      {warnings.map((f) => (
        <p key={f.message} className="mt-2 text-xs text-amber-600">{f.message}</p>
      ))}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <button type="button" onClick={onPreview} disabled={errors.length > 0} className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700 disabled:opacity-40">Preview Trace</button>
        <button type="button" onClick={onCommit} disabled={errors.length > 0 || (requiresAck && !acknowledged)} className="h-8 rounded-md bg-zinc-900 text-xs font-medium text-white disabled:bg-zinc-300">Create Trace</button>
        <button type="button" onClick={onCancel} className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700">Cancel</button>
      </div>
    </div>
  );
}
