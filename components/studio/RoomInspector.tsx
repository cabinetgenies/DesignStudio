"use client";

import {
  feetToMeters,
  inchesToMeters,
  metersToFeet,
  metersToInches,
  formatFeetInches,
} from "@/lib/studio/transforms";
import {
  wallLength,
  type OpeningType,
  type RoomLayout,
  type RoomWall,
  type WallOpening,
} from "@/lib/studio/room";

interface RoomInspectorProps {
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
}

function Field({
  label,
  value,
  unit,
  step,
  onChange,
}: {
  label: string;
  value: number;
  unit: string;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-zinc-500">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input
          type="number"
          step={step}
          value={Number(value.toFixed(2))}
          onChange={(event) => {
            const parsed = Number.parseFloat(event.target.value);
            if (Number.isFinite(parsed)) {
              onChange(parsed);
            }
          }}
          className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
        />
        <span className="w-7 shrink-0 text-right text-[11px] text-zinc-400">
          {unit}
        </span>
      </div>
    </label>
  );
}

export default function RoomInspector(props: RoomInspectorProps) {
  const {
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
  } = props;

  const selectedWall =
    room.walls.find((wall) => wall.id === selectedWallId) ?? null;
  const selectedOpening =
    selectedWall?.openings.find((opening) => opening.id === selectedOpeningId) ??
    null;

  function updateWall(patch: Partial<RoomWall>) {
    if (selectedWall) {
      onUpdateWall({ ...selectedWall, ...patch });
    }
  }

  function updateOpening(patch: Partial<WallOpening>) {
    if (selectedWall && selectedOpening) {
      onUpdateOpening(selectedWall.id, { ...selectedOpening, ...patch });
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        {room.walls.map((wall) => {
          const active = wall.id === selectedWallId;
          return (
            <button
              key={wall.id}
              type="button"
              onClick={() => onSelectWall(wall.id)}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "text-zinc-700 hover:bg-zinc-100"
              }`}
            >
              <span className="truncate">{wall.id}</span>
              <span className="text-xs opacity-70">
                {formatFeetInches(wallLength(wall))}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onAddWall}
          className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Add Wall
        </button>
        <button
          type="button"
          onClick={onResetRoom}
          className="inline-flex h-8 flex-1 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Reset Room
        </button>
      </div>

      {selectedWall ? (
        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium text-zinc-800">
              {selectedWall.id}
            </p>
            <button
              type="button"
              onClick={() => onRemoveWall(selectedWall.id)}
              className="text-xs font-medium text-red-600 hover:text-red-700"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Start X"
              value={metersToFeet(selectedWall.start.x)}
              unit="ft"
              step={0.1}
              onChange={(v) =>
                updateWall({ start: { ...selectedWall.start, x: feetToMeters(v) } })
              }
            />
            <Field
              label="Start Z"
              value={metersToFeet(selectedWall.start.z)}
              unit="ft"
              step={0.1}
              onChange={(v) =>
                updateWall({ start: { ...selectedWall.start, z: feetToMeters(v) } })
              }
            />
            <Field
              label="End X"
              value={metersToFeet(selectedWall.end.x)}
              unit="ft"
              step={0.1}
              onChange={(v) =>
                updateWall({ end: { ...selectedWall.end, x: feetToMeters(v) } })
              }
            />
            <Field
              label="End Z"
              value={metersToFeet(selectedWall.end.z)}
              unit="ft"
              step={0.1}
              onChange={(v) =>
                updateWall({ end: { ...selectedWall.end, z: feetToMeters(v) } })
              }
            />
            <Field
              label="Height"
              value={metersToFeet(selectedWall.height)}
              unit="ft"
              step={0.1}
              onChange={(v) => updateWall({ height: feetToMeters(v) })}
            />
            <Field
              label="Thickness"
              value={metersToInches(selectedWall.thickness)}
              unit="in"
              step={0.25}
              onChange={(v) => updateWall({ thickness: inchesToMeters(v) })}
            />
          </div>

          <div className="mt-3">
            <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
              Openings
            </p>
            <div className="space-y-1">
              {selectedWall.openings.map((opening) => (
                <button
                  key={opening.id}
                  type="button"
                  onClick={() => onSelectOpening(opening.id)}
                  className={`flex w-full items-center justify-between rounded-md px-2 py-1 text-left text-xs transition-colors ${
                    opening.id === selectedOpeningId
                      ? "bg-zinc-100 text-zinc-900"
                      : "text-zinc-600 hover:bg-zinc-50"
                  }`}
                >
                  <span className="capitalize">{opening.type}</span>
                  <span className="flex items-center gap-1.5">
                    {opening.invalid ? (
                      <span className="rounded bg-red-100 px-1 py-0.5 text-[10px] font-medium text-red-600">
                        Invalid
                      </span>
                    ) : null}
                    {metersToInches(opening.width).toFixed(0)}&quot;
                  </span>
                </button>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              {(["door", "window", "passage"] as OpeningType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => onAddOpening(selectedWall.id, type)}
                  className="inline-flex h-7 flex-1 items-center justify-center rounded-md border border-zinc-200 bg-white px-1 text-[11px] font-medium capitalize text-zinc-600 hover:bg-zinc-50"
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {selectedWall && selectedOpening ? (
        <div className="rounded-lg border border-zinc-200 p-3">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-medium capitalize text-zinc-800">
              {selectedOpening.type}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  onDuplicateOpening(selectedWall.id, selectedOpening.id)
                }
                className="text-xs font-medium text-zinc-600 hover:text-zinc-900"
              >
                Duplicate
              </button>
              <button
                type="button"
                onClick={() =>
                  onRemoveOpening(selectedWall.id, selectedOpening.id)
                }
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Field
              label="Offset"
              value={metersToFeet(selectedOpening.offset)}
              unit="ft"
              step={0.1}
              onChange={(v) => updateOpening({ offset: feetToMeters(v) })}
            />
            <Field
              label="Width"
              value={metersToInches(selectedOpening.width)}
              unit="in"
              step={1}
              onChange={(v) => updateOpening({ width: inchesToMeters(v) })}
            />
            <Field
              label="Height"
              value={metersToInches(selectedOpening.height)}
              unit="in"
              step={1}
              onChange={(v) => updateOpening({ height: inchesToMeters(v) })}
            />
            {selectedOpening.type === "window" ? (
              <Field
                label="Sill"
                value={metersToInches(selectedOpening.sillHeight)}
                unit="in"
                step={1}
                onChange={(v) => updateOpening({ sillHeight: inchesToMeters(v) })}
              />
            ) : null}
          </div>

          <div className="mt-3 text-xs text-zinc-500">
            <p>
              To start: {formatFeetInches(selectedOpening.offset)}
            </p>
            <p>
              To end:{" "}
              {formatFeetInches(
                wallLength(selectedWall) -
                  selectedOpening.offset -
                  selectedOpening.width,
              )}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
