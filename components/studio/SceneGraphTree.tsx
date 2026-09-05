"use client";

import { useState, type MouseEvent } from "react";
import {
  ChevronDownIcon,
  ChevronRightIcon,
  CubeIcon,
  FolderIcon,
} from "@/components/icons";
import type { SceneNodeInfo } from "@/lib/studio/types";

interface SceneGraphTreeProps {
  tree: SceneNodeInfo[];
  selectedIds: string[];
  hiddenIds: Set<string>;
  onSelectNodes: (ids: string[], additive: boolean) => void;
}

export default function SceneGraphTree({
  tree,
  selectedIds,
  hiddenIds,
  onSelectNodes,
}: SceneGraphTreeProps) {
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  function renderNode(node: SceneNodeInfo, depth: number) {
    const hasChildren = node.children.length > 0;
    const isOpen = expanded.has(node.id);

    const isSelected = selectedIds.includes(node.id);
    const isHidden = hiddenIds.has(node.id);

    function handleNodeClick(event: MouseEvent<HTMLButtonElement>) {
      const additive = event.ctrlKey || event.metaKey;
      onSelectNodes([node.id], additive);
    }

    return (
      <div key={node.id}>
        <div
          className={`flex items-center rounded-md ${
            isSelected ? "bg-zinc-100" : "hover:bg-zinc-50"
          } ${isHidden ? "opacity-50" : ""}`}
          style={{ paddingLeft: `${depth * 12}px` }}
        >
          {hasChildren ? (
            <button
              type="button"
              onClick={() => toggle(node.id)}
              aria-label={isOpen ? "Collapse node" : "Expand node"}
              className="flex h-7 w-6 shrink-0 items-center justify-center text-zinc-400 hover:text-zinc-700"
            >
              {isOpen ? (
                <ChevronDownIcon className="h-3.5 w-3.5" />
              ) : (
                <ChevronRightIcon className="h-3.5 w-3.5" />
              )}
            </button>
          ) : (
            <span className="w-6 shrink-0" />
          )}

          <button
            type="button"
            onClick={handleNodeClick}
            title={node.isMesh ? "Select mesh" : "Select group"}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-1.5 pr-2 text-left"
          >
            {node.isMesh ? (
              <CubeIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            ) : (
              <FolderIcon className="h-3.5 w-3.5 shrink-0 text-zinc-400" />
            )}
            <span className="truncate text-xs text-zinc-700">{node.name}</span>
            {isHidden ? (
              <span className="shrink-0 text-[10px] font-medium text-zinc-400">
                hidden
              </span>
            ) : null}
            {!node.isMesh && node.meshCount > 0 ? (
              <span className="ml-auto shrink-0 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-zinc-500">
                {node.meshCount}
              </span>
            ) : null}
            {node.hasMaterial ? (
              <span
                className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500"
                title="Has material"
              />
            ) : null}
          </button>
        </div>

        {hasChildren && isOpen ? (
          <div>{node.children.map((child) => renderNode(child, depth + 1))}</div>
        ) : null}
      </div>
    );
  }

  if (tree.length === 0) {
    return <p className="text-sm text-zinc-500">No scene nodes found.</p>;
  }

  return <div>{tree.map((node) => renderNode(node, 0))}</div>;
}
