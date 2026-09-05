"use client";

import { TrashIcon } from "@/components/icons";
import type { ModelInfo } from "@/lib/studio/types";
import { formatBytes } from "@/lib/utils";

interface ModelInspectorProps {
  info: ModelInfo;
  fileName: string;
  fileSize: number;
  onRemove: () => void;
}

function formatValue(value: number): string {
  return value.toFixed(2);
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 py-0.5">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="truncate text-xs font-medium text-zinc-800">{value}</dd>
    </div>
  );
}

export default function ModelInspector({
  info,
  fileName,
  fileSize,
  onRemove,
}: ModelInspectorProps) {
  const [width, height, depth] = info.bounds.size;
  const dimensions = `${formatValue(width)} × ${formatValue(height)} × ${formatValue(depth)} m`;

  return (
    <div>
      <dl>
        <Row label="File" value={fileName} />
        <Row label="Size" value={formatBytes(fileSize)} />
        <Row label="Meshes" value={String(info.meshCount)} />
        <Row label="Groups" value={String(info.groupCount)} />
        <Row label="Materials" value={String(info.materialCount)} />
        <Row label="Dimensions" value={dimensions} />
      </dl>

      <div className="mt-4 flex flex-col gap-2">
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          <TrashIcon className="h-4 w-4" />
          Remove Model
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-9 items-center justify-center rounded-md border border-zinc-200 bg-white px-3 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:text-zinc-900"
        >
          Reset to Demo Kitchen
        </button>
      </div>
    </div>
  );
}
