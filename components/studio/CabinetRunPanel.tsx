"use client";

import type { CabinetRun } from "@/lib/studio/cabinet-run";
import { getCatalogEntry } from "@/lib/studio/cabinet";

export default function CabinetRunPanel({
  proposal,
  wallLength,
  catalogIds,
  onOpen,
  onFlip,
  onCommit,
  onCancel,
  onAdd,
  onRemove,
  onMove,
  onName,
  onOffset,
  onFinish,
}: {
  proposal: {
    run: CabinetRun;
    wallId: string;
    side: 1 | -1;
    name: string;
    startOffset: number;
    finishZone: "perimeter" | "island";
  } | null;
  wallLength: number;
  catalogIds: string[];
  onOpen: () => void;
  onFlip: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onAdd: (catalogId: string) => void;
  onRemove: (index: number) => void;
  onMove: (index: number, direction: -1 | 1) => void;
  onName: (name: string) => void;
  onOffset: (offset: number) => void;
  onFinish: (zone: "perimeter" | "island") => void;
}) {
  if (!proposal) {
    return (
      <div>
        <button
          type="button"
          onClick={onOpen}
          className="h-8 w-full rounded-md bg-zinc-900 text-xs font-medium text-white hover:bg-zinc-800"
        >
          Create Cabinet Run
        </button>
        <p className="mt-1 text-[11px] text-zinc-500">
          Select a wall first. Creates a starter B24 × 3 base run.
        </p>
      </div>
    );
  }
  const remaining = Math.max(
    0,
    wallLength - proposal.run.occupiedLength - proposal.run.startOffset,
  );
  const eligible = ["B12","B18","B24","B30","B36","DB18","DB24","DB30","DB36","SB30","SB33","SB36"];
  return (
    <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
      <p className="text-xs font-medium text-blue-900">{proposal.run.name}</p>
      <p className="text-[11px] text-blue-700">
        Wall {proposal.wallId} · Side {proposal.side === 1 ? "A" : "B"}
      </p>
      <p className="text-[11px] text-blue-700">
        B24 × 3 · occupied {proposal.run.occupiedLength.toFixed(2)} m · wall{" "}
        {wallLength.toFixed(2)} m · remaining {remaining.toFixed(2)} m
      </p>
      <input
        type="text"
        value={proposal.name}
        onChange={(e) => onName(e.target.value)}
        className="mt-1 h-7 w-full rounded-md border border-blue-200 px-2 text-xs"
      />
      <div className="mt-1 flex gap-2">
        <label className="flex-1 text-[11px] text-blue-700">
          Start offset (m)
          <input
            type="number"
            step={0.05}
            value={proposal.startOffset}
            onChange={(e) => onOffset(Number(e.target.value))}
            className="mt-0.5 h-7 w-full rounded-md border border-blue-200 px-2 text-xs"
          />
        </label>
        <label className="flex-1 text-[11px] text-blue-700">
          Finish
          <select
            value={proposal.finishZone}
            onChange={(e) => onFinish(e.target.value as "perimeter" | "island")}
            className="mt-0.5 h-7 w-full rounded-md border border-blue-200 px-2 text-xs"
          >
            <option value="perimeter">Perimeter</option>
            <option value="island">Island</option>
          </select>
        </label>
      </div>
      <select
        onChange={(e) => { if (e.target.value) onAdd(e.target.value); e.target.value = ""; }}
        className="mt-2 h-7 w-full rounded-md border border-blue-200 px-2 text-xs"
      >
        <option value="">Add cabinet…</option>
        {eligible.map((id) => {
          const entry = getCatalogEntry(id);
          return entry ? <option key={id} value={id}>{entry.sku} · {entry.name}</option> : null;
        })}
      </select>
      <div className="mt-2 space-y-1">
        {catalogIds.map((id, index) => {
          const entry = getCatalogEntry(id);
          return (
            <div key={index} className="flex items-center gap-1 rounded border border-blue-100 bg-white p-1 text-[11px]">
              <span className="w-4 text-zinc-400">{index + 1}</span>
              <span className="flex-1">{entry?.sku ?? id}</span>
              <button type="button" disabled={index === 0} onClick={() => onMove(index, -1)} className="h-5 rounded border px-1 text-[10px] disabled:opacity-30">←</button>
              <button type="button" disabled={index === catalogIds.length - 1} onClick={() => onMove(index, 1)} className="h-5 rounded border px-1 text-[10px] disabled:opacity-30">→</button>
              <button type="button" onClick={() => onRemove(index)} className="h-5 rounded border border-red-200 px-1 text-[10px] text-red-600">×</button>
            </div>
          );
        })}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        <button type="button" onClick={onFlip} className="h-7 rounded-md border border-blue-200 text-[11px] text-blue-700 hover:bg-blue-100">Flip Side</button>
        <button type="button" onClick={onCommit} className="h-7 rounded-md bg-blue-600 text-[11px] font-medium text-white hover:bg-blue-500">Create Run</button>
        <button type="button" onClick={onCancel} className="h-7 rounded-md border border-blue-200 text-[11px] text-blue-700 hover:bg-blue-100">Cancel</button>
      </div>
    </div>
  );
}
