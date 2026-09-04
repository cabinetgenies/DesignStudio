"use client";

import { useState, type ComponentType } from "react";
import {
  BookmarkIcon,
  FolderIcon,
  LayersIcon,
  PlusIcon,
  PresentationIcon,
  type IconProps,
} from "./icons";
import { initialActivity, initialProjects, initialStats } from "@/lib/data";
import type { Project } from "@/lib/types";
import NewProjectModal from "./NewProjectModal";
import ProjectCard from "./ProjectCard";
import StatCard from "./StatCard";

const statIcons: ComponentType<IconProps>[] = [
  FolderIcon,
  BookmarkIcon,
  LayersIcon,
  PresentationIcon,
];

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>(initialProjects);
  const [modalOpen, setModalOpen] = useState(false);

  function handleCreate(project: Project) {
    setProjects((current) => [project, ...current]);
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 sm:text-3xl">
            Design Studio
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            Create, visualize, and present client spaces.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
        >
          <PlusIcon className="h-4 w-4" />
          New Project
        </button>
      </header>

      <section
        aria-label="Quick stats"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {initialStats.map((stat, index) => {
          const Icon = statIcons[index] ?? PresentationIcon;
          return (
            <StatCard
              key={stat.label}
              label={stat.label}
              value={stat.value}
              icon={<Icon className="h-4 w-4" />}
            />
          );
        })}
      </section>

      <section aria-label="Projects">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">Projects</h2>
          <span className="text-sm text-zinc-500">
            {projects.length} {projects.length === 1 ? "project" : "projects"}
          </span>
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      </section>

      <section
        aria-label="Recent activity"
        className="rounded-xl border border-zinc-200 bg-white"
      >
        <div className="border-b border-zinc-100 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">
            Recent Activity
          </h2>
        </div>
        <ul className="divide-y divide-zinc-100">
          {initialActivity.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between gap-4 px-5 py-3.5"
            >
              <p className="text-sm text-zinc-700">{item.message}</p>
              <span className="shrink-0 text-xs text-zinc-400">{item.time}</span>
            </li>
          ))}
        </ul>
      </section>

      {modalOpen ? (
        <NewProjectModal
          onClose={() => setModalOpen(false)}
          onCreate={handleCreate}
        />
      ) : null}
    </div>
  );
}
