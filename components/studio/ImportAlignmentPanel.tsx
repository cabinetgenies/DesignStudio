"use client";

import {
  alignmentScale,
  isImplausible,
  type ImportAlignment,
  type ModelUnit,
} from "@/lib/studio/import-alignment";
import { formatFeetInches, feetToMeters, metersToFeet } from "@/lib/studio/transforms";

interface ImportAlignmentPanelProps {
  alignment: ImportAlignment;
  rawSize: [number, number, number];
  onChange: (alignment: ImportAlignment) => void;
  onAlign: () => void;
  onReset: () => void;
}

const UNITS: { value: ModelUnit; label: string }[] = [
  { value: "mm", label: "Millimeters" },
  { value: "cm", label: "Centimeters" },
  { value: "m", label: "Meters" },
  { value: "in", label: "Inches" },
  { value: "ft", label: "Feet" },
];

export default function ImportAlignmentPanel({
  alignment,
  rawSize,
  onChange,
  onAlign,
  onReset,
}: ImportAlignmentPanelProps) {
  const scale = alignmentScale(alignment);
  const scaledSize: [number, number, number] = [
    rawSize[0] * scale,
    rawSize[1] * scale,
    rawSize[2] * scale,
  ];
  const implausible = isImplausible(scaledSize);

  return (
    <div className="space-y-4">
      <label className="block">
        <span className="text-[11px] text-zinc-500">Model units</span>
        <select
          value={alignment.unit}
          onChange={(event) =>
            onChange({ ...alignment, unit: event.target.value as ModelUnit })
          }
          className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
        >
          {UNITS.map((unit) => (
            <option key={unit.value} value={unit.value}>
              {unit.label}
            </option>
          ))}
        </select>
      </label>

      <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        <p>
          Dimensions: {formatFeetInches(scaledSize[0])} ×{" "}
          {formatFeetInches(scaledSize[1])} × {formatFeetInches(scaledSize[2])}
        </p>
        {implausible ? (
          <p className="mt-1 font-medium text-amber-600">
            The scale looks implausible. Check the units.
          </p>
        ) : null}
      </div>

      <label className="block">
        <span className="text-[11px] text-zinc-500">Scale correction</span>
        <input
          type="number"
          step={0.01}
          value={Number(alignment.scaleCorrection.toFixed(3))}
          onChange={(event) => {
            const value = Number.parseFloat(event.target.value);
            if (Number.isFinite(value) && value > 0) {
              onChange({ ...alignment, scaleCorrection: value });
            }
          }}
          className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
        />
      </label>

      <label className="block">
        <span className="text-[11px] text-zinc-500">Floor offset</span>
        <input
          type="number"
          step={0.05}
          value={Number(metersToFeet(alignment.floorOffset).toFixed(2))}
          onChange={(event) => {
            const value = Number.parseFloat(event.target.value);
            if (Number.isFinite(value)) {
              onChange({ ...alignment, floorOffset: feetToMeters(value) });
            }
          }}
          className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
        />
      </label>

      <div className="grid grid-cols-2 gap-2">
        <label className="block">
          <span className="text-[11px] text-zinc-500">Up axis</span>
          <select
            value={alignment.upAxis}
            onChange={(event) =>
              onChange({
                ...alignment,
                upAxis: event.target.value as "y" | "z",
              })
            }
            className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
          >
            <option value="y">Y up</option>
            <option value="z">Z up</option>
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] text-zinc-500">Forward</span>
          <select
            value={alignment.forward}
            onChange={(event) =>
              onChange({
                ...alignment,
                forward: event.target.value as ImportAlignment["forward"],
              })
            }
            className="mt-1 h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
          >
            <option value="front">Front (−Z)</option>
            <option value="back">Back (+Z)</option>
            <option value="left">Left (−X)</option>
            <option value="right">Right (+X)</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onAlign}
          className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-2 text-xs font-medium text-white transition-colors hover:bg-zinc-800"
        >
          Align to Room
        </button>
        <button
          type="button"
          onClick={onReset}
          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
        >
          Reset Alignment
        </button>
      </div>

      {alignment.confirmed ? (
        <p className="text-xs font-medium text-emerald-600">
          Alignment confirmed.
        </p>
      ) : (
        <p className="text-xs font-medium text-zinc-400">
          Alignment not confirmed.
        </p>
      )}
    </div>
  );
}
