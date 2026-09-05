"use client";

import { useRef, useState } from "react";
import { preprocessDae, type DaePreprocessResult } from "@/lib/studio-v2/dae-preprocess";
import type { V2View } from "@/lib/studio-v2/v2-viewer";
import V2Viewport, { type V2ViewportHandle } from "./V2Viewport";
import { classifyDaeAssemblies, type V2Assembly } from "@/lib/studio-v2/dae-classify";
import { V2_MATERIALS, V2_ZONE_LABELS, type V2MaterialZone } from "@/lib/studio-v2/materials";
import type { V2MaterialSelections } from "@/lib/studio-v2/v2-viewer";

type Stage = "upload" | "review" | "finishes" | "viewer";
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
  const [assemblies, setAssemblies] = useState<V2Assembly[]>([]);
  const [selections, setSelections] = useState<V2MaterialSelections>({});
  const [highlightZone, setHighlightZone] = useState<V2MaterialZone | null>(null);
  const [presenting, setPresenting] = useState(false);
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
      setAssemblies(classifyDaeAssemblies(processed.xml));
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
                onClick={() => setStage("finishes")}
                disabled={!daeXml}
                className="h-10 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                Continue to Viewer
              </button>
            </div>
          </div>
        </main>
      ) : stage === "finishes" ? (
        <main className="flex flex-1 items-center justify-center overflow-auto p-8">
          <div className="w-full max-w-2xl">
            <h1 className="text-xl font-semibold">Review Finishes</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Confirm or correct where each imported object belongs.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {(Object.keys(V2_ZONE_LABELS) as V2MaterialZone[]).map((zone) => {
                const zoneAssemblies = assemblies.filter(
                  (assembly) => assembly.proposedZone === zone,
                );
                return (
                  <div
                    key={zone}
                    className="rounded-xl border border-zinc-200 bg-white p-4"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-zinc-800">
                        {V2_ZONE_LABELS[zone]}
                      </p>
                      <span className="text-xs text-zinc-500">
                        {zoneAssemblies.length} assemblies
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-zinc-500">
                      {V2_MATERIALS[zone].length} material
                      {V2_MATERIALS[zone].length === 1 ? "" : "s"}
                    </p>
                  </div>
                );
              })}
            </div>
            <div className="mt-6 flex gap-2">
              <button
                type="button"
                onClick={() => setStage("review")}
                className="h-10 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Back
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
          <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
            <div className="min-h-[360px] flex-1 lg:min-h-0">
              <V2Viewport
                ref={viewerRef}
                xml={daeXml}
                assemblies={assemblies}
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
            {!presenting ? (
              <aside className="w-full shrink-0 border-t border-zinc-200 bg-white lg:w-[300px] lg:border-l lg:border-t-0 lg:overflow-y-auto">
                <div className="p-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-zinc-800">Finishes</h2>
                    <button
                      type="button"
                      onClick={() => {
                        viewerRef.current?.restoreAllMaterials();
                        setSelections({});
                      }}
                      className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-700 hover:bg-zinc-50"
                    >
                      Restore Original
                    </button>
                  </div>
                  <div className="mt-4 space-y-4">
                    {(Object.keys(V2_ZONE_LABELS) as V2MaterialZone[]).map(
                      (zone) => {
                        const zoneAssemblies = assemblies.filter(
                          (a) => a.proposedZone === zone,
                        );
                        return (
                          <div key={zone}>
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-zinc-800">
                                {V2_ZONE_LABELS[zone]}
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  const next =
                                    highlightZone === zone ? null : zone;
                                  setHighlightZone(next);
                                  viewerRef.current?.highlightZone(next);
                                }}
                                className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-50"
                              >
                                {highlightZone === zone
                                  ? "Stop Highlighting"
                                  : "Highlight Zone"}
                              </button>
                            </div>
                            <p className="mt-1 text-xs text-zinc-500">
                              {zoneAssemblies.length} assemblies ·{" "}
                              {selections[zone]
                                ? V2_MATERIALS[zone].find(
                                    (m) => m.id === selections[zone],
                                  )?.label
                                : "Original"}
                            </p>
                            <div className="mt-2 flex gap-1.5 overflow-x-auto pb-1">
                              {V2_MATERIALS[zone].map((material) => (
                                <button
                                  key={material.id}
                                  type="button"
                                  onClick={() => {
                                    setSelections((current) => ({
                                      ...current,
                                      [zone]: material.id,
                                    }));
                                    viewerRef.current?.setZoneMaterial(
                                      zone,
                                      material.id,
                                    );
                                  }}
                                  title={material.label}
                                  className={`h-7 w-7 shrink-0 rounded-full border ${
                                    selections[zone] === material.id
                                      ? "border-zinc-900 ring-2 ring-zinc-300"
                                      : "border-black/10 hover:border-zinc-400"
                                  }`}
                                  style={{ backgroundColor: material.color }}
                                />
                              ))}
                            </div>
                          </div>
                        );
                      },
                    )}
                  </div>
                </div>
              </aside>
            ) : null}
          </div>
          {presenting ? (
            <div className="border-t border-zinc-200 bg-white px-4 py-2 text-right">
              <button
                type="button"
                onClick={() => setPresenting(false)}
                className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
              >
                Exit Presentation
              </button>
            </div>
          ) : (
            <div className="border-t border-zinc-200 bg-white px-4 py-2 text-right">
              <button
                type="button"
                onClick={() => setPresenting(true)}
                className="rounded-md bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white hover:bg-zinc-800"
              >
                Present to Client
              </button>
            </div>
          )}
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
