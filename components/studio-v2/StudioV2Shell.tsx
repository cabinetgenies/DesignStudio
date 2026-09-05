"use client";

import { useRef, useState } from "react";
import { preprocessDae, type DaePreprocessResult } from "@/lib/studio-v2/dae-preprocess";
import type { V2View } from "@/lib/studio-v2/v2-viewer";
import V2Viewport, { type V2ViewportHandle } from "./V2Viewport";

type Stage = "upload" | "review" | "viewer";
type Status =
  | "Reading file"
  | "Repairing 2020 export"
  | "Building kitchen"
  | "Kitchen needs review"
  | "Kitchen ready"
  | "Import failed";

export default function StudioV2Shell({ projectName }: { projectName: string }) {
  const [stage, setStage] = useState<Stage>("upload");
  const [status, setStatus] = useState<Status>("Reading file");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<DaePreprocessResult | null>(null);
  const [daeXml, setDaeXml] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const xmlRef = useRef<string | null>(null);
  const viewerRef = useRef<V2ViewportHandle | null>(null);

  async function handleFile(file: File) {
    setLoadError(null);
    setStatus("Reading file");
    if (!file.name.toLowerCase().endsWith(".dae")) {
      setLoadError("Please choose a .dae file.");
      setStatus("Import failed");
      return;
    }

    setFileName(file.name);
    setFileSize(file.size);
    try {
      setStatus("Repairing 2020 export");
      const text = await file.text();
      const processed = preprocessDae(text);
      xmlRef.current = processed.xml;
      setDaeXml(processed.xml);
      setDiagnostics(processed);
      setStatus(
        processed.duplicateIdCount > 0 || processed.missingTextures.length > 0
          ? "Kitchen needs review"
          : "Building kitchen",
      );
      setStage("review");
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "The DAE could not be read.",
      );
      setStatus("Import failed");
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="flex h-screen flex-col bg-[#faf7f2] text-zinc-900">
      <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
        <div>
          <p className="text-sm font-semibold">{projectName}</p>
          <p className="text-xs text-zinc-500">Studio V2 — DAE viewer foundation</p>
        </div>
        <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs text-zinc-600">
          {status}
        </span>
      </header>

      {stage === "upload" ? (
        <main className="flex flex-1 items-center justify-center p-8">
          <div className="w-full max-w-xl text-center">
            <h1 className="text-xl font-semibold">Upload 2020 DAE</h1>
            <p className="mt-2 text-sm text-zinc-500">
              Import a 2020 Design 3D DAE for a clean, stable viewer.
            </p>
            <label className="mt-8 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white px-6 py-12 cursor-pointer hover:border-zinc-400">
              <span className="text-sm font-medium text-zinc-800">Choose DAE</span>
              <input
                type="file"
                accept=".dae,application/collada+xml,model/vnd.collada+xml,text/xml"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0] ?? null;
                  if (file) handleFile(file);
                  event.target.value = "";
                }}
              />
            </label>
            {fileName ? (
              <p className="mt-3 text-sm text-zinc-600">
                {fileName} · {fileSize ? formatBytes(fileSize) : ""}
              </p>
            ) : null}
            {loadError ? (
              <p className="mt-3 text-sm text-red-600">{loadError}</p>
            ) : null}
          </div>
        </main>
      ) : stage === "review" ? (
        <main className="flex flex-1 items-center justify-center overflow-auto p-8">
          <div className="w-full max-w-2xl">
            <h1 className="text-xl font-semibold">Review import</h1>
            <p className="mt-1 text-sm text-zinc-500">{status}</p>
            {diagnostics ? (
              <dl className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white px-5 py-1">
                <Row label="Source geometries" value={diagnostics.sourceGeometryCount} />
                <Row label="Source instances" value={diagnostics.sourceInstanceCount} />
                <Row label="Visual nodes" value={diagnostics.sourceNodeCount} />
                <Row label="Duplicate IDs found" value={diagnostics.duplicateIdCount} />
                <Row label="Duplicate IDs repaired" value={diagnostics.repairedIds} />
                <Row label="Missing textures" value={diagnostics.missingTextures.length} />
              </dl>
            ) : null}
            {loadError ? (
              <p className="mt-4 text-sm text-red-600">{loadError}</p>
            ) : null}
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setStage("upload")}
                className="h-10 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Replace File
              </button>
              <button
                type="button"
                onClick={() => setStage("viewer")}
                disabled={!daeXml}
                className="h-10 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                Continue to Viewer
              </button>
            </div>
          </div>
        </main>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-2">
            <button
              type="button"
              onClick={() => setStage("review")}
              className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Return to Review
            </button>
            <div className="flex flex-wrap gap-1">
              {(["reset", "front", "left", "right", "top", "inside"] as V2View[]).map(
                (view) => (
                  <button
                    key={view}
                    type="button"
                    onClick={() => viewerRef.current?.setView(view)}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100"
                  >
                    {view === "inside" ? "Inside View" : view.charAt(0).toUpperCase() + view.slice(1)}
                  </button>
                ),
              )}
            </div>
          </div>
          <div className="min-h-0 flex-1">
            <V2Viewport
              ref={viewerRef}
              xml={daeXml}
              onLoaded={(result) => {
                setStatus(
                  result.meshCount > 0 ? "Kitchen needs review" : "Kitchen ready",
                );
              }}
              onError={(message) => {
                setLoadError(message);
                setStatus("Import failed");
              }}
            />
          </div>
        </main>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-3">
      <dt className="text-sm text-zinc-600">{label}</dt>
      <dd className="text-sm font-medium text-zinc-900">{value}</dd>
    </div>
  );
}
