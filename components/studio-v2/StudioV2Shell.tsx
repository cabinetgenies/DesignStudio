"use client";

import { useRef, useState } from "react";
import { preprocessDae } from "@/lib/studio-v2/dae-preprocess";
import V2Viewport, { type V2ViewportHandle } from "./V2Viewport";
import V2StudioHeader from "./V2StudioHeader";
import V2DesignPanel from "./V2DesignPanel";
import V2ViewportControls from "./V2ViewportControls";
import V2RoomsSidebar from "./V2RoomsSidebar";
import { createRoom, type StudioRoom, type StudioRoomType } from "@/lib/studio-v2/rooms";
import type { V2MaterialSelections, V2CameraPose } from "@/lib/studio-v2/v2-viewer";
import type { V2MaterialZone } from "@/lib/studio-v2/materials";

type PanelTab = "materials" | "lighting" | "view";
type Status =
  | "Reading file"
  | "Repairing 2020 export"
  | "Building kitchen"
  | "Kitchen needs review"
  | "Kitchen ready"
  | "Import failed";

interface RoomSessionState {
  repairedDaeXml: string | null;
  materialSelections: V2MaterialSelections;
  runtimeZoneCounts: Record<V2MaterialZone, number>;
  cameraPose: V2CameraPose | null;
  activePanelTab: PanelTab;
}

const EMPTY_ZONE_COUNTS = Object.fromEntries(
  [
    "perimeter",
    "island",
    "tall",
    "hood",
    "countertops",
    "backsplash",
    "floor",
    "walls",
    "hardware",
    "plumbing",
    "appliances",
    "unknown",
  ].map((zone) => [zone, 0]),
) as Record<V2MaterialZone, number>;

function emptySession(): RoomSessionState {
  return {
    repairedDaeXml: null,
    materialSelections: {},
    runtimeZoneCounts: { ...EMPTY_ZONE_COUNTS },
    cameraPose: null,
    activePanelTab: "materials",
  };
}

