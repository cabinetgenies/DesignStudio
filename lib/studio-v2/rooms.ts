export type StudioRoomType =
  | "kitchen"
  | "primary-bathroom"
  | "guest-bathroom"
  | "laundry"
  | "closet"
  | "other";

export interface StudioRoom {
  id: string;
  name: string;
  type: StudioRoomType;
  daeFileName: string | null;
  status: "empty" | "loading" | "ready" | "failed";
  error: string | null;
}

export const ROOM_TYPE_LABELS: Record<StudioRoomType, string> = {
  kitchen: "Kitchen",
  "primary-bathroom": "Primary Bathroom",
  "guest-bathroom": "Guest Bathroom",
  laundry: "Laundry Room",
  closet: "Closet",
  other: "Other Room",
};

let counter = 0;

export function createRoom(
  type: StudioRoomType,
  name?: string,
): StudioRoom {
  counter += 1;
  return {
    id: `room-${Date.now()}-${counter}`,
    name: name ?? ROOM_TYPE_LABELS[type],
    type,
    daeFileName: null,
    status: "empty",
    error: null,
  };
}
