"use client";

import { ChevronDownIcon } from "@/components/icons";
import {
  MATERIAL_ZONES,
  zoneById,
  type MaterialZoneId,
} from "@/lib/studio/material-zones";

interface MaterialZonePanelProps {
  selectedCount: number;
  currentZone: MaterialZoneId | "mixed" | null;
  hasModel: boolean;
  onAssign: (zone: MaterialZoneId) => void;
  onClear: () => void;
}

export default function MaterialZonePanel({
  selectedCount,
  currentZone,
  hasModel,
  onAssign,
  onClear,
}: MaterialZonePanelProps) {
  const hasSelection = selectedCount > 0;
  const zoneLabel =
    currentZone === "mixed"
      ? "Mixed zones"
      : currentZone
        ? zoneById[currentZone].label
        : "Unassigned";

  return (
    <div>
      <p className="text-sm text-zinc-700">
        {hasSelection
          ? `${selectedCount} ${selectedCount === 1 ? "mesh" : "meshes"} selected`
          : "No mesh selected"}
      </p>
      {hasSelection ? (
        <p className="mt-1 text-xs text-zinc-500">Current zone: {zoneLabel}</p>
      ) : null}

      {hasModel ? (
        <div className="mt-3 space-y-2">
          <div className="relative">
            <select
              value={currentZone && currentZone !== "mixed" ? currentZone : ""}
              onChange={(event) => onAssign(event.target.value as MaterialZoneId)}
              disabled={!hasSelection}
              className="h-9 w-full appearance-none rounded-md border border-zinc-200 bg-white pl-3 pr-9 text-sm text-zinc-800 outline-none transition-colors focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
            >
              <option value="" disabled>
                Assign to zone…
              </option>
              {MATERIAL_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id}>
                  {zone.label}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          </div>

          <button
            type="button"
            onClick={onClear}
            disabled={!hasSelection || currentZone === null || currentZone === "mixed"}
            className="inline-flex h-8 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400"
          >
            Clear Assignment
          </button>
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-zinc-400">
          Zone assignment is available for imported models.
        </p>
      )}
    </div>
  );
}
