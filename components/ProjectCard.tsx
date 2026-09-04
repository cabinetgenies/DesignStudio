import Link from "next/link";
import type { Project, ProjectStatus } from "@/lib/types";
import { CubeIcon, MoreVerticalIcon } from "./icons";

const statusStyles: Record<
  ProjectStatus,
  { dot: string; badge: string }
> = {
  "In Progress": { dot: "bg-emerald-500", badge: "bg-emerald-50 text-emerald-700" },
  "In Review": { dot: "bg-amber-500", badge: "bg-amber-50 text-amber-700" },
  Draft: { dot: "bg-zinc-400", badge: "bg-zinc-100 text-zinc-600" },
  Presented: { dot: "bg-sky-500", badge: "bg-sky-50 text-sky-700" },
};

function StatusBadge({ status }: { status: ProjectStatus }) {
  const styles = statusStyles[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${styles.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${styles.dot}`} />
      {status}
    </span>
  );
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <article className="group overflow-hidden rounded-xl border border-zinc-200 bg-white transition-shadow hover:shadow-sm">
      <div className="relative aspect-[16/10] bg-zinc-100">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-zinc-400">
          <CubeIcon className="h-8 w-8" />
          <span className="text-xs font-medium uppercase tracking-wider">
            Preview
          </span>
        </div>
        <div className="absolute right-3 top-3">
          <button
            type="button"
            aria-label="Project actions"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-white/95 text-zinc-500 shadow-sm ring-1 ring-zinc-200 transition-colors hover:bg-white hover:text-zinc-900"
          >
            <MoreVerticalIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-semibold text-zinc-900">
              {project.name}
            </h3>
            <p className="mt-0.5 truncate text-xs text-zinc-500">
              {project.client}
            </p>
          </div>
          <StatusBadge status={project.status} />
        </div>

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-zinc-400">Updated {project.updatedAt}</p>
        </div>

        <Link
          href={`/projects/${project.id}/studio`}
          className="mt-3 flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white text-sm font-medium text-zinc-900 transition-colors hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-300"
        >
          Open Studio
        </Link>
      </div>
    </article>
  );
}
