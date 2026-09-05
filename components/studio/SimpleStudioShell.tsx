"use client";

import { useRef, type ReactNode } from "react";
import type { MaterialZoneId } from "@/lib/studio/material-zones";
import { zoneById } from "@/lib/studio/material-zones";
import type { DaeImportStatus } from "@/lib/studio/dae";

interface SimpleStudioShellProps {
  stage: "upload" | "review" | "design";
  onStage: (stage: "upload" | "review" | "design") => void;

  daeStatus: DaeImportStatus;
  daeFileName: string | null;
  daeFileSize: number | null;
  daeError: string | null;
  daeObjectCount: number | null;
  daeMeshCount: number | null;
  daeMaterialCount: number | null;
  daeDimensions: {
    widthMeters: number;
    heightMeters: number;
    depthMeters: number;
  } | null;
  daeUnit: string | null;
  daeUpAxis: string | null;
  missingTextures: string[];
  findings: string[];
  groupProposals: { zone: MaterialZoneId; count: number }[];
  cutListCount: number;
  readyForDesign: boolean;

  onDaeFile: (file: File) => void;
  onDaeCsv: (file: File) => void;
  onDaeXml: (file: File) => void;
  onDaeRemove: () => void;
  onDaeRetry: () => void;

  pdfFileName: string | null;
  pdfPageCount: number;
  pdfError: string | null;
  onPdfFile: (file: File) => void;
  onPdfRemove: () => void;

