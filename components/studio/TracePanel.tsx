"use client";

import type { KeyboardEvent } from "react";
import {
  evaluateOpeningPlacement,
  traceWallLengthPx,
  type PlanTrace,
  type TraceInteractionMode,
  type TracePoint,
  type TracedOpening,
  type TracedWall,
} from "@/lib/studio/trace";
import type { TraceFinding } from "@/lib/studio/trace-validation";
import { feetToMeters, metersToFeet } from "@/lib/studio/transforms";
import type { RoomSyncStatus } from "@/lib/studio/room-generation";

interface TracePanelProps {
  trace: PlanTrace | null;
  findings: TraceFinding[];
  calibrationConfirmed: boolean;
  traceMode: TraceInteractionMode | null;
  roomStatus: RoomSyncStatus;
  roomStatusText: string;
  onStartTrace: () => void;
  onFinishTrace: () => void;
  onBackspace: () => void;
  onClearTrace: () => void;
  onGenerateRoom: () => void;
  onSetTraceMode: (mode: TraceInteractionMode | null) => void;
  selectedPoint: TracePoint | null;
  selectedWall: TracedWall | null;
  selectedPointConnections: number;
  ppm: number;
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
  selectedOpening: TracedOpening | null;
  selectedOpeningWall: TracedWall | null;
  onUpdateOpening: (opening: TracedOpening) => void;
  onDuplicateOpening: (openingId: string) => void;
  onDeleteOpening: (openingId: string) => void;
  onCenterOpening: (openingId: string) => void;
}

