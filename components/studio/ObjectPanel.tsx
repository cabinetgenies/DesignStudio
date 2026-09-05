"use client";

import { useState } from "react";
import {
  feetToMeters,
  formatFeetInches,
  metersToFeet,
  type TransformState,
} from "@/lib/studio/transforms";
import type { EditableObjectInfo } from "@/lib/studio/editable-objects";

interface ObjectPanelProps {
  object: EditableObjectInfo | null;
  transform: TransformState | null;
  count: number;
  onPositionChange: (axis: "x" | "y" | "z", meters: number) => void;
  onRotationAxisChange: (axis: "x" | "y" | "z", degrees: number) => void;
  onLockToggle: (locked: boolean) => void;
  onReset: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  canRename: boolean;
}

function NumberInput({
  value,
  step,
  disabled,
  onCommit,
}: {
  value: number;
  step: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState<string>(String(value));

  return (
    <input
      type="number"
      step={step}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={() => {
        const parsed = Number.parseFloat(draft);
        if (Number.isFinite(parsed)) {
          onCommit(parsed);
        } else {
          setDraft(String(value));
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          (event.target as HTMLInputElement).blur();
        }
      }}
      className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none transition-colors focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200 disabled:bg-zinc-50 disabled:text-zinc-400"
    />
  );
}

export default function ObjectPanel({
  object,
  transform,
  count,
  onPositionChange,
  onRotationAxisChange,
  onLockToggle,
  onReset,
  onDuplicate,
  onDelete,
  onRename,
  canRename,
}: ObjectPanelProps) {
  if (count === 0) {
    return (
      <p className="text-sm text-zinc-500">
        Select an object to edit its transform.
      </p>
    );
  }

  if (count > 1 || !object || !transform) {
    return (
      <p className="text-sm text-zinc-500">
        {count} objects selected. Select a single object to edit its transform.
      </p>
    );
  }

  const [width, height, depth] = object.size;
  const locked = transform.locked;
  const positionFeet = transform.position.map(metersToFeet) as [
    number,
    number,
    number,
  ];
  const rotationDeg = transform.rotation.map(
    (rad) => (rad * 180) / Math.PI,
  ) as [number, number, number];

  return (
    <div>
      <div className="mb-3">
        <input
          type="text"
          defaultValue={object.name}
          disabled={!canRename}
          title={canRename ? "Rename object" : "Rename is available for duplicates"}
          onBlur={(event) => {
            if (event.target.value !== object.name) {
              onRename(event.target.value);
            }
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              (event.target as HTMLInputElement).blur();
            }
          }}
          className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm font-medium text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
        />
        <p className="mt-0.5 text-xs text-zinc-500">
          {formatFeetInches(width)} × {formatFeetInches(height)} ×{" "}
          {formatFeetInches(depth)}
        </p>
      </div>

      <div className="space-y-2.5">
        {(["x", "y", "z"] as const).map((axis, index) => (
          <label key={axis} className="block">
            <span className="text-[11px] uppercase text-zinc-500">{axis}</span>
            <div className="mt-1 flex items-center gap-2">
              <NumberInput
                value={positionFeet[index]}
                step={0.01}
                disabled={locked}
                onCommit={(feet) =>
                  onPositionChange(axis, feetToMeters(feet))
                }
              />
              <span className="w-14 shrink-0 text-right text-[11px] text-zinc-400">
                {formatFeetInches(transform.position[index])}
              </span>
            </div>
          </label>
        ))}
      </div>

      <div className="mt-3">
        <p className="mb-1.5 text-[11px] font-medium text-zinc-500">
          Rotation
        </p>
        <div className="grid grid-cols-3 gap-2">
          {(["x", "y", "z"] as const).map((axis, index) => (
            <label key={axis} className="block">
              <span className="text-[11px] uppercase text-zinc-500">{axis}</span>
              <div className="mt-1 flex items-center gap-1">
                <NumberInput
                  value={rotationDeg[index]}
                  step={1}
                  disabled={locked}
                  onCommit={(degrees) => onRotationAxisChange(axis, degrees)}
                />
                <span className="text-[11px] text-zinc-400">°</span>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onLockToggle(!locked)}
          className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          {locked ? "Unlock" : "Lock"}
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Reset
        </button>
        <button
          type="button"
          onClick={onDuplicate}
          className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
