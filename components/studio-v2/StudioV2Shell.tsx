"use client";

import { useRef, useState } from "react";
import { preprocessDae, type DaePreprocessResult } from "@/lib/studio-v2/dae-preprocess";
import V2Viewport, { type V2ViewportHandle } from "./V2Viewport";
import { classifyDaeAssemblies, type V2Assembly } from "@/lib/studio-v2/dae-classify";
import type { V2MaterialSelections } from "@/lib/studio-v2/v2-viewer";
import type { V2MaterialZone } from "@/lib/studio-v2/materials";
import type { V2ClassificationSummary } from "@/lib/studio-v2/runtime-classify";
import { V2_ZONE_LABELS } from "@/lib/studio-v2/materials";
import V2WorkflowRail, { type V2Stage } from "./V2WorkflowRail";
import V2StudioHeader from "./V2StudioHeader";
import V2DesignPanel from "./V2DesignPanel";
import V2ViewportControls from "./V2ViewportControls";

type Status =
  | "Reading file"
  | "Repairing 2020 export"
  | "Building kitchen"
  | "Kitchen needs review"
  | "Kitchen ready"
  | "Import failed";

export default function StudioV2Shell({ projectName }: { projectName: string }) {
  const [stage, setStage] = useState<V2Stage>("upload");
  const [status, setStatus] = useState<Status>("Reading file");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [diagnostics, setDiagnostics] = useState<DaePreprocessResult | null>(null);
  const [daeXml, setDaeXml] = useState<string | null>(null);
  const [assemblies, setAssemblies] = useState<V2Assembly[]>([]);
  const [selections, setSelections] = useState<V2MaterialSelections>({});
  const [highlightZone, setHighlightZone] = useState<V2MaterialZone | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [runtimeSummary, setRuntimeSummary] =
    useState<V2ClassificationSummary | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
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
    <div className="flex h-screen min-h-0 flex-col bg-[#faf7f2] text-zinc-900">
      <V2StudioHeader
        projectName={projectName}
        status={status}
        presenting={presenting}
        onPresent={() => setPresenting(true)}
        onExitPresent={() => setPresenting(false)}
      />

      <div className="flex min-h-0 flex-1">
        {!presenting ? (
          <V2WorkflowRail
            stage={stage}
            fileName={fileName}
            collapsed={leftRailCollapsed}
            onCollapse={() => setLeftRailCollapsed((value) => !value)}
            onStage={setStage}
          />
        ) : null}

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <V2Viewport
            ref={viewerRef}
            xml={daeXml}
            assemblies={assemblies}
            onLoaded={(result) => {
              if (result.classification) {
                setRuntimeSummary(result.classification);
              }
              setStatus(
                result.meshCount > 0 ? "Kitchen needs review" : "Kitchen ready",
              );
            }}
            onError={(message) => {
              setLoadError(message);
              setStatus("Import failed");
            }}
          />
          <V2ViewportControls />

          {loadError ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/80 text-sm text-red-700">
              Viewer failed: {loadError}
            </div>
          ) : null}

          {stage === "upload" && !daeXml ? (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h1 className="text-lg font-semibold text-zinc-900">
                  Import 2020 Design
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Upload a 2020 Design 3D DAE to begin.
                </p>
                <label className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 px-6 py-10 cursor-pointer hover:border-zinc-400">
                  <span className="text-sm font-medium text-zinc-800">
                    Choose DAE File
                  </span>
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
              </div>
            </div>
          ) : null}

          {stage === "review" && daeXml ? (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Import Review
                  </h1>
                  <button
                    type="button"
                    onClick={() => setStage("viewer")}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Close
                  </button>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{status}</p>
                {diagnostics ? (
                  <details className="mt-4 rounded-md border border-zinc-200 p-3">
                    <summary className="cursor-pointer text-sm text-zinc-700">
                      Import Details
                    </summary>
                    <div className="mt-2 space-y-1 text-xs text-zinc-600">
                      <p>Source geometries: {diagnostics.sourceGeometryCount}</p>
                      <p>Source instances: {diagnostics.sourceInstanceCount}</p>
                      <p>Duplicate IDs repaired: {diagnostics.repairedIds}</p>
                      <p>Missing textures: {diagnostics.missingTextures.length}</p>
                    </div>
                  </details>
                ) : null}
                <button
                  type="button"
                  onClick={() => setStage("finishes")}
                  className="mt-4 h-10 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Review Finishes
                </button>
              </div>
            </div>
          ) : null}

          {stage === "finishes" && daeXml ? (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between">
                  <h1 className="text-lg font-semibold text-zinc-900">
                    Review Finishes
                  </h1>
                  <button
                    type="button"
                    onClick={() => setStage("viewer")}
                    className="rounded-md border border-zinc-200 px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Close
                  </button>
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  {(Object.keys(V2_ZONE_LABELS) as V2MaterialZone[])
                    .filter((zone) => zone !== "unknown")
                    .map((zone) => {
                      const count = assemblies.filter(
                        (a) => a.proposedZone === zone,
                      ).length;
                      return (
                        <div
                          key={zone}
                          className="rounded-md border border-zinc-200 px-3 py-2"
                        >
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-zinc-800">
                              {V2_ZONE_LABELS[zone]}
                            </span>
                            <span className="text-xs text-zinc-500">
                              {count > 0 ? `${count} assemblies` : "Not assigned"}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                </div>
                <button
                  type="button"
                  onClick={() => setStage("viewer")}
                  className="mt-4 h-10 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800"
                >
                  Continue to Design Studio
                </button>
              </div>
            </div>
          ) : null}
        </main>

        {!presenting ? (
          <aside className="relative z-20 hidden h-full w-[340px] shrink-0 lg:block">
            <V2DesignPanel
              selections={selections}
              onSelect={(zone, materialId) => {
                setSelections((current) => ({
                  ...current,
                  [zone]: materialId,
                }));
                viewerRef.current?.setZoneMaterial(zone, materialId);
              }}
              onRestore={() => {
                viewerRef.current?.restoreAllMaterials();
                setSelections({});
              }}
              onHighlight={(zone) => {
                setHighlightZone(zone);
                viewerRef.current?.highlightZone(zone);
              }}
              highlightZone={highlightZone}
              onView={(view) => viewerRef.current?.setView(view)}
              zoneCounts={runtimeSummary?.zoneCounts}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
