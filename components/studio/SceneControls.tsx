"use client";

import type { ViewMode } from "@/lib/studio/transforms";

interface SceneControlsProps {
  presenting: boolean;
  viewMode: ViewMode;
  snapFlash: string | null;
  wallEditStatus: string | null;
  snapStatus: string;
}

const viewLabels: Record<ViewMode, string> = {
  perspective: "Perspective",
  plan: "Plan",
  front: "Front",
  left: "Left",
  right: "Right",
};

export default function SceneControls({
  presenting,
  viewMode,
  snapFlash,
  wallEditStatus,
  snapStatus,
}: SceneControlsProps) {
  return (
    <>
      {!presenting ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-zinc-900/75 px-2.5 py-1.5 text-[11px] font-medium text-zinc-100 backdrop-blur-sm">
          Drag to orbit · Scroll to zoom · Right-drag to pan · W move · E rotate
        </div>
      ) : null}

      {snapFlash ? (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-emerald-600/90 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {snapFlash}
        </div>
      ) : null}

      {wallEditStatus ? (
        <div className="pointer-events-none absolute left-1/2 top-3 -translate-x-1/2 rounded-md bg-zinc-900/85 px-2.5 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm">
          {wallEditStatus}
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-3 top-3 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 backdrop-blur-sm">
        {snapStatus}
      </div>

      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 backdrop-blur-sm">
        {viewLabels[viewMode]}
      </div>
    </>
  );
}
