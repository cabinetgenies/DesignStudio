"use client";

import { useRef, type ChangeEvent } from "react";
import { UploadIcon } from "@/components/icons";
import { formatBytes } from "@/lib/utils";

interface ModelUploaderProps {
  fileName: string | null;
  fileSize: number | null;
  loading: boolean;
  error: string | null;
  onFile: (file: File) => void;
}

export default function ModelUploader({
  fileName,
  fileSize,
  loading,
  error,
  onFile,
}: ModelUploaderProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) {
      onFile(file);
    }
    event.target.value = "";
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".glb"
        onChange={handleChange}
        className="hidden"
        aria-label="Upload .glb model"
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-zinc-300 bg-zinc-50 px-3 py-3 text-sm font-medium text-zinc-600 transition-colors hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-900"
      >
        <UploadIcon className="h-4 w-4" />
        {fileName ? "Replace model" : "Upload .glb model"}
      </button>

      {fileName ? (
        <p className="mt-2 text-xs text-zinc-500">
          {fileName} · {fileSize != null ? formatBytes(fileSize) : "—"}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-2 text-xs text-zinc-500">Loading model…</p>
      ) : null}

      {error ? <p className="mt-2 text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
