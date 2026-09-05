"use client";

import { ChevronDownIcon } from "@/components/icons";
import {
  ROTATION_SNAP_DEGREES,
  TRANSLATION_SNAP_INCHES,
  inchesToMeters,
  metersToInches,
  type SnapConfig,
} from "@/lib/studio/transforms";

interface SpacePlanningPanelProps {
  snap: SnapConfig;
  onSnapChange: (snap: SnapConfig) => void;
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-1.5">
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

export default function SpacePlanningPanel({
  snap,
  onSnapChange,
}: SpacePlanningPanelProps) {
  return (
    <div className="space-y-4">
      <Switch
        label="Snapping"
        checked={snap.enabled}
        onChange={(enabled) => onSnapChange({ ...snap, enabled })}
      />

      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="text-[11px] text-zinc-500">Move step</span>
          <div className="relative mt-1">
            <select
              value={snap.translationInches}
              onChange={(event) =>
                onSnapChange({
                  ...snap,
                  translationInches: Number(event.target.value),
                })
              }
              className="h-8 w-full appearance-none rounded-md border border-zinc-200 bg-white pl-2 pr-8 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
            >
              {TRANSLATION_SNAP_INCHES.map((inches) => (
                <option key={inches} value={inches}>
                  {inches}&quot;
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </label>

        <label className="block">
          <span className="text-[11px] text-zinc-500">Rotate step</span>
          <div className="relative mt-1">
            <select
              value={snap.rotationDegrees}
              onChange={(event) =>
                onSnapChange({
                  ...snap,
                  rotationDegrees: Number(event.target.value),
                })
              }
              className="h-8 w-full appearance-none rounded-md border border-zinc-200 bg-white pl-2 pr-8 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
            >
              {ROTATION_SNAP_DEGREES.map((degrees) => (
                <option key={degrees} value={degrees}>
                  {degrees}°
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] text-zinc-500">Snap tolerance</span>
        <div className="mt-1 flex items-center gap-2">
          <input
            type="number"
            step={0.25}
            value={Number(metersToInches(snap.geometryTolerance).toFixed(2))}
            onChange={(event) => {
              const value = Number.parseFloat(event.target.value);
              if (Number.isFinite(value) && value > 0) {
                onSnapChange({
                  ...snap,
                  geometryTolerance: inchesToMeters(value),
                });
              }
            }}
            className="h-8 w-full rounded-md border border-zinc-200 bg-white px-2 text-sm text-zinc-800 outline-none focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
          />
          <span className="w-7 shrink-0 text-right text-[11px] text-zinc-400">
            in
          </span>
        </div>
      </label>

      <div>
        <Switch
          label="Wall snapping"
          checked={snap.wallSnap}
          onChange={(wallSnap) => onSnapChange({ ...snap, wallSnap })}
        />
        <Switch
          label="Object snapping"
          checked={snap.objectSnap}
          onChange={(objectSnap) => onSnapChange({ ...snap, objectSnap })}
        />
        <Switch
          label="Opening snapping"
          checked={snap.openingSnap}
          onChange={(openingSnap) => onSnapChange({ ...snap, openingSnap })}
        />
        <Switch
          label="Centerline snapping"
          checked={snap.centerlineSnap}
          onChange={(centerlineSnap) => onSnapChange({ ...snap, centerlineSnap })}
        />
      </div>
    </div>
  );
}
