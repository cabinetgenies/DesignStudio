"use client";

import { useRef, type ReactNode } from "react";

interface SimpleStudioShellProps {
  stage: "upload" | "review" | "design";
  onStage: (stage: "upload" | "review" | "design") => void;
  fileName: string | null;
  fileSize: number | null;
  pageCount: number;
  hasRoom: boolean;
  cabinetCount: number;
  openingCount: number;
  hasCalibration: boolean;
  onAnalyze: () => void;
  onOpenAdvanced: () => void;
  onPresent: () => void;
  presenting: boolean;
  onExitPresent: () => void;
  onFile: (file: File) => void;
  onRemove: () => void;
  pdfError: string | null;
  viewport?: ReactNode;
  materialsPanel?: ReactNode;
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

export default function SimpleStudioShell({
  stage,
  onStage,
  fileName,
  fileSize,
  pageCount,
  hasRoom,
  cabinetCount,
  openingCount,
  hasCalibration,
  onAnalyze,
  onOpenAdvanced,
  onPresent,
  presenting,
  onExitPresent,
  onFile,
  onRemove,
  pdfError,
  viewport,
  materialsPanel,
}: SimpleStudioShellProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stages = [
    { key: "upload" as const, label: "Upload Drawings", sub: "Upload your 2020 Design PDF" },
    { key: "review" as const, label: "Review Kitchen", sub: "Review what Studio found" },
    { key: "design" as const, label: "Design & Present", sub: "Choose finishes and present" },
  ];

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
                  (s.key === "review" && !fileName) ||
                  (s.key === "design" && !hasRoom);
                const complete =
                  (s.key === "upload" && Boolean(fileName)) ||
                  (s.key === "review" && hasRoom);
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
              Correct Model
            </button>
          </div>
        </header>
      )}

      {presenting || stage === "design" ? (
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative min-h-[420px] flex-1 lg:min-h-0">
            {viewport}
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
              <h2 className="text-xl font-semibold text-zinc-900">Upload Drawings</h2>
              <p className="mt-2 text-sm text-zinc-500">
                Upload the complete drawing set exported from 2020 Design.
              </p>

              <div className="mt-8 rounded-xl border border-dashed border-zinc-300 bg-white p-8">
                {fileName ? (
                  <div className="text-left">
                    <p className="text-sm font-medium text-zinc-800">{fileName}</p>
                    <p className="mt-1 text-xs text-zinc-500">
                      {fileSize ? formatBytes(fileSize) : ""}
                      {pageCount > 0 ? ` · ${pageCount} page${pageCount === 1 ? "" : "s"}` : ""}
                    </p>
                    <div className="mt-5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="h-9 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50"
                      >
                        Replace PDF
                      </button>
                      <button
                        type="button"
                        onClick={onRemove}
                        className="h-9 rounded-md border border-zinc-200 px-4 text-sm text-red-600 hover:bg-red-50"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex w-full flex-col items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 px-6 py-10 text-center hover:border-zinc-300 hover:bg-zinc-100"
                  >
                    <span className="text-sm font-medium text-zinc-800">Choose 2020 PDF</span>
                    <span className="mt-1 text-xs text-zinc-500">
                      Drag and drop is not available yet. Click to choose a .pdf file.
                    </span>
                  </button>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/pdf,.pdf"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0] ?? null;
                    if (file) {
                      onFile(file);
                    }
                    event.target.value = "";
                  }}
                />
              </div>

              {pdfError ? (
                <p className="mt-3 text-sm text-red-600">{pdfError}</p>
              ) : null}

              <button
                type="button"
                onClick={onAnalyze}
                disabled={!fileName}
                className="mt-6 h-10 rounded-md bg-zinc-900 px-6 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
              >
                Analyze Drawings
              </button>

              <p className="mx-auto mt-4 max-w-md text-xs leading-5 text-zinc-500">
                Studio can read dimensions and room geometry, but cabinet reconstruction
                still requires review.
              </p>
            </div>
          ) : (
            <div className="w-full max-w-xl">
              <h2 className="text-xl font-semibold text-zinc-900">Review Kitchen</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Here is what Studio understands about this project.
              </p>

              <dl className="mt-6 divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white px-5 py-1">
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-zinc-600">Pages loaded</dt>
                  <dd className="text-sm font-medium text-zinc-900">
                    {fileName ? `${pageCount} page${pageCount === 1 ? "" : "s"}` : "No PDF loaded"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-zinc-600">Scale</dt>
                  <dd className="text-sm font-medium text-zinc-900">
                    {hasCalibration ? "Confirmed" : "Not confirmed"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-zinc-600">Room</dt>
                  <dd className="text-sm font-medium text-zinc-900">
                    {hasRoom ? "Generated" : "Not generated yet"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-zinc-600">Cabinets</dt>
                  <dd className="text-sm font-medium text-zinc-900">
                    {cabinetCount > 0
                      ? `${cabinetCount} cabinet${cabinetCount === 1 ? "" : "s"} in the model`
                      : "Not reconstructed automatically"}
                  </dd>
                </div>
                <div className="flex items-center justify-between py-3">
                  <dt className="text-sm text-zinc-600">Openings</dt>
                  <dd className="text-sm font-medium text-zinc-900">
                    {openingCount > 0
                      ? `${openingCount} opening${openingCount === 1 ? "" : "s"} need review`
                      : "No openings detected"}
                  </dd>
                </div>
              </dl>

              {!hasCalibration || !hasRoom ? (
                <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {!hasCalibration
                    ? "Confirm the drawing scale before generating the room."
                    : "The room has not been generated yet."}
                </div>
              ) : null}

              <div className="mt-6 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onOpenAdvanced}
                  className="h-10 rounded-md border border-zinc-200 px-4 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  Correct Model
                </button>
                <button
                  type="button"
                  disabled={!hasRoom}
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
