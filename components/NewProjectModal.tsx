"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { Project, ProjectType } from "@/lib/types";
import { slugify } from "@/lib/utils";
import { ChevronDownIcon, CloseIcon } from "./icons";

interface NewProjectModalProps {
  onClose: () => void;
  onCreate: (project: Project) => void;
}

const projectTypes: ProjectType[] = ["Kitchen", "Bathroom", "Closet", "Other"];

export default function NewProjectModal({
  onClose,
  onCreate,
}: NewProjectModalProps) {
  const [name, setName] = useState("");
  const [client, setClient] = useState("");
  const [type, setType] = useState<ProjectType>("Kitchen");

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const canSubmit = name.trim().length > 0;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canSubmit) {
      return;
    }

    onCreate({
      id: slugify(name),
      name: name.trim(),
      client: client.trim() || "Unassigned",
      type,
      status: "Draft",
      updatedAt: "Just now",
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center">
      <div
        className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="new-project-title"
        className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-zinc-100 px-6 py-5">
          <div>
            <h2
              id="new-project-title"
              className="text-lg font-semibold tracking-tight text-zinc-900"
            >
              New Project
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Start a new client visualization.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            <div>
              <label
                htmlFor="project-name"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Project Name
              </label>
              <input
                id="project-name"
                type="text"
                required
                autoFocus
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Johnson Kitchen"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
              />
            </div>

            <div>
              <label
                htmlFor="client-name"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Client Name
              </label>
              <input
                id="client-name"
                type="text"
                value={client}
                onChange={(event) => setClient(event.target.value)}
                placeholder="e.g. Johnson Family"
                className="h-10 w-full rounded-md border border-zinc-200 bg-white px-3 text-sm text-zinc-900 placeholder:text-zinc-400 outline-none transition-colors focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
              />
            </div>

            <div>
              <label
                htmlFor="project-type"
                className="mb-1.5 block text-sm font-medium text-zinc-700"
              >
                Project Type
              </label>
              <div className="relative">
                <select
                  id="project-type"
                  value={type}
                  onChange={(event) => setType(event.target.value as ProjectType)}
                  className="h-10 w-full appearance-none rounded-md border border-zinc-200 bg-white pl-3 pr-9 text-sm text-zinc-900 outline-none transition-colors focus:border-zinc-300 focus:ring-2 focus:ring-zinc-200"
                >
                  {projectTypes.map((projectType) => (
                    <option key={projectType} value={projectType}>
                      {projectType}
                    </option>
                  ))}
                </select>
                <ChevronDownIcon className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-zinc-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="inline-flex h-9 items-center justify-center rounded-md bg-zinc-900 px-4 text-sm font-medium text-white transition-colors hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
