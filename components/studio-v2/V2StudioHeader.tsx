"use client";

export default function V2StudioHeader({
  projectName,
  status,
  presenting,
  onPresent,
  onExitPresent,
}: {
  projectName: string;
  status: string;
  presenting: boolean;
  onPresent: () => void;
  onExitPresent: () => void;
}) {
  return (
    <header className="flex h-20 shrink-0 items-center justify-between border-b border-zinc-200 bg-[#fbfaf8] px-6">
      <div className="flex items-center gap-3">
        <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#B98A3A]">
          Studio
        </span>
        <span className="h-5 w-px bg-zinc-200" />
        <span className="text-sm font-semibold text-zinc-900">{projectName}</span>
        <span className="text-zinc-400">▾</span>
      </div>
      <div className="flex items-center gap-3">
        <span
          className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
            status === "Kitchen ready"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              status === "Kitchen ready" ? "bg-emerald-500" : "bg-amber-500"
            }`}
          />
          {status === "Kitchen ready"
            ? "Ready to Present"
            : "Kitchen Needs Review"}
        </span>
        {presenting ? (
          <button
            type="button"
            onClick={onExitPresent}
            className="rounded-md border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-white"
          >
            Exit Presentation
          </button>
        ) : (
          <button
            type="button"
            onClick={onPresent}
            className="rounded-md bg-[#B98A3A] px-4 py-2 text-sm font-medium text-white hover:bg-[#a97c31]"
          >
            Share with Client
          </button>
        )}
        <button type="button" className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-white">
          History
        </button>
        <button type="button" className="rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-white">
          Menu
        </button>
      </div>
    </header>
  );
}
