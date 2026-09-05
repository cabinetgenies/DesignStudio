"use client";

import { memo } from "react";
import {
  buildWallGeometry,
  type RoomLayout,
  type WallSegment,
} from "@/lib/studio/room";

type RoomVariant = "solid" | "subdued" | "preview";

const COLORS: Record<
  RoomVariant,
  { wall: string; floor: string; window: string; door: string; opacity: number }
> = {
  solid: {
    wall: "#ece6dc",
    floor: "#d8d2c8",
    window: "#b9dbea",
    door: "#d8c9b1",
    opacity: 1,
  },
  subdued: {
    wall: "#ece6dc",
    floor: "#d8d2c8",
    window: "#b9dbea",
    door: "#d8c9b1",
    opacity: 0.32,
  },
  preview: {
    wall: "#38bdf8",
    floor: "#7dd3fc",
    window: "#0ea5e9",
    door: "#22d3ee",
    opacity: 0.34,
  },
};

function SegmentMesh({
  segment,
  variant,
}: {
  segment: WallSegment;
  variant: RoomVariant;
}) {
  const colors = COLORS[variant];
  return (
    <mesh
      name={segment.id}
      userData={variant === "preview" ? undefined : { wallId: segment.wallId }}
      position={segment.center}
      rotation={[0, segment.rotationY, 0]}
      castShadow={variant === "solid"}
      receiveShadow={variant === "solid"}
      raycast={variant === "preview" ? () => null : undefined}
    >
      <boxGeometry args={segment.size} />
      <meshStandardMaterial
        color={colors.wall}
        roughness={0.9}
        metalness={0}
        transparent={variant !== "solid"}
        opacity={colors.opacity}
        depthWrite={variant === "solid"}
      />
    </mesh>
  );
}

function RoomRenderer({
  room,
  showFloor = true,
  variant = "solid",
}: {
  room: RoomLayout;
  showFloor?: boolean;
  variant?: RoomVariant;
}) {
  const colors = COLORS[variant];
  return (
    <group name={`room-layout-${variant}`}>
      {showFloor ? (
        <mesh
          name={`room-floor-${variant}`}
          position={[0, room.floorY, 0]}
          rotation={[-Math.PI / 2, 0, 0]}
          receiveShadow={variant === "solid"}
          raycast={variant === "preview" ? () => null : undefined}
        >
          <planeGeometry args={[60, 60]} />
          <meshStandardMaterial
            color={colors.floor}
            roughness={0.9}
            metalness={0}
            transparent={variant !== "solid"}
            opacity={variant === "solid" ? 1 : colors.opacity}
            depthWrite={variant === "solid"}
          />
        </mesh>
      ) : null}
      {room.walls.map((wall) => {
        const { segments, openings } = buildWallGeometry(wall);
        return (
          <group key={wall.id} name={wall.id}>
            {segments.map((segment) => (
              <SegmentMesh
                key={segment.id}
                segment={segment}
                variant={variant}
              />
            ))}
            {openings.map((opening) => {
              const isWindow = opening.type === "window";
              return (
                <mesh
                  key={opening.id}
                  name={opening.id}
                  userData={
                    variant === "preview"
                      ? undefined
                      : { wallId: opening.wallId, openingId: opening.openingId }
                  }
                  position={opening.center}
                  rotation={[0, opening.rotationY, 0]}
                  raycast={variant === "preview" ? () => null : undefined}
                >
                  <boxGeometry args={opening.size} />
                  <meshStandardMaterial
                    color={isWindow ? colors.window : colors.door}
                    roughness={0.35}
                    metalness={0}
                    transparent
                    opacity={
                      variant === "solid"
                        ? isWindow
                          ? 0.32
                          : 0.22
                        : colors.opacity
                    }
                    depthWrite={variant === "solid"}
                  />
                </mesh>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

export default memo(RoomRenderer);
