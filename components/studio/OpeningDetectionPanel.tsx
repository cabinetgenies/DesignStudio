"use client";

import type {
  OpeningDetectionAnalysis,
  OpeningDetectionSettings,
} from "@/lib/studio/opening-detection";

export default function OpeningDetectionPanel({
  analysis,
  running,
  error,
  settings,
  onSettingsChange,
  onDetect,
  onReview,
  selectedId,
  onSelect,
  onReviewCandidate,
  showOverlay,
  onShowOverlayChange,
  onAddReviewed,
}: {
  analysis: OpeningDetectionAnalysis | null;
  running: boolean;
  error: string | null;
  settings: OpeningDetectionSettings;
  onSettingsChange: (settings: OpeningDetectionSettings) => void;
  onDetect: () => void;
  onReview: () => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onReviewCandidate: (
    id: string,
    review: "unreviewed" | "accepted" | "rejected" | "edited",
  ) => void;
  showOverlay: boolean;
  onShowOverlayChange: (value: boolean) => void;
  onAddReviewed: () => void;
}) {
  const doors = analysis?.candidates.filter((c) => c.type === "door").length ?? 0;
  const windows = analysis?.candidates.filter((c) => c.type === "window").length ?? 0;
  const passages = analysis?.candidates.filter((c) => c.type === "passage").length ?? 0;
  const unknown = analysis?.candidates.filter((c) => c.type === "unknown").length ?? 0;
  const accepted = analysis?.candidates.filter((c) => c.review === "accepted").length ?? 0;
  const rejected = analysis?.candidates.filter((c) => c.review === "rejected").length ?? 0;

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={onDetect}
        disabled={running}
        className="h-8 w-full rounded-md bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800 disabled:bg-zinc-300"
      >
        {running ? "Analyzing openings…" : analysis ? "Re-run Detection" : "Detect Openings"}
      </button>
      <button
        type="button"
        onClick={onReview}
        disabled={!analysis}
        className="h-8 w-full rounded-md border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        Review Openings
      </button>
      <button
        type="button"
        onClick={onAddReviewed}
        disabled={!analysis}
        className="h-8 w-full rounded-md border border-zinc-200 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
      >
        Add Reviewed Openings to Trace
      </button>
      {error ? <p className="text-[11px] text-red-600">{error}</p> : null}
      {analysis ? (
        <p className="text-[11px] text-zinc-500">
          {analysis.candidates.length} total · {doors} doors · {windows} windows ·{" "}
          {passages} passages · {unknown} unknown · {accepted} accepted · {rejected} rejected
        </p>
      ) : null}
      <label className="flex items-center justify-between text-[11px] text-zinc-600">
        <span>Show Opening Candidates</span>
        <input type="checkbox" checked={showOverlay} onChange={(e) => onShowOverlayChange(e.target.checked)} className="h-4 w-4" />
      </label>
      <label className="block text-[11px] text-zinc-600">
        Min confidence
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={settings.minConfidence}
          onChange={(e) =>
            onSettingsChange({ ...settings, minConfidence: Number(e.target.value) })
          }
          className="mt-1 w-full"
        />
      </label>
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
                  {candidate.type} · {candidate.widthM?.toFixed(2) ?? candidate.width.toFixed(1)}
                </span>
                <span className="text-[10px] text-zinc-500">
                  {candidate.review} · {Math.round(candidate.confidence * 100)}%
                </span>
              </button>
              <p className="truncate text-[10px] text-zinc-500">
                {candidate.parentWallId} · {candidate.reasons[0] ?? ""}
              </p>
              {selected ? (
                <div className="mt-1.5 flex gap-1">
                  <button type="button" onClick={() => onReviewCandidate(candidate.id, "accepted")} className="h-6 rounded border border-zinc-200 px-1.5 text-[10px]">Accept</button>
                  <button type="button" onClick={() => onReviewCandidate(candidate.id, "rejected")} className="h-6 rounded border border-red-200 px-1.5 text-[10px] text-red-600">Reject</button>
                  <button type="button" onClick={() => onReviewCandidate(candidate.id, "unreviewed")} className="h-6 rounded border border-zinc-200 px-1.5 text-[10px]">Restore</button>
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
