"use client";

import { useState } from "react";
import type { StudioRoom, StudioRoomType } from "@/lib/studio-v2/rooms";
import { ROOM_TYPE_LABELS } from "@/lib/studio-v2/rooms";

export default function V2RoomsSidebar({
  rooms,
  activeRoomId,
  collapsed,
  onCollapse,
  onSelect,
  onAddRoom,
  onRemoveRoom,
}: {
  rooms: StudioRoom[];
  activeRoomId: string | null;
  collapsed: boolean;
  onCollapse: () => void;
  onSelect: (id: string) => void;
  onAddRoom: (type: StudioRoomType, name: string) => void;
  onRemoveRoom: (id: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<StudioRoomType>("kitchen");

  return (
    <aside
      className={`flex shrink-0 flex-col border-r border-zinc-200 bg-[#fbfaf8] ${
        collapsed ? "w-16" : "w-[220px]"
      }`}
    >
      <div className="p-4">
        <div className="flex h-24 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-100 text-xs text-zinc-400">
          {collapsed ? "•••" : "Project Preview"}
        </div>
      </div>

      <div className="flex items-center justify-between px-3 pb-2">
        {!collapsed ? <span className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Rooms</span> : null}
        <button
          type="button"
          onClick={() => setAddOpen((value) => !value)}
          className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600 hover:bg-white"
        >
          +
        </button>
      </div>

      {addOpen ? (
        <div className="mx-3 mb-3 rounded-md border border-zinc-200 bg-white p-2">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Room name"
            className="mb-2 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
          />
          <select
            value={newType}
            onChange={(e) => {
              const type = e.target.value as StudioRoomType;
              setNewType(type);
              setNewName(ROOM_TYPE_LABELS[type]);
            }}
            className="mb-2 w-full rounded border border-zinc-200 px-2 py-1 text-sm"
          >
            {Object.entries(ROOM_TYPE_LABELS).map(([key, label]) => (
              <option key={key} value={key}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                onAddRoom(newType, newName.trim() || ROOM_TYPE_LABELS[newType]);
                setAddOpen(false);
              }}
              className="rounded-md bg-zinc-900 px-2 py-1 text-xs text-white"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(false)}
              className="rounded-md border border-zinc-200 px-2 py-1 text-xs text-zinc-600"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      <nav className="flex-1 overflow-y-auto px-3">
        {rooms.map((room) => {
          const active = room.id === activeRoomId;
          return (
            <div
              key={room.id}
              className={`mb-1 rounded-md px-2 py-2 ${
                active ? "bg-[#f1e8d8]" : "hover:bg-zinc-100"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelect(room.id)}
                className="flex w-full items-center justify-between text-left"
              >
                {!collapsed ? (
                  <span className="text-sm text-zinc-800">{room.name}</span>
                ) : null}
                <span className="text-[10px] text-zinc-400">
                  {room.status === "ready" ? "✓" : "•"}
                </span>
              </button>
              {!collapsed && active ? (
                <div className="mt-1 text-xs text-zinc-500">
                  {room.daeFileName ?? "Empty room"}
                </div>
              ) : null}
              {!collapsed && active && room.daeFileName ? (
                <button
                  type="button"
                  onClick={() => onRemoveRoom(room.id)}
                  className="mt-1 text-xs text-red-600 hover:underline"
                >
                  Remove model
                </button>
              ) : null}
            </div>
          );
        })}
      </nav>

      <button
        type="button"
        onClick={onCollapse}
        className="m-3 rounded-md border border-zinc-200 px-3 py-2 text-xs text-zinc-600 hover:bg-white"
      >
        {collapsed ? "Expand" : "Collapse"}
      </button>
    </aside>
  );
}
