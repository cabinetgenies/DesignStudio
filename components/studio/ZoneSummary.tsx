"use client";

import {
  MATERIAL_ZONES,
  type MaterialZoneId,
} from "@/lib/studio/material-zones";

interface ZoneSummaryProps {
  counts: Record<MaterialZoneId, number>;
  unassigned: number;
  showZones: boolean;
  onToggleShowZones: (value: boolean) => void;
  onSelectZone: (zone: MaterialZoneId) => void;
}

export default function ZoneSummary({
  counts,
  unassigned,
  showZones,
  onToggleShowZones,
  onSelectZone,
}: ZoneSummaryProps) {
  return (
    <div>
      <label className="mb-3 flex cursor-pointer items-center justify-between">
        <span className="text-sm text-zinc-700">Show Material Zones</span>
        <span className="relative inline-flex shrink-0">
          <input
            type="checkbox"
            checked={showZones}
            onChange={(event) => onToggleShowZones(event.target.checked)}
            className="peer sr-only"
          />
          <span className="h-6 w-11 rounded-full bg-zinc-200 transition-colors peer-checked:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 peer-focus-visible:ring-offset-2" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </span>
      </label>

      <ul className="space-y-0.5">
        {MATERIAL_ZONES.map((zone) => (
          <li key={zone.id}>
            <button
              type="button"
              onClick={() => onSelectZone(zone.id)}
              className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-50"
            >
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: zone.color }}
              />
              <span className="min-w-0 flex-1 truncate text-sm text-zinc-700">
                {zone.label}
              </span>
              <span className="shrink-0 text-xs tabular-nums text-zinc-500">
                {counts[zone.id]}
              </span>
            </button>
          </li>
        ))}
        <li className="mt-1 border-t border-zinc-100 pt-1">
          <div className="flex w-full items-center gap-2.5 px-2 py-1.5">
            <span className="h-3 w-3 shrink-0 rounded-full border border-zinc-300 bg-white" />
            <span className="min-w-0 flex-1 truncate text-sm text-zinc-500">
              Unassigned
            </span>
            <span className="shrink-0 text-xs tabular-nums text-zinc-500">
              {unassigned}
            </span>
          </div>
        </li>
      </ul>
    </div>
  );
}
