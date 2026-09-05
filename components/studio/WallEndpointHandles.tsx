"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  inchesToMeters,
  snapToStep,
  type SnapConfig,
  type ViewMode,
} from "@/lib/studio/transforms";
import {
  findConnectedEndpoints,
  findNearestEndpoint,
  moveEndpoints,
  type WallEndpoint,
  type WallEndpointKind,
} from "@/lib/studio/wall-editing";
import type { RoomLayout, WallPoint } from "@/lib/studio/room";

interface WallEndpointHandlesProps {
  room: RoomLayout;
  selectedWallId: string | null;
  snap: SnapConfig;
  tolerance: number;
  viewMode: ViewMode;
  presenting: boolean;
  transformMode: "translate" | "rotate" | null;
  onDragStart: () => void;
  onPreview: (room: RoomLayout) => void;
  onCommit: () => void;
  onCancel: () => void;
  onStatus: (status: string | null) => void;
  onDraggingChange: (dragging: boolean) => void;
}

interface DragState {
  wallId: string;
  point: WallEndpointKind;
  separate: boolean;
  connected: WallEndpoint[];
}

function WallEndpointHandles({
  room,
  selectedWallId,
  snap,
  tolerance,
  viewMode,
  presenting,
  transformMode,
  onDragStart,
  onPreview,
  onCommit,
  onCancel,
  onStatus,
  onDraggingChange,
}: WallEndpointHandlesProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const [drag, setDrag] = useState<DragState | null>(null);

  const roomRef = useRef(room);
  const dragRef = useRef(drag);
  const movedRef = useRef(false);
  const callbacksRef = useRef({
    onDragStart,
    onPreview,
    onCommit,
    onCancel,
    onStatus,
    onDraggingChange,
  });

  useEffect(() => {
    roomRef.current = room;
  }, [room]);

  useEffect(() => {
    dragRef.current = drag;
  }, [drag]);

  useEffect(() => {
    callbacksRef.current = {
      onDragStart,
      onPreview,
      onCommit,
      onCancel,
      onStatus,
      onDraggingChange,
    };
  });

  const selectedWall = selectedWallId
    ? room.walls.find((wall) => wall.id === selectedWallId) ?? null
    : null;
  const visible =
    viewMode === "plan" &&
    !presenting &&
    selectedWall !== null &&
    transformMode === null;

  function pointerToFloor(event: MouseEvent): THREE.Vector3 | null {
    const rect = gl.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(
      new THREE.Vector3(0, 1, 0),
      -room.floorY,
    );
    const point = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, point) ? point : null;
  }

  function snapPoint(point: THREE.Vector3): WallPoint {
    if (snap.enabled) {
      const step = inchesToMeters(snap.translationInches);
      return { x: snapToStep(point.x, step), z: snapToStep(point.z, step) };
    }
    return { x: point.x, z: point.z };
  }

  function handlePointerDown(
    point: WallEndpointKind,
    event: ThreeEvent<PointerEvent>,
  ) {
    if (!selectedWall) {
      return;
    }
    event.stopPropagation();
    const separate = event.nativeEvent.altKey;
    const connected: WallEndpoint[] = separate
      ? [{ wallId: selectedWall.id, point, position: selectedWall[point] }]
      : findConnectedEndpoints(room, selectedWall.id, point, tolerance);
    const nextDrag: DragState = {
      wallId: selectedWall.id,
      point,
      separate,
      connected,
    };
    setDrag(nextDrag);
    dragRef.current = nextDrag;
    movedRef.current = false;
    callbacksRef.current.onDraggingChange(true);
    callbacksRef.current.onDragStart();
    callbacksRef.current.onStatus(
      separate ? "Independent endpoint" : "Connected corner",
    );
  }

  useEffect(() => {
    if (!drag) {
      return;
    }

    function handleMove(event: MouseEvent) {
      const current = dragRef.current;
      if (!current) {
        return;
      }
      const point = pointerToFloor(event);
      if (!point) {
        return;
      }
      const snapped = snapPoint(point);
      const excluded = new Set(
        current.connected.map((endpoint) => `${endpoint.wallId}:${endpoint.point}`),
      );
      const endpointSnap = findNearestEndpoint(
        roomRef.current,
        excluded,
        snapped,
        snap.geometryTolerance,
      );
      const finalPoint = endpointSnap ?? snapped;
      const proposed = moveEndpoints(roomRef.current, current.connected, finalPoint);
      movedRef.current = true;
      callbacksRef.current.onPreview(proposed);
    }

    function handleUp() {
      setDrag(null);
      dragRef.current = null;
      callbacksRef.current.onDraggingChange(false);
      if (movedRef.current) {
        callbacksRef.current.onCommit();
      } else {
        callbacksRef.current.onCancel();
      }
      callbacksRef.current.onStatus(null);
    }

    function handleKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setDrag(null);
        dragRef.current = null;
        callbacksRef.current.onDraggingChange(false);
        callbacksRef.current.onCancel();
        callbacksRef.current.onStatus(null);
      }
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
      window.removeEventListener("keydown", handleKey);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  if (!visible || !selectedWall) {
    return null;
  }

  const y = room.floorY + 0.06;

  return (
    <group name="wall-endpoint-handles">
      {(["start", "end"] as const).map((point) => {
        const p = selectedWall[point];
        const active = drag?.wallId === selectedWall.id && drag.point === point;
        return (
          <mesh
            key={point}
            name={`endpoint-${point}`}
            userData={{ endpointHandle: true, wallId: selectedWall.id, point }}
            position={[p.x, y, p.z]}
            onPointerDown={(event) => handlePointerDown(point, event)}
          >
            <sphereGeometry args={[active ? 0.12 : 0.08, 16, 16]} />
            <meshBasicMaterial color={active ? "#3b82f6" : "#18181b"} />
          </mesh>
        );
      })}
    </group>
  );
}

export default WallEndpointHandles;
