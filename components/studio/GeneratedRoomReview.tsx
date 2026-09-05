"use client";

import { roomLayoutBounds, type RoomLayout } from "@/lib/studio/room";
import {
  totalWallLength,
  type RoomDifference,
  type RoomImpact,
} from "@/lib/studio/room-generation";
import { metersToFeet } from "@/lib/studio/transforms";

interface GeneratedRoomReviewProps {
  proposed: RoomLayout;
  current: RoomLayout;
  difference: RoomDifference;
  impacts: RoomImpact[];
  errors: string[];
  warnings: string[];
  hasGeneration: boolean;
  outOfDate: boolean;
  modifiedAfterGeneration: boolean;
  previewVisible: boolean;
  acknowledged: boolean;
  onAcknowledgedChange: (value: boolean) => void;
  onPreview: () => void;
  onReplace: () => void;
  onCancel: () => void;
}

function Counts({ room }: { room: RoomLayout }) {
  const openings = room.walls.flatMap((wall) => wall.openings);
  const doors = openings.filter((opening) => opening.type === "door").length;
  const windows = openings.filter((opening) => opening.type === "window").length;
  const passages = openings.filter(
    (opening) => opening.type === "passage",
  ).length;
  return (
    <p className="text-sm text-zinc-600">
      {room.walls.length} walls · {doors} doors · {windows} windows ·{" "}
      {passages} passages
    </p>
  );
}

export default function GeneratedRoomReview({
  proposed,
  current,
  difference,
  impacts,
  errors,
  warnings,
  hasGeneration,
  outOfDate,
  modifiedAfterGeneration,
  previewVisible,
  acknowledged,
  onAcknowledgedChange,
  onPreview,
  onReplace,
  onCancel,
}: GeneratedRoomReviewProps) {
  const bounds = roomLayoutBounds(proposed);
  const requireAcknowledgment =
    warnings.length > 0 || impacts.some((impact) => impact.warning);
  const canReplace = errors.length === 0 && (!requireAcknowledgment || acknowledged);

  return (
    <div className="p-5">
      <div className="mb-4">
        <h2 className="text-sm font-semibold text-zinc-900">
          Review generated room
        </h2>
        <p className="mt-1 text-xs text-zinc-500">
          Preview the proposed room before replacing your current one.
        </p>
      </div>

      <section className="rounded-lg border border-zinc-200 p-3">
        <p className="text-xs font-medium text-zinc-700">Proposed room</p>
        <Counts room={proposed} />
        <p className="mt-1 text-xs text-zinc-500">
          Total wall length{" "}
          <span className="tabular-nums text-zinc-700">
            {metersToFeet(totalWallLength(proposed)).toFixed(1)} ft
          </span>
        </p>
        <p className="text-xs text-zinc-500">
          Bounds{" "}
          <span className="tabular-nums text-zinc-700">
            {metersToFeet(bounds.size[0]).toFixed(1)} ×{" "}
            {metersToFeet(bounds.size[2]).toFixed(1)} ft
          </span>
        </p>
      </section>

      <section className="mt-3 rounded-lg border border-zinc-200 p-3">
        <p className="text-xs font-medium text-zinc-700">Current room</p>
        <Counts room={current} />
        <p className="mt-1 text-xs text-zinc-500">
          {hasGeneration
            ? outOfDate
              ? "Out of date with the trace"
              : modifiedAfterGeneration
                ? "Modified after generation"
                : "Matches trace"
            : "No generated room yet"}
        </p>
      </section>

      <section className="mt-3 rounded-lg border border-zinc-200 p-3">
        <p className="text-xs font-medium text-zinc-700">Changes</p>
        <ul className="mt-1 space-y-0.5 text-xs text-zinc-600">
          <li>
            Walls: +{difference.wallsAdded} −{difference.wallsRemoved} changed{" "}
            {difference.wallsChanged}
          </li>
          <li>
            Openings: +{difference.openingsAdded} −{difference.openingsRemoved}{" "}
            changed {difference.openingsChanged}
          </li>
          <li>Bounds: {difference.boundsChanged ? "changed" : "unchanged"}</li>
        </ul>
      </section>

      {errors.length > 0 ? (
        <section className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-xs font-semibold text-red-700">Validation errors</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-red-600">
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {warnings.length > 0 ? (
        <section className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs font-semibold text-amber-700">Warnings</p>
          <ul className="mt-1 list-inside list-disc space-y-0.5 text-xs text-amber-600">
            {warnings.map((warning) => (
              <li key={warning}>{warning}</li>
            ))}
          </ul>
        </section>
      ) : null}

      {impacts.length > 0 ? (
        <section className="mt-3 rounded-lg border border-zinc-200 p-3">
          <p className="text-xs font-medium text-zinc-700">Impact</p>
          <ul className="mt-1 space-y-1 text-xs text-zinc-600">
            {impacts.map((impact) => (
              <li key={impact.label}>
                <span className={impact.warning ? "font-medium text-amber-600" : ""}>
                  {impact.label}
                </span>
                {impact.detail ? (
                  <span className="text-zinc-400"> · {impact.detail}</span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {requireAcknowledgment && errors.length === 0 ? (
        <label className="mt-3 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3">
          <input
            type="checkbox"
            checked={acknowledged}
            onChange={(event) => onAcknowledgedChange(event.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-xs text-zinc-700">
            I understand the impact and want to continue anyway.
          </span>
        </label>
      ) : null}

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onPreview}
          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          {previewVisible ? "Update Preview" : "Preview in 3D"}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Cancel
        </button>
      </div>

      <button
        type="button"
        onClick={onReplace}
        disabled={!canReplace}
        className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md bg-zinc-900 px-3 text-sm font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
      >
        Replace Existing Room
      </button>
    </div>
  );
}