export default function StudioV2Shell({ projectName }: { projectName: string }) {
  const initialRoom = createRoom("kitchen");
  const [rooms, setRooms] = useState<StudioRoom[]>([initialRoom]);
  const [activeRoomId, setActiveRoomId] = useState<string>(initialRoom.id);
  const [status, setStatus] = useState<Status>("Reading file");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<number | null>(null);
  const [selections, setSelections] = useState<V2MaterialSelections>({});
  const [zoneCounts, setZoneCounts] = useState<Record<V2MaterialZone, number>>({
    ...EMPTY_ZONE_COUNTS,
  });
  const [highlightZone, setHighlightZone] = useState<V2MaterialZone | null>(null);
  const [presenting, setPresenting] = useState(false);
  const [leftRailCollapsed, setLeftRailCollapsed] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [panelTab, setPanelTab] = useState<PanelTab>("materials");
  const [interactionMode, setInteractionMode] = useState<"orbit" | "move">(
    "orbit",
  );
  const viewerRef = useRef<V2ViewportHandle | null>(null);
  const roomSessionsRef = useRef(new Map<string, RoomSessionState>());

  function ensureSession(roomId: string): RoomSessionState {
    const current = roomSessionsRef.current.get(roomId);
    if (current) return current;
    const session = emptySession();
    roomSessionsRef.current.set(roomId, session);
    return session;
  }

  function saveActiveSession() {
    const session = ensureSession(activeRoomId);
    session.materialSelections = selections;
    session.runtimeZoneCounts = zoneCounts;
    session.activePanelTab = panelTab;
    const pose = viewerRef.current?.getCameraPose() ?? null;
    session.cameraPose = pose;
  }

  function selectRoom(roomId: string) {
    if (roomId === activeRoomId) return;
    saveActiveSession();
    const session = ensureSession(roomId);
    setActiveRoomId(roomId);
    setSelections(session.materialSelections);
    setZoneCounts(session.runtimeZoneCounts);
    setPanelTab(session.activePanelTab);
    setHighlightZone(null);
    setLoadError(null);
    const room = rooms.find((r) => r.id === roomId);
    setFileName(room?.daeFileName ?? null);
    setStatus(room?.status === "ready" ? "Kitchen needs review" : "Reading file");
    viewerRef.current?.showRoom(roomId);
    if (session.cameraPose) {
      viewerRef.current?.setCameraPose(session.cameraPose);
    }
  }

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
      const session = ensureSession(activeRoomId);
      session.repairedDaeXml = processed.xml;
      const result = viewerRef.current?.loadRoomDae(activeRoomId, processed.xml);
      const counts = result?.classification?.zoneCounts;
      if (counts) {
        const next: Record<V2MaterialZone, number> = { ...EMPTY_ZONE_COUNTS };
        for (const [zone, value] of Object.entries(counts)) {
          next[zone as V2MaterialZone] = value.meshes;
        }
        session.runtimeZoneCounts = next;
        setZoneCounts(next);
      }
      session.cameraPose = viewerRef.current?.getCameraPose() ?? null;
      setRooms((current) =>
        current.map((room) =>
          room.id === activeRoomId
            ? { ...room, daeFileName: file.name, status: "ready", error: null }
            : room,
        ),
      );
      setStatus("Kitchen needs review");
      setLoadError(null);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "The DAE could not be loaded.",
      );
      setStatus("Import failed");
    }
  }

  function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const activeRoom = rooms.find((room) => room.id === activeRoomId) ?? rooms[0];
  const modelReady = activeRoom?.status === "ready";

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
          <V2RoomsSidebar
            rooms={rooms}
            activeRoomId={activeRoomId}
            collapsed={leftRailCollapsed}
            onCollapse={() => setLeftRailCollapsed((value) => !value)}
            onSelect={selectRoom}
            onAddRoom={(type: StudioRoomType, name: string) => {
              const room = createRoom(type, name);
              setRooms((current) => [...current, room]);
              ensureSession(room.id);
              selectRoom(room.id);
            }}
            onRemoveRoom={(id) => {
              const room = rooms.find((r) => r.id === id);
              if (room?.daeFileName) {
                if (!window.confirm("Remove this room's loaded design?")) return;
                viewerRef.current?.removeRoomModel(id);
                roomSessionsRef.current.delete(id);
                setRooms((current) =>
                  current.map((r) =>
                    r.id === id
                      ? { ...r, daeFileName: null, status: "empty", error: null }
                      : r,
                  ),
                );
                if (activeRoomId === id) {
                  setSelections({});
                  setZoneCounts({ ...EMPTY_ZONE_COUNTS });
                  setFileName(null);
                }
              } else {
                if (rooms.length === 1) {
                  const replacement = createRoom("kitchen");
                  setRooms([replacement]);
                  setActiveRoomId(replacement.id);
                  ensureSession(replacement.id);
                  viewerRef.current?.showRoom(replacement.id);
                } else {
                  const remaining = rooms.filter((r) => r.id !== id);
                  setRooms(remaining);
                  if (activeRoomId === id) {
                    const next = remaining[0];
                    setActiveRoomId(next.id);
                    selectRoom(next.id);
                  }
                }
              }
            }}
          />
        ) : null}

        <main className="relative min-w-0 flex-1 overflow-hidden">
          <V2Viewport ref={viewerRef} />
          <V2ViewportControls
            mode={interactionMode}
            onModeChange={(mode) => {
              setInteractionMode(mode);
              viewerRef.current?.setInteractionMode(mode);
            }}
          />

          {!modelReady ? (
            <div className="absolute inset-0 flex items-center justify-center p-8">
              <div className="w-full max-w-lg rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                <h1 className="text-lg font-semibold text-zinc-900">
                  {activeRoom.name}
                </h1>
                <p className="mt-1 text-sm text-zinc-500">
                  Add a 2020 Design
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
                {loadError ? (
                  <p className="mt-3 text-sm text-red-600">{loadError}</p>
                ) : null}
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
                const session = ensureSession(activeRoomId);
                session.materialSelections = {
                  ...session.materialSelections,
                  [zone]: materialId,
                };
                viewerRef.current?.setZoneMaterial(zone, materialId);
              }}
              onRestore={() => {
                viewerRef.current?.restoreAllMaterials();
                setSelections({});
                const session = ensureSession(activeRoomId);
                session.materialSelections = {};
              }}
              onHighlight={(zone) => {
                setHighlightZone(zone);
                viewerRef.current?.highlightZone(zone);
              }}
              highlightZone={highlightZone}
              onView={(view) => viewerRef.current?.setView(view)}
              zoneCounts={zoneCounts}
            />
          </aside>
        ) : null}
      </div>
    </div>
  );
}
