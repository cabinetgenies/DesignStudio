"use client";

import {
  MATERIAL_ZONES,
  zoneById,
  type MaterialZoneId,
  type ZoneMaterialSelections,
} from "@/lib/studio/material-zones";
import { getMaterial, materialsByZone } from "@/lib/studio/materials";

interface SimpleMaterialPanelProps {
  selections: ZoneMaterialSelections;
  onSelect: (zone: MaterialZoneId, materialId: string | null) => void;
}

const clientZones: MaterialZoneId[] = MATERIAL_ZONES.filter(
  (zone) => zone.id !== "other",
).map((zone) => zone.id);

export default function SimpleMaterialPanel({
  selections,
  onSelect,
}: SimpleMaterialPanelProps) {
  return (
    <aside className="h-full w-full overflow-y-auto border-t border-zinc-200 bg-[#faf7f2] lg:w-[320px] lg:shrink-0 lg:border-l lg:border-t-0">
      <div className="p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
            Finishes
          </h2>
        </div>

        <div className="mt-5 space-y-6">
          {clientZones.map((zone) => {
            const materials = materialsByZone[zone];
            const selectedId = selections[zone] ?? null;
            const selectedMaterial = getMaterial(zone, selectedId);

            if (materials.length === 0) {
              return (
                <div key={zone}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-sm font-medium text-zinc-800">
                      {zoneById[zone].label}
                    </p>
                    <span className="text-xs text-zinc-400">Coming soon</span>
                  </div>
                  <div className="mt-2 h-8 rounded-md border border-dashed border-zinc-300 bg-white/40 text-xs leading-8 text-zinc-400">
                    Not assigned
                  </div>
                </div>
              );
            }

            return (
              <div key={zone}>
                <div className="flex items-baseline justify-between gap-3">
                  <p className="text-sm font-medium text-zinc-800">
                    {zoneById[zone].label}
                  </p>
                  <span className="max-w-[140px] truncate text-right text-xs text-zinc-500">
                    {selectedMaterial?.label ?? "Original"}
                  </span>
                </div>
                <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                  <button
                    type="button"
                    onClick={() => onSelect(zone, null)}
                    aria-pressed={selectedId === null}
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[8px] font-medium transition-colors ${
                      selectedId === null
                        ? "border-zinc-900 bg-zinc-100 text-zinc-800"
                        : "border-zinc-200 bg-white text-zinc-400 hover:border-zinc-300"
                    }`}
                    title="Original"
                  >
                    Orig
                  </button>
                  {materials.map((material) => (
                    <button
                      key={material.id}
                      type="button"
                      title={material.label}
                      onClick={() => onSelect(zone, material.id)}
                      aria-pressed={selectedId === material.id}
                      className={`h-9 w-9 shrink-0 rounded-full border transition-colors ${
                        selectedId === material.id
                          ? "border-zinc-900 ring-2 ring-zinc-300"
                          : "border-black/10 hover:border-zinc-400"
                      }`}
                      style={{ backgroundColor: material.color }}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
