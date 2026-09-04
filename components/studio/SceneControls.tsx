"use client";

import type { CameraView } from "@/lib/studio/types";

interface SceneControlsProps {
  presenting: boolean;
  activeView: CameraView;
}

const viewLabels: Record<CameraView, string> = {
  home: "Home",
  front: "Front",
  left: "Left",
  right: "Right",
  top: "Top",
};

export default function SceneControls({
  presenting,
  activeView,
}: SceneControlsProps) {
  return (
    <>
      {!presenting ? (
        <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-zinc-900/75 px-2.5 py-1.5 text-[11px] font-medium text-zinc-100 backdrop-blur-sm">
          Drag to orbit · Scroll to zoom · Right-drag to pan
        </div>
      ) : null}

      <div className="pointer-events-none absolute bottom-3 right-3 rounded-md bg-white/90 px-2.5 py-1.5 text-[11px] font-medium text-zinc-600 shadow-sm ring-1 ring-zinc-200 backdrop-blur-sm">
        {viewLabels[activeView]}
      </div>
    </>
  );
}
