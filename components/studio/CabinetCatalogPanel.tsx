"use client";

import { useState } from "react";
import { CABINET_CATALOG } from "@/lib/studio/cabinet";
import { metersToFeet } from "@/lib/studio/transforms";

export default function CabinetCatalogPanel({
  onAdd,
}: {
  onAdd: (catalogId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const filtered = CABINET_CATALOG.filter((entry) => {
    const matchesSearch =
      !search ||
      entry.name.toLowerCase().includes(search.toLowerCase()) ||
      entry.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "all" || entry.category === category;
    return matchesSearch && matchesCategory;
  });
  return (
    <div className="space-y-3">
      <input
        type="text"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search cabinets"
        className="h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
      />
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
      >
        <option value="all">All</option>
        <option value="base">Base</option>
        <option value="drawer-base">Drawer Base</option>
        <option value="sink-base">Sink Base</option>
        <option value="wall">Wall</option>
        <option value="tall">Tall</option>
      </select>
      <div className="space-y-1.5">
        {filtered.map((entry) => (
          <div key={entry.catalogId} className="rounded-md border border-zinc-200 p-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-zinc-800">{entry.sku}</span>
              <button
                type="button"
                onClick={() => onAdd(entry.catalogId)}
                className="h-6 rounded bg-zinc-900 px-2 text-[10px] font-medium text-white hover:bg-zinc-800"
              >
                Add to Room
              </button>
            </div>
            <p className="text-[11px] text-zinc-600">{entry.name}</p>
            <p className="text-[10px] text-zinc-500">
              {metersToFeet(entry.widthM).toFixed(0)}″W ×{" "}
              {metersToFeet(entry.heightM).toFixed(0)}″H ×{" "}
              {metersToFeet(entry.depthM).toFixed(0)}″D
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
