"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { TransformControls } from "@react-three/drei";
import { useThree } from "@react-three/fiber";
import type { CabinetInstance } from "@/lib/studio/cabinet";
import { findByAppId } from "@/lib/studio/space-planning";
import {
  computeSnap,
  makeFootprint,
  type SnapResult,
  type XZFootprint,
} from "@/lib/studio/geometry-snapping";
import type { SnapConfig } from "@/lib/studio/transforms";
import type { RoomLayout } from "@/lib/studio/room";

export default function CabinetTransformController({
  cabinet,
  mode,
  onCommit,
  onRotateCommit,
  onRotateStart,
  onRotatePreview,
  rotationSnap,
  onDraggingChange,
  onStart,
  onPreview,
  onCancel,
  allCabinets,
  snapConfig,
  onSnapStatus,
  room,
  onSnapResult,
}: {
  cabinet: CabinetInstance;
  mode: "translate" | "rotate";
  onCommit: (id: string, position: [number, number, number]) => void;
  onRotateCommit: (id: string, rotation: [number, number, number]) => void;
  onRotateStart: (id: string, rotation: [number, number, number]) => void;
  onRotatePreview: (id: string, rotation: [number, number, number]) => void;
  rotationSnap: number | null;
  onDraggingChange: (dragging: boolean) => void;
  onStart: (id: string, position: [number, number, number]) => void;
  onPreview: (id: string, position: [number, number, number]) => void;
  onCancel: () => void;
  allCabinets: Record<string, CabinetInstance>;
  snapConfig: SnapConfig;
  onSnapStatus: (status: string | null) => void;
  room: RoomLayout;
  onSnapResult: (result: SnapResult | null) => void;
}) {
  const scene = useThree((state) => state.scene);
  const object = useMemo(
    () => findByAppId(scene, cabinet.id),
    [scene, cabinet.id],
  );
  const objectRef = useRef(object);
  const startRef = useRef<[number, number, number] | null>(null);
  const startRotRef = useRef<[number, number, number] | null>(null);
  const targetsRef = useRef<XZFootprint[]>([]);
  const wallEdgesRef = useRef<{ a: [number, number]; b: [number, number] }[]>([]);
  const snappingRef = useRef(false);

  useEffect(() => {
    objectRef.current = object;
  }, [object]);

  const floorStanding = cabinet.category !== "wall";

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && (startRef.current || startRotRef.current)) {
      const target = objectRef.current;
      if (target) {
        if (startRef.current) target.position.set(...startRef.current);
        if (startRotRef.current) target.rotation.set(...startRotRef.current);
      }
      startRef.current = null;
      startRotRef.current = null;
      onDraggingChange(false);
      onCancel();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, onDraggingChange]);

  const cancelDrag = useCallback(() => {
    if (!startRef.current && !startRotRef.current) return;
    const target = objectRef.current;
    if (target) {
      if (startRef.current) target.position.set(...startRef.current);
      if (startRotRef.current) target.rotation.set(...startRotRef.current);
    }
    startRef.current = null;
    startRotRef.current = null;
    targetsRef.current = [];
    wallEdgesRef.current = [];
    onDraggingChange(false);
    onCancel();
    onSnapStatus(null);
    onSnapResult(null);
  }, [onDraggingChange, onCancel, onSnapStatus, onSnapResult]);

  useEffect(() => {
    function onBlur() {
      cancelDrag();
    }
    function onPointerCancel() {
      cancelDrag();
    }
    window.addEventListener("blur", onBlur);
    window.addEventListener("pointercancel", onPointerCancel);
    return () => {
      window.removeEventListener("blur", onBlur);
      window.removeEventListener("pointercancel", onPointerCancel);
      cancelDrag();
    };
  }, [cancelDrag]);

  if (!object) {
    return null;
  }

  return (
    <TransformControls
      object={object}
      mode={mode}
      space="world"
      rotationSnap={mode === "rotate" ? rotationSnap : null}
      showX={mode === "translate"}
      showY={mode === "translate" ? !floorStanding : true}
      showZ={mode === "translate"}
      onMouseDown={() => {
        if (mode === "translate") {
          startRef.current = [...cabinet.position];
          targetsRef.current = Object.values(allCabinets)
            .filter((c) => c.id !== cabinet.id && !c.hidden)
            .map((c) =>
              makeFootprint(
                c.position[0],
                c.position[2],
                c.widthM,
                c.depthM,
                c.rotation[1],
              ),
            );
          wallEdgesRef.current = room.walls
            .filter(
              (wall) =>
                wall.end.x !== wall.start.x || wall.end.z !== wall.start.z,
            )
            .map((wall) => ({
              a: [wall.start.x, wall.start.z] as [number, number],
              b: [wall.end.x, wall.end.z] as [number, number],
            }));
          onStart(cabinet.id, [...cabinet.position] as [number, number, number]);
        } else {
          startRotRef.current = [...cabinet.rotation];
          onRotateStart(cabinet.id, [...cabinet.rotation] as [number, number, number]);
        }
        onDraggingChange(true);
      }}
      onObjectChange={() => {
        const target = objectRef.current;
        if (!target) return;
        if (mode === "rotate") {
          target.rotation.x = 0;
          target.rotation.z = 0;
          target.rotation.y = Math.atan2(
            Math.sin(target.rotation.y),
            Math.cos(target.rotation.y),
          );
          onRotatePreview(cabinet.id, [
            target.rotation.x,
            target.rotation.y,
            target.rotation.z,
          ]);
        } else {
          if (floorStanding) {
            target.position.y = 0;
          } else if (target.position.y < 0) {
            target.position.y = 0;
          }
          onPreview(cabinet.id, [
            target.position.x,
            target.position.y,
            target.position.z,
          ]);
          if (
            snapConfig.enabled &&
            snapConfig.objectSnap &&
            !snappingRef.current
          ) {
            snappingRef.current = true;
            const moving = makeFootprint(
              target.position.x,
              target.position.z,
              cabinet.widthM,
              cabinet.depthM,
              cabinet.rotation[1],
            );
            const result = computeSnap(
              moving,
              {
                walls: wallEdgesRef.current,
                objects: targetsRef.current,
                openings: [],
              },
              snapConfig,
            );
            if (result.match) {
              target.position.x += result.correction.x;
              target.position.z += result.correction.z;
              onSnapStatus(result.match.label);
              onSnapResult(result);
            } else {
              onSnapStatus(null);
              onSnapResult(null);
            }
            snappingRef.current = false;
          }
        }
      }}
      onMouseUp={() => {
        const target = objectRef.current;
        if (!target) return;
        if (mode === "rotate") {
          target.rotation.x = 0;
          target.rotation.z = 0;
          target.rotation.y = Math.atan2(
            Math.sin(target.rotation.y),
            Math.cos(target.rotation.y),
          );
          const rotation: [number, number, number] = [
            target.rotation.x,
            target.rotation.y,
            target.rotation.z,
          ];
          startRotRef.current = null;
          onDraggingChange(false);
          onRotateCommit(cabinet.id, rotation);
        } else {
          if (floorStanding) target.position.y = 0;
          else if (target.position.y < 0) target.position.y = 0;
          const position: [number, number, number] = [
            target.position.x,
            target.position.y,
            target.position.z,
          ];
          startRef.current = null;
          targetsRef.current = [];
          wallEdgesRef.current = [];
          onDraggingChange(false);
          onCommit(cabinet.id, position);
          onSnapStatus(null);
        }
      }}
    />
  );
}
