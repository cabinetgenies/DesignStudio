"use client";

export type SimpleCameraView =
  | "reset"
  | "front"
  | "left"
  | "right"
  | "top"
  | "inside";

const views: { key: SimpleCameraView; label: string }[] = [
  { key: "reset", label: "Reset View" },
  { key: "front", label: "Front" },
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
  { key: "top", label: "Top" },
  { key: "inside", label: "Inside View" },
];

export default function SimpleCameraControls({
  onCamera,
}: {
  onCamera: (view: SimpleCameraView) => void;
}) {
  return (
    <div className="absolute bottom-4 left-4 flex flex-wrap gap-1 rounded-lg border border-zinc-200 bg-white/90 p-1 shadow-sm backdrop-blur">
      {views.map((view) => (
        <button
          key={view.key}
          type="button"
          onClick={() => onCamera(view.key)}
          className="rounded-md px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
        >
          {view.label}
        </button>
      ))}
    </div>
  );
}
