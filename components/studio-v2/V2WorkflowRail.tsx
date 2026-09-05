"use client";

export type V2Stage = "upload" | "review" | "finishes" | "viewer";

const steps: { key: V2Stage; label: string }[] = [
  { key: "upload", label: "2020 Design" },
  { key: "review", label: "3D Kitchen" },
  { key: "finishes", label: "Design Studio" },
  { key: "viewer", label: "Present" },
];

export default function V2WorkflowRail({
  stage,
  fileName,
  collapsed,
  onCollapse,
  onStage,
}: {
  stage: V2Stage;
  fileName: string | null;
  collapsed: boolean;
  onCollapse: () => void;
  onStage: (stage: V2Stage) => void;
}) {
  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-zinc-200 bg-[#fbfaf8] ${
        collapsed ? "w-16" : "w-[220px]"
      }`}
    >
      <div className="p-4">
        <div className="flex h-28 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-xs text-zinc-400">
          {collapsed ? "•••" : "Model Preview"}
        </div>
      </div>
      <nav className="flex-1 px-3">
        {steps.map((step, index) => {
          const active = stage === step.key;
          const done =
            (step.key === "upload" && Boolean(fileName)) ||
            (step.key === "review" && stage !== "upload") ||
            (step.key === "finishes" && (stage === "viewer" || stage === "finishes")) ||
            (step.key === "viewer" && stage === "viewer");
          return (
            <button
              key={step.key}
              type="button"
              onClick={() => onStage(step.key)}
              disabled={step.key === "review" && !fileName}
              className={`mb-1 flex w-full items-center gap-2 rounded-md px-3 py-2.5 text-left ${
                active
                  ? "bg-[#f1e8d8] text-zinc-900"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-zinc-300 text-[11px]">
                {done ? "✓" : index + 1}
              </span>
              {!collapsed ? <span className="text-sm">{step.label}</span> : null}
            </button>
          );
        })}
      </nav>
      <button
        type="button"
        onClick={onCollapse}
        className="m-3 rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-white"
      >
        {collapsed ? "Expand" : "Collapse"}
      </button>
    </aside>
  );
}
