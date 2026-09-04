"use client";

import Link from "next/link";
import { ArrowLeftIcon, PresentationIcon } from "@/components/icons";
import type { CameraView } from "@/lib/studio/types";

interface StudioToolbarProps {
  projectName: string;
  presenting: boolean;
  activeView: CameraView;
  onViewChange: (view: CameraView) => void;
  onTogglePresentation: () => void;
}

const views: { key: CameraView; label: string }[] = [
  { key: "home", label: "Home View" },
  { key: "front", label: "Front" },
  { key: "left", label: "Left" },
  { key: "right", label: "Right" },
  { key: "top", label: "Top" },
];

export default function StudioToolbar({
  projectName,
  presenting,
  activeView,
  onViewChange,
  onTogglePresentation,
}: StudioToolbarProps) {
  if (presenting) {
    return (
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-zinc-200 bg-white px-4 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-zinc-900">
            {projectName}
          </p>
          <p className="text-xs text-zinc-500">Presentation mode</p>
        </div>
        <button
          type="button"
          onClick={onTogglePresentation}
          className="inline-flex h-9 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          Exit Presentation
        </button>
      </header>
    );
  }

  return (
    <header className="shrink-0 border-b border-zinc-200 bg-white">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Projects
        </Link>
        <span className="hidden h-5 w-px bg-zinc-200 sm:block" />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
          {projectName}
        </p>
        <button
          type="button"
          onClick={onTogglePresentation}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-2 rounded-md bg-zinc-900 px-3.5 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <PresentationIcon className="h-4 w-4" />
          Present
        </button>
      </div>

      <div className="flex items-center gap-1 overflow-x-auto border-t border-zinc-100 px-3 py-2 sm:px-4">
        <span className="mr-1 shrink-0 text-[11px] font-medium uppercase tracking-wider text-zinc-400">
          View
        </span>
        {views.map((view) => {
          const active = activeView === view.key;
          return (
            <button
              key={view.key}
              type="button"
              title={view.label}
              onClick={() => onViewChange(view.key)}
              aria-pressed={active}
              className={`inline-flex h-8 shrink-0 items-center rounded-md border px-2.5 text-sm font-medium transition-colors ${
                active
                  ? "border-zinc-900 bg-zinc-900 text-white hover:bg-zinc-800"
                  : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900"
              }`}
            >
              {view.label}
            </button>
          );
        })}
        <button
          type="button"
          title="Reset camera"
          onClick={() => onViewChange("home")}
          className="inline-flex h-8 shrink-0 items-center rounded-md border border-zinc-200 bg-white px-2.5 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          Reset
        </button>
      </div>
    </header>
  );
}
