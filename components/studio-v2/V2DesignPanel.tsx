"use client";

import { useState } from "react";
import { V2_MATERIALS, V2_ZONE_LABELS, type V2MaterialZone } from "@/lib/studio-v2/materials";
import type { V2MaterialSelections } from "@/lib/studio-v2/v2-viewer";
import type { V2View } from "@/lib/studio-v2/v2-viewer";

type Tab = "materials" | "lighting" | "view";

export default function V2DesignPanel({
  selections,
  onSelect,
  onRestore,
  onHighlight,
  highlightZone,
  onView,
  zoneCounts,
}: {
  selections: V2MaterialSelections;
  onSelect: (zone: V2MaterialZone, materialId: string) => void;
  onRestore: () => void;
  onHighlight: (zone: V2MaterialZone | null) => void;
  highlightZone: V2MaterialZone | null;
  onView: (view: V2View) => void;
  zoneCounts?: Partial<Record<V2MaterialZone, { meshes: number }>>;
}) {
  const [tab, setTab] = useState<Tab>("materials");
  const [openZone, setOpenZone] = useState<V2MaterialZone | null>("perimeter");

  return (
    <aside className="flex h-full w-full flex-col border-l border-zinc-200 bg-white">
      <div className="border-b border-zinc-200 px-5 py-4">
        <h2 className="text-sm font-semibold text-zinc-900">Design Studio</h2>
        <div className="mt-3 flex gap-4 text-sm">
          {(["materials", "lighting", "view"] as Tab[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setTab(item)}
              className={`pb-1 capitalize ${
                tab === item
                  ? "border-b-2 border-[#B98A3A] text-zinc-900"
                  : "text-zinc-500 hover:text-zinc-800"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {tab === "materials" ? (
          <div className="space-y-1">
            {(Object.keys(V2_ZONE_LABELS) as V2MaterialZone[])
              .filter((zone) => zone !== "unknown")
              .map((zone) => {
                const materials = V2_MATERIALS[zone];
                const selectedId = selections[zone];
                const open = openZone === zone;
                const meshCount = zoneCounts?.[zone]?.meshes;
                const notAssigned = meshCount !== undefined && meshCount === 0;
                return (
                  <div key={zone} className="border-b border-zinc-100">
                    <button
                      type="button"
                      onClick={() => setOpenZone(open ? null : zone)}
                      className="flex w-full items-center justify-between py-3 text-left"
                    >
                      <span className="text-sm text-zinc-800">
                        {V2_ZONE_LABELS[zone]}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {notAssigned
                          ? "Not assigned"
                          : materials.length === 0
                          ? "Needs assignment"
                          : selectedId
                            ? materials.find((m) => m.id === selectedId)?.label
                            : "Original"}
                      </span>
                    </button>
                    {open ? (
                      <div className="flex gap-2 pb-3">
                        {materials.length === 0 ? (
                          <span className="text-xs text-zinc-400">Coming soon</span>
                        ) : (
                          materials.map((material) => (
                            <button
                              key={material.id}
                              type="button"
                              disabled={notAssigned}
                              onClick={() => onSelect(zone, material.id)}
                              title={material.label}
                              className={`h-8 w-8 rounded-full border ${
                                selectedId === material.id
                                  ? "border-zinc-900 ring-2 ring-zinc-300"
                                  : "border-black/10 hover:border-zinc-400"
                              } ${notAssigned ? "opacity-40" : ""}`}
                              style={{ backgroundColor: material.color }}
                            />
                          ))
                        )}
                      </div>
                    ) : null}
                    <div className="flex gap-2 pb-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = highlightZone === zone ? null : zone;
                          onHighlight(next);
                        }}
                        className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                      >
                        {highlightZone === zone ? "Stop Highlighting" : "Highlight"}
                      </button>
                    </div>
                  </div>
                );
              })}
            <button
              type="button"
              onClick={onRestore}
              className="mt-4 w-full rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Restore Original
            </button>
          </div>
        ) : tab === "lighting" ? (
          <div>
            <p className="text-xs uppercase tracking-wide text-zinc-400">Lighting</p>
            <div className="mt-4 space-y-4 text-sm">
              <div className="flex gap-2">
                {["Morning", "Day", "Evening"].map((item) => (
                  <button key={item} type="button" className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs text-zinc-600">
                    {item}
                  </button>
                ))}
              </div>
              <p className="text-xs text-zinc-500">Rendering controls coming next</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {(["reset", "fit", "front", "left", "right", "top", "inside"] as V2View[]).map(
              (view) => (
                <button
                  key={view}
                  type="button"
                  onClick={() => onView(view)}
                  className="w-full rounded-md border border-zinc-200 px-3 py-2 text-left text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  {view === "inside"
                    ? "Inside View"
                    : view === "fit"
                      ? "Fit Kitchen"
                      : view.charAt(0).toUpperCase() + view.slice(1)}
                </button>
              ),
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