  onOpenAdvanced: () => void;
  onPresent: () => void;
  presenting: boolean;
  onExitPresent: () => void;
  viewport?: ReactNode;
  materialsPanel?: ReactNode;
  cameraControls?: ReactNode;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatInches(meters: number): string {
  const inches = meters / 0.0254;
  const feet = Math.floor(inches / 12);
  const remainder = Math.round(inches % 12);
  return `${feet}′ ${remainder}″`;
}

const statusLabels: Record<DaeImportStatus, string> = {
  idle: "Waiting for file",
  loading: "Importing",
  ready: "Ready",
  failed: "Failed",
};

function completenessLabel(
  status: DaeImportStatus,
  loaded: boolean,
  findingCount: number,
): string {
  if (status === "loading") {
    return "Checking kitchen completeness";
  }
  if (status === "ready") {
    return findingCount > 0 ? "Kitchen needs review" : "Kitchen verified";
  }
  return loaded ? "File opened" : "No file";
}

export default function SimpleStudioShell({
  stage,
  onStage,
  daeStatus,
  daeFileName,
  daeFileSize,
  daeError,
  daeObjectCount,
  daeMeshCount,
  daeMaterialCount,
  daeDimensions,
  daeUnit,
  daeUpAxis,
  missingTextures,
  findings,
  groupProposals,
  cutListCount,
  readyForDesign,
  onDaeFile,
  onDaeCsv,
  onDaeXml,
  onDaeRemove,
  onDaeRetry,
  pdfFileName,
  pdfPageCount,
  pdfError,
  onPdfFile,
  onPdfRemove,
  onOpenAdvanced,
  onPresent,
  presenting,
  onExitPresent,
  viewport,
  materialsPanel,
  cameraControls,
}: SimpleStudioShellProps) {
  const daeInputRef = useRef<HTMLInputElement | null>(null);
  const csvInputRef = useRef<HTMLInputElement | null>(null);
  const xmlInputRef = useRef<HTMLInputElement | null>(null);
  const pdfInputRef = useRef<HTMLInputElement | null>(null);

  const stages = [
    { key: "upload" as const, label: "Upload Design", sub: "Import your 2020 Design file" },
    { key: "review" as const, label: "Review Kitchen", sub: "Review what Studio imported" },
    { key: "design" as const, label: "Design & Present", sub: "Choose finishes and present" },
  ];

  const daeLoaded = Boolean(daeFileName);
  const daeInProgress = daeStatus === "loading";

  return (
    <div className="flex h-full min-h-0 flex-col bg-[#faf7f2]">
      {presenting ? (
        <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-3">
          <p className="text-sm font-semibold text-zinc-900">Presentation</p>
          <button
            type="button"
            onClick={onExitPresent}
            className="h-9 rounded-md border border-zinc-200 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
          >
            Exit Presentation
          </button>
        </header>
      ) : (
        <header className="flex flex-col gap-3 border-b border-zinc-200 bg-white px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-base font-semibold text-zinc-900">Design Studio</h1>
            <p className="text-xs text-zinc-500">Cabinet Genies Visualization Platform</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {stages.map((s, index) => {
                const disabled =
                  (s.key === "review" && !daeLoaded) ||
                  (s.key === "design" && !readyForDesign);
                const complete =
                  (s.key === "upload" && daeLoaded) ||
                  (s.key === "review" && readyForDesign);
                return (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => onStage(s.key)}
                    disabled={disabled}
                    title={s.sub}
                    className={`group flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                      stage === s.key
                        ? "bg-zinc-900 text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    } disabled:cursor-not-allowed disabled:opacity-40`}
                  >
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] ${
                        stage === s.key
                          ? "border-white/40 text-white"
                          : "border-zinc-300 text-zinc-500"
                      }`}
                    >
                      {complete ? "✓" : index + 1}
                    </span>
                    <span className="hidden sm:inline">{s.label}</span>
                    <span className="sm:hidden">{index + 1}</span>
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              onClick={onOpenAdvanced}
              className="ml-2 rounded-md border border-zinc-200 px-3 py-2 text-sm text-zinc-700 hover:bg-zinc-50"
            >
              Review Import Issues
            </button>
          </div>
        </header>
      )}

      {presenting || stage === "design" ? (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative min-h-[420px] flex-1 lg:min-h-0">
            {viewport}
            {cameraControls}
            {!presenting ? (
              <button
                type="button"
                onClick={onPresent}
                className="absolute right-4 top-4 h-10 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800"
              >
                Present to Client
              </button>
            ) : null}
          </div>
          <div className="min-h-0 flex-shrink-0 lg:h-auto">
            {materialsPanel}
          </div>
        </div>
      ) : (
        <main className="flex flex-1 items-center justify-center overflow-auto p-8">
          {stage === "upload" ? (
            <div className="w-full max-w-xl text-center">
              <h2 className="text-xl font-semibold text-zinc-900">
                Upload Your 2020 Design
              </h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
                Import the 3D DAE exported from 2020 Design to begin.
              </p>

              <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-8 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-800">3D model</p>
                  <span className="text-xs uppercase tracking-wider text-zinc-400">DAE</span>
                </div>

                {daeFileName ? (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-zinc-800">{daeFileName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {daeFileSize ? formatBytes(daeFileSize) : ""}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${
                          daeStatus === "ready"
                            ? "bg-emerald-50 text-emerald-700"
                            : daeStatus === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {statusLabels[daeStatus]}
                      </span>
                      {daeInProgress ? (
                        <span className="text-xs text-zinc-500">Working…</span>
                      ) : null}
                    </div>
                    {daeError ? (
                      <p className="mt-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                        {daeError}
                      </p>
                    ) : null}
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => daeInputRef.current?.click()}
                        className="h-9 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        Replace DAE
                      </button>
                      <button
                        type="button"
                        onClick={onDaeRetry}
                        disabled={!daeError}
                        className="h-9 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-40"
                      >
                        Retry
                      </button>
                      <button
                        type="button"
                        onClick={onDaeRemove}
                        className="h-9 rounded-md border border-zinc-200 px-4 text-sm text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => daeInputRef.current?.click()}
                    className="mt-4 flex w-full flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-10 text-center hover:border-zinc-300 hover:bg-zinc-100"
                  >
                    <span className="text-sm font-medium text-zinc-800">Choose DAE File</span>
                    <span className="mt-1 text-xs text-zinc-500">
                      Studio will load the exported kitchen in 3D.
                    </span>
                  </button>
                )}

                <input
                  ref={daeInputRef}
                  type="file"
                  accept=".dae,application/collada+xml,model/vnd.collada+xml,text/xml"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      onDaeFile(file);
                    }
                    event.target.value = "";
                  }}
                />
              </div>

              <div className="mt-4 grid gap-4 text-left sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-sm font-semibold text-zinc-800">Companion CSV</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Optional cut list for product enrichment.
                  </p>
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => csvInputRef.current?.click()}
                      className="h-9 rounded-md border border-zinc-200 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
                    >
                      Add CSV
                    </button>
                    {cutListCount > 0 ? (
                      <span className="text-xs text-emerald-700">
                        {cutListCount} rows
                      </span>
                    ) : null}
                  </div>
                  <input
                    ref={csvInputRef}
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file) {
                        onDaeCsv(file);
                      }
                      event.target.value = "";
                    }}
                  />
                </div>

                <div className="rounded-xl border border-zinc-200 bg-white p-5">
                  <p className="text-sm font-semibold text-zinc-800">Companion XML</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    Optional and currently informational only.
                  </p>
                  <button
                    type="button"
                    onClick={() => xmlInputRef.current?.click()}
                    className="mt-3 h-9 rounded-md border border-zinc-200 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Add XML
                  </button>
                  <input
                    ref={xmlInputRef}
                    type="file"
                    accept=".xml,text/xml,application/xml"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      if (file) {
                        onDaeXml(file);
                      }
                      event.target.value = "";
                    }}
                  />
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-5 text-left">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-zinc-800">Drawing PDF</p>
                  <span className="text-xs text-zinc-400">Optional</span>
                </div>
                {pdfFileName ? (
                  <div className="mt-3 flex items-center justify-between gap-3">
                    <p className="truncate text-sm text-zinc-700">
                      {pdfFileName}
                      {pdfPageCount > 0 ? ` · ${pdfPageCount} pages` : ""}
                    </p>
                    <button
                      type="button"
                      onClick={onPdfRemove}
                      className="h-8 shrink-0 rounded-md border border-zinc-200 px-3 text-sm text-red-600 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => pdfInputRef.current?.click()}
                    className="mt-3 h-9 rounded-md border border-zinc-200 px-3 text-sm text-zinc-700 hover:bg-zinc-50"
                  >
                    Add Drawing PDF
                  </button>
                )}
                {pdfError ? (
                  <p className="mt-2 text-sm text-red-600">{pdfError}</p>
                ) : null}
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      onPdfFile(file);
                    }
                    event.target.value = "";
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="w-full max-w-xl">
              <h2 className="text-xl font-semibold text-zinc-900">Review Kitchen</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Here is what Studio understands about this project.
              </p>

              <dl className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white px-5 py-1">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-zinc-600">DAE</dt>
                  <dd className="text-sm font-medium text-zinc-900">
                    {daeFileName ?? "Not uploaded"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-zinc-600">Status</dt>
                  <dd className="text-sm font-medium text-zinc-900">
                    {statusLabels[daeStatus]}
                  </dd>
                </div>
                {daeDimensions ? (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-zinc-600">Dimensions</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {formatInches(daeDimensions.widthMeters)} ×{" "}
                      {formatInches(daeDimensions.heightMeters)} ×{" "}
                      {formatInches(daeDimensions.depthMeters)}
                    </dd>
                  </div>
                ) : null}
                {daeUnit ? (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-zinc-600">Units / axis</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {daeUnit}
                      {daeUpAxis ? ` · ${daeUpAxis.replace("_", "-")}` : ""}
                    </dd>
                  </div>
                ) : null}
                {daeObjectCount != null ? (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-zinc-600">Objects</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {daeObjectCount}
                    </dd>
                  </div>
                ) : null}
                {daeMeshCount != null ? (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-zinc-600">Meshes</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {daeMeshCount}
                    </dd>
                  </div>
                ) : null}
                {daeMaterialCount != null ? (
                  <div className="flex items-center justify-between py-3">
                    <dt className="text-sm text-zinc-600">Materials</dt>
                    <dd className="text-sm font-medium text-zinc-900">
                      {daeMaterialCount}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 rounded-lg border border-zinc-200 bg-white px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-zinc-800">
                    {completenessLabel(daeStatus, daeLoaded, findings.length)}
                  </p>
                  {findings.length > 0 ? (
                    <span className="text-xs text-amber-700">
                      {findings.length} finding{findings.length === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                {findings.length > 0 ? (
                  <ul className="mt-2 list-disc pl-5 text-sm text-zinc-700">
                    {findings.map((finding) => (
                      <li key={finding}>{finding}</li>
                    ))}
                  </ul>
                ) : null}
              </div>

              {groupProposals.length > 0 ? (
                <div className="mt-4 rounded-xl border border-zinc-200 bg-white px-5 py-4">
                  <p className="text-sm font-semibold text-zinc-800">
                    Proposed finish groups
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {groupProposals.map((group) => (
                      <span
                        key={group.zone}
                        className="rounded-full bg-zinc-100 px-2.5 py-1 text-xs text-zinc-700"
                      >
                        {zoneById[group.zone].label} · {group.count}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {missingTextures.length > 0 ? (
                <details className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <summary className="cursor-pointer font-medium">
                    Design loaded with {missingTextures.length} missing texture
                    {missingTextures.length === 1 ? "" : "s"}. Temporary colors
                    are being shown.
                  </summary>
                  <ul className="mt-2 list-disc pl-5 text-xs">
                    {missingTextures.map((file) => (
                      <li key={file}>{file}</li>
                    ))}
                  </ul>
                </details>
              ) : null}

              {daeError ? (
                <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {daeError}
                </div>
              ) : !daeLoaded ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Upload a DAE file to begin.
                </div>
              ) : daeStatus !== "ready" ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Studio has not finished importing the design and will not show
                  the demo kitchen as though it came from your file.
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenAdvanced}
                  className="h-10 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Review Import Issues
                </button>
                <button
                  type="button"
                  disabled={!readyForDesign}
                  onClick={() => onStage("design")}
                  className="h-10 rounded-md bg-zinc-900 px-5 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                >
                  Continue to Design
                </button>
              </div>
            </div>
          )}
        </main>
      )}
    </div>
  );
}
