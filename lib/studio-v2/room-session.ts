import type { V2MaterialSelections, V2CameraPose } from "./v2-viewer";
import type { V2MaterialZone } from "./materials";

export type V2PanelTab = "materials" | "lighting" | "view";

export interface RoomSessionState {
  repairedDaeXml: string | null;
  materialSelections: V2MaterialSelections;
  runtimeZoneCounts: Record<V2MaterialZone, number>;
  cameraPose: V2CameraPose | null;
  activePanelTab: V2PanelTab;
}

export const EMPTY_ZONE_COUNTS = Object.fromEntries(
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

export function emptySession(): RoomSessionState {
  return {
    repairedDaeXml: null,
    materialSelections: {},
    runtimeZoneCounts: { ...EMPTY_ZONE_COUNTS },
    cameraPose: null,
    activePanelTab: "materials",
  };
}

export function nextActiveRoomAfterDelete(
  roomIds: string[],
  deletedId: string,
  activeId: string,
): string | null {
  const remaining = roomIds.filter((id) => id !== deletedId);
  if (remaining.length === 0) return null;
  if (activeId === deletedId) return remaining[0];
  return activeId;
}
