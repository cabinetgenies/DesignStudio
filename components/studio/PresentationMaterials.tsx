"use client";

import {
  zoneById,
  type MaterialZoneId,
  type ZoneMaterialSelections,
} from "@/lib/studio/material-zones";
import { materialsByZone } from "@/lib/studio/materials";

interface PresentationMaterialsProps {
  selections: ZoneMaterialSelections;
  onSelect: (zone: MaterialZoneId, materialId: string | null) => void;
}

const clientZones: MaterialZoneId[] = [
  "perimeter",
  "island",
  "countertops",
  "backsplash",
  "floor",
  "walls",
  "hardware",
];

export default function PresentationMaterials({
  selections,
  onSelect,
}: PresentationMaterialsProps) {
  return (
    <aside className="w-full shrink-0 border-t border-zinc-200 bg-white lg:w-[280px] lg:border-l lg:border-t-0 lg:overflow-y-auto">
      <div className="p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Finishes
        </h2>

        <div className="mt-3 space-y-5">
          {clientZones.map((zone) => {
            const materials = materialsByZone[zone];
            if (materials.length === 0) {
              return null;
            }
            const selectedId = selections[zone];

            return (
              <div key={zone}>
                <p className="mb-2 text-sm font-medium text-zinc-800">
                  {zoneById[zone].label}
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1">
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
