"use client";

import { useState } from "react";
import {
  MATERIAL_ZONES,
  zoneById,
  type MaterialZoneId,
  type ZoneMaterialSelections,
} from "@/lib/studio/material-zones";
import { materialsByZone, type StudioMaterial } from "@/lib/studio/materials";

interface MaterialPaletteProps {
  selections: ZoneMaterialSelections;
  onSelect: (zone: MaterialZoneId, materialId: string | null) => void;
}

const editableZones = MATERIAL_ZONES.filter(
  (zone) => materialsByZone[zone.id].length > 0,
);

function Swatch({
  material,
  selected,
  onClick,
}: {
  material: StudioMaterial;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-colors ${
        selected
          ? "border-zinc-900 bg-zinc-50"
          : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
      }`}
    >
      <span
        className="h-7 w-7 rounded-md border border-black/10"
        style={{ backgroundColor: material.color }}
      />
      <span className="w-full truncate text-[11px] leading-4 text-zinc-700">
        {material.label}
      </span>
    </button>
  );
}

export default function MaterialPalette({
  selections,
  onSelect,
}: MaterialPaletteProps) {
  const [activeZone, setActiveZone] = useState<MaterialZoneId>("perimeter");
  const materials = materialsByZone[activeZone];
  const selectedId = selections[activeZone];

  return (
    <div>
      <div className="mb-3 flex gap-1 overflow-x-auto pb-1">
        {editableZones.map((zone) => {
          const active = activeZone === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => setActiveZone(zone.id)}
              className={`inline-flex h-7 shrink-0 items-center rounded-md px-2.5 text-xs font-medium transition-colors ${
                active
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200"
              }`}
            >
              {zoneById[zone.id].label}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => onSelect(activeZone, null)}
          aria-pressed={selectedId === null}
          className={`flex flex-col items-center gap-1.5 rounded-lg border p-2 text-center transition-colors ${
            selectedId === null
              ? "border-zinc-900 bg-zinc-50"
              : "border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50"
          }`}
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md border border-dashed border-zinc-300 bg-white text-[9px] font-medium text-zinc-400">
            Orig
          </span>
          <span className="w-full truncate text-[11px] leading-4 text-zinc-700">
            Original
          </span>
        </button>

        {materials.map((material) => (
          <Swatch
            key={material.id}
            material={material}
            selected={selectedId === material.id}
            onClick={() => onSelect(activeZone, material.id)}
          />
        ))}
      </div>
    </div>
  );
}
