"use client";

export default function V2ViewportControls() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-zinc-200 bg-white/90 px-4 py-2 shadow-sm backdrop-blur">
        <button type="button" className="rounded-full bg-zinc-900 px-3 py-1 text-xs text-white">
          Orbit
        </button>
        <button type="button" className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-400">
          Walk
        </button>
        <button type="button" className="rounded-full border border-zinc-200 px-3 py-1 text-xs text-zinc-400">
          Compare
        </button>
        <span className="h-4 w-px bg-zinc-200" />
        <span className="text-[11px] text-zinc-400">Morning</span>
        <input type="range" disabled className="w-24" />
        <span className="text-[11px] text-zinc-400">Evening</span>
      </div>
    </div>
  );
}