export default function TracePanel({
  trace,
  findings,
  calibrationConfirmed,
  traceMode,
  roomStatus,
  roomStatusText,
  onStartTrace,
  onFinishTrace,
  onBackspace,
  onClearTrace,
  onGenerateRoom,
  onSetTraceMode,
  selectedPoint,
  selectedWall,
  selectedPointConnections,
  ppm,
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
  selectedOpening,
  selectedOpeningWall,
  onUpdateOpening,
  onDuplicateOpening,
  onDeleteOpening,
  onCenterOpening,
}: TracePanelProps) {
  const errors = findings.filter((f) => f.severity === "error");
  const warnings = findings.filter((f) => f.severity === "warning");
  const generateLabel =
    roomStatus === "out-of-date"
      ? "Regenerate Room"
      : roomStatus === "matches" || roomStatus === "modified"
        ? "Review Room"
        : "Generate Room";
  const openingEvaluation =
    trace && selectedOpening
      ? evaluateOpeningPlacement(trace, selectedOpening)
      : { status: "valid" as const, reason: null };
  const openingWallLength =
    trace && selectedOpeningWall
      ? traceWallLengthPx(trace, selectedOpeningWall)
      : 0;

  function commitOrRestore(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.currentTarget.blur();
    } else if (event.key === "Escape") {
      event.currentTarget.value = event.currentTarget.defaultValue;
    }
  }

  if (!trace) {
    return (
      <div>
        <button
          type="button"
          onClick={onStartTrace}
          disabled={!calibrationConfirmed}
          className="inline-flex h-9 w-full items-center justify-center rounded-md bg-zinc-900 px-3 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
        >
          Start Trace
        </button>
        {!calibrationConfirmed ? (
          <p className="mt-2 text-xs text-zinc-400">
            Calibrate the plan scale first.
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        <p>
          {Object.keys(trace.points).length} points ·{" "}
          {Object.keys(trace.walls).length} walls ·{" "}
          {Object.keys(trace.openings).length} openings
        </p>
        <p>
          {Object.values(trace.openings).filter((o) => o.type === "door").length}{" "}
          doors ·{" "}
          {
            Object.values(trace.openings).filter((o) => o.type === "window")
              .length
          }{" "}
          windows ·{" "}
          {
            Object.values(trace.openings).filter((o) => o.type === "passage")
              .length
          }{" "}
          passages
        </p>
        <p>{trace.closed ? "Perimeter closed" : "Perimeter open"}</p>
        <p
          className={`font-medium ${
            roomStatus === "matches"
              ? "text-emerald-600"
              : roomStatus === "out-of-date" || roomStatus === "modified"
                ? "text-amber-600"
                : roomStatus === "trace-invalid"
                  ? "text-red-600"
                  : roomStatus === "reviewing"
                    ? "text-blue-600"
                    : "text-zinc-500"
          }`}
        >
          {roomStatusText}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onSetTraceMode("draw-wall")}
          className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium ${
            traceMode === "draw-wall"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Trace Walls
        </button>
        <button
          type="button"
          onClick={() => onSetTraceMode("select")}
          className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium ${
            traceMode === "select"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Select
        </button>
        <button
          type="button"
          onClick={() => onSetTraceMode("join-points")}
          className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium ${
            traceMode === "join-points"
              ? "bg-zinc-900 text-white"
              : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          }`}
        >
          Join Points
        </button>
        <button
          type="button"
          onClick={onFinishTrace}
          className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Finish
        </button>
        <button
          type="button"
          onClick={onBackspace}
          className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Backspace
        </button>
      </div>

      {selectedOpening ? (
        <div
          key={selectedOpening.id}
          className="rounded-lg border border-zinc-200 p-3"
        >
          <div className="mb-2 flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-zinc-800">
              Selected opening
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                openingEvaluation.status === "invalid"
                  ? "bg-red-50 text-red-600"
                  : openingEvaluation.status === "warning"
                    ? "bg-amber-50 text-amber-600"
                    : "bg-emerald-50 text-emerald-600"
              }`}
            >
              {openingEvaluation.status === "invalid"
                ? "Invalid"
                : openingEvaluation.status === "warning"
                  ? "Warning"
                  : "Valid"}
            </span>
          </div>

          {openingEvaluation.reason ? (
            <p className="mb-2 text-[11px] font-medium text-amber-600">
              {openingEvaluation.reason}
            </p>
          ) : null}

          <label className="block">
            <span className="text-[11px] text-zinc-500">Name</span>
            <input
              type="text"
              defaultValue={selectedOpening.name ?? ""}
              placeholder="Opening"
              onBlur={(event) => {
                const name = event.target.value.trim();
                onUpdateOpening({
                  ...selectedOpening,
                  name: name || undefined,
                });
              }}
              onKeyDown={commitOrRestore}
              className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
            />
          </label>

          <div className="mt-2 flex items-center justify-between text-xs">
            <span className="text-[11px] text-zinc-500">Parent wall</span>
            <span className="tabular-nums text-zinc-700">
              {selectedOpening.wallId}
            </span>
          </div>

          <label className="block">
            <span className="text-[11px] text-zinc-500">Type</span>
            <select
              value={selectedOpening.type}
              onChange={(event) => {
                const nextType = event.target.value as
                  | "door"
                  | "window"
                  | "passage";
                onUpdateOpening({
                  ...selectedOpening,
                  type: nextType,
                });
              }}
              className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
            >
              <option value="door">Door</option>
              <option value="window">Window</option>
              <option value="passage">Passage</option>
            </select>
          </label>

          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-zinc-500">Width (ft)</span>
              <input
                type="number"
                step={0.05}
                defaultValue={Number(
                  metersToFeet(selectedOpening.width / ppm).toFixed(2),
                )}
                onBlur={(event) => {
                  const feet = Number.parseFloat(event.target.value);
                  if (Number.isFinite(feet) && feet > 0) {
                    onUpdateOpening({
                      ...selectedOpening,
                      width: feetToMeters(feet) * ppm,
                    });
                  }
                }}
                onKeyDown={commitOrRestore}
                className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-zinc-500">Height (ft)</span>
              <input
                type="number"
                step={0.05}
                defaultValue={Number(
                  metersToFeet(selectedOpening.height).toFixed(2),
                )}
                onBlur={(event) => {
                  const feet = Number.parseFloat(event.target.value);
                  if (Number.isFinite(feet) && feet > 0) {
                    onUpdateOpening({
                      ...selectedOpening,
                      height: feetToMeters(feet),
                    });
                  }
                }}
                onKeyDown={commitOrRestore}
                className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-zinc-500">Sill (ft)</span>
              <input
                type="number"
                step={0.05}
                defaultValue={Number(
                  metersToFeet(selectedOpening.sillHeight).toFixed(2),
                )}
                onBlur={(event) => {
                  const feet = Number.parseFloat(event.target.value);
                  if (Number.isFinite(feet) && feet >= 0) {
                    onUpdateOpening({
                      ...selectedOpening,
                      sillHeight: feetToMeters(feet),
                    });
                  }
                }}
                onKeyDown={commitOrRestore}
                className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-zinc-500">Offset (ft)</span>
              <input
                type="number"
                step={0.05}
                defaultValue={Number(
                  metersToFeet(selectedOpening.offset / ppm).toFixed(2),
                )}
                onBlur={(event) => {
                  const feet = Number.parseFloat(event.target.value);
                  if (Number.isFinite(feet) && feet >= 0) {
                    onUpdateOpening({
                      ...selectedOpening,
                      offset: feetToMeters(feet) * ppm,
                    });
                  }
                }}
                onKeyDown={commitOrRestore}
                className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-500">
            <p>
              To start:{" "}
              <span className="tabular-nums text-zinc-700">
                {Number(
                  metersToFeet(selectedOpening.offset / ppm).toFixed(2),
                )}{" "}
                ft
              </span>
            </p>
            <p>
              To end:{" "}
              <span className="tabular-nums text-zinc-700">
                {Number(
                  metersToFeet(
                    (openingWallLength -
                      selectedOpening.offset -
                      selectedOpening.width) /
                      ppm,
                  ).toFixed(2),
                )}{" "}
                ft
              </span>
            </p>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => onCenterOpening(selectedOpening.id)}
              className="h-8 rounded-md border border-zinc-200 px-2 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Center
            </button>
            <button
              type="button"
              onClick={() => onDuplicateOpening(selectedOpening.id)}
              className="h-8 rounded-md border border-zinc-200 px-2 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Duplicate
            </button>
            <button
              type="button"
              onClick={() => onDeleteOpening(selectedOpening.id)}
              className="h-8 rounded-md border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        </div>
      ) : null}

      {selectedWall ? (
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="mb-2 text-xs font-medium text-zinc-800">
            Selected wall
          </p>
          <div className="grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-zinc-500">Length</span>
              <input
                type="number"
                step={0.05}
                defaultValue={Number(
                  metersToFeet(
                    (Math.hypot(
                      (trace.points[selectedWall.endPointId]?.x ?? 0) -
                        (trace.points[selectedWall.startPointId]?.x ?? 0),
                      (trace.points[selectedWall.endPointId]?.y ?? 0) -
                        (trace.points[selectedWall.startPointId]?.y ?? 0),
                    ) /
                      ppm),
                  ).toFixed(2),
                )}
                onBlur={(event) => {
                  const feet = Number.parseFloat(event.target.value);
                  if (Number.isFinite(feet) && feet > 0) {
                    onSetWallLength(selectedWall.id, feet * 0.3048 * ppm);
                  }
                }}
                className="h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-zinc-500">Height</span>
              <input
                type="number"
                step={0.1}
                defaultValue={Number(selectedWall.height.toFixed(2))}
                onBlur={(event) => {
                  const value = Number.parseFloat(event.target.value);
                  if (Number.isFinite(value)) {
                    onSetWallProps(selectedWall.id, { height: value });
                  }
                }}
                className="h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-zinc-500">Thickness</span>
              <input
                type="number"
                step={0.01}
                defaultValue={Number(selectedWall.thickness.toFixed(3))}
                onBlur={(event) => {
                  const value = Number.parseFloat(event.target.value);
                  if (Number.isFinite(value)) {
                    onSetWallProps(selectedWall.id, { thickness: value });
                  }
                }}
                className="h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <button type="button" onClick={() => onSplitWall(selectedWall.id)} className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50">Split</button>
            <button type="button" onClick={() => onReverseWall(selectedWall.id)} className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700 hover:bg-zinc-50">Reverse</button>
            <button type="button" onClick={() => onDeleteWall(selectedWall.id)} className="h-8 rounded-md border border-red-200 text-xs text-red-600 hover:bg-red-50">Delete</button>
          </div>
        </div>
      ) : null}

      {selectedPoint ? (
        <div className="rounded-lg border border-zinc-200 p-3">
          <p className="text-xs font-medium text-zinc-800">
            Point {selectedPoint.id}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-400">
            ({selectedPoint.x.toFixed(1)}, {selectedPoint.y.toFixed(1)})
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {selectedPointConnections} connected wall
            {selectedPointConnections === 1 ? "" : "s"}
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <label className="block">
              <span className="text-[11px] text-zinc-500">X (ft)</span>
              <input
                type="number"
                step={0.05}
                defaultValue={Number(metersToFeet(selectedPoint.x / ppm).toFixed(2))}
                onBlur={(event) => {
                  const feet = Number.parseFloat(event.target.value);
                  if (Number.isFinite(feet)) {
                    onMovePoint(selectedPoint.id, {
                      x: feetToMeters(feet) * ppm,
                      y: selectedPoint.y,
                    });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
            <label className="block">
              <span className="text-[11px] text-zinc-500">Y (ft)</span>
              <input
                type="number"
                step={0.05}
                defaultValue={Number(metersToFeet(selectedPoint.y / ppm).toFixed(2))}
                onBlur={(event) => {
                  const feet = Number.parseFloat(event.target.value);
                  if (Number.isFinite(feet)) {
                    onMovePoint(selectedPoint.id, {
                      x: selectedPoint.x,
                      y: feetToMeters(feet) * ppm,
                    });
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.currentTarget.blur();
                  }
                }}
                className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
              />
            </label>
          </div>

          {connectedWalls.length > 0 ? (
            <div className="mt-2">
              <p className="text-[11px] font-medium text-zinc-500">
                Connected walls
              </p>
              {connectedWalls.map((wall) => {
                const endpoint =
                  wall.startPointId === selectedPoint.id ? "start" : "end";
                return (
                  <div
                    key={wall.id}
                    className="mt-1 flex items-center justify-between gap-2"
                  >
                    <span className="truncate text-xs text-zinc-600">
                      {wall.id}
                    </span>
                    <button
                      type="button"
                      onClick={() => onSeparateWall(wall.id, endpoint)}
                      className="text-[11px] font-medium text-zinc-600 hover:text-zinc-900"
                    >
                      Detach
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}

          <div className="mt-2">
            <button
              type="button"
              onClick={() => onJoinNearby(selectedPoint.id)}
              className="h-8 w-full rounded-md border border-zinc-200 px-2 text-xs text-zinc-700 hover:bg-zinc-50"
            >
              Join Nearby
            </button>
          </div>

          {selectedPointConnections === 0 ? (
            <button
              type="button"
              onClick={() => onDeletePoint(selectedPoint.id)}
              className="mt-2 h-8 w-full rounded-md border border-red-200 px-2 text-xs text-red-600 hover:bg-red-50"
            >
              Delete point
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="space-y-1">
        {errors.map((finding) => (
          <p key={finding.id} className="text-xs font-medium text-red-600">
            {finding.message}
          </p>
        ))}
        {warnings.map((finding) => (
          <p key={finding.id} className="text-xs font-medium text-amber-600">
            {finding.message}
          </p>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onGenerateRoom}
          disabled={errors.length > 0}
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
        >
          {generateLabel}
        </button>
        <button
          type="button"
          onClick={onClearTrace}
          className="inline-flex h-9 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Clear Trace
        </button>
      </div>
    </div>
  );
}
