"use client";

import { useThree, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { renderPage, type PdfDocument } from "@/lib/studio/pdf";
import type {
  PlanCalibration,
  PlanUnderlayAlignment,
} from "@/lib/studio/plan";
import {
  inchesToMeters,
  snapToStep,
  type SnapConfig,
  type ViewMode,
} from "@/lib/studio/transforms";

interface PlanUnderlayProps {
  document: PdfDocument | null;
  selectedPage: number;
  pageRotation: number;
  calibration: PlanCalibration | null;
  underlay: PlanUnderlayAlignment;
  floorY: number;
  viewMode: ViewMode;
  presenting: boolean;
  alignMode: boolean;
  snap: SnapConfig;
  onDragStart: () => void;
  onPreview: (patch: {
    position?: { x: number; z: number };
    rotation?: number;
  }) => void;
  onCommit: () => void;
  onCancel: () => void;
  onStatus: (status: string | null) => void;
  onDraggingChange: (dragging: boolean) => void;
}

function PlanUnderlay({
  document,
  selectedPage,
  pageRotation,
  calibration,
  underlay,
  floorY,
  viewMode,
  presenting,
  alignMode,
  snap,
  onDragStart,
  onPreview,
  onCommit,
  onCancel,
  onStatus,
  onDraggingChange,
}: PlanUnderlayProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const [entry, setEntry] = useState<{
    key: string;
    texture: THREE.CanvasTexture | null;
  }>({ key: "", texture: null });
  const textureRef = useRef<THREE.CanvasTexture | null>(null);
  const dragRef = useRef<{
    type: "move" | "rotate";
    startClientX: number;
    startClientY: number;
    startPosition: { x: number; z: number };
    startRotation: number;
    startAngle: number;
  } | null>(null);

  const currentKey =
    document && calibration?.confirmed ? `${selectedPage}:${pageRotation}` : "";
  const texture = entry.key === currentKey ? entry.texture : null;

  useEffect(() => {
    if (!currentKey || !document) {
      return;
    }
    let cancelled = false;
    renderPage(document, selectedPage, 2.5, pageRotation)
      .then(({ canvas }) => {
        if (cancelled) {
          return;
        }
        if (textureRef.current) {
          textureRef.current.dispose();
        }
        const next = new THREE.CanvasTexture(canvas);
        next.colorSpace = THREE.SRGBColorSpace;
        next.anisotropy = 8;
        next.minFilter = THREE.LinearMipmapLinearFilter;
        textureRef.current = next;
        setEntry({ key: currentKey, texture: next });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentKey, document, selectedPage, pageRotation]);

  useEffect(() => {
    return () => {
      textureRef.current?.dispose();
      textureRef.current = null;
    };
  }, []);

  const visible =
    underlay.visible &&
    viewMode === "plan" &&
    !presenting &&
    calibration?.confirmed &&
    texture !== null;

  const widthMeters = texture
    ? texture.image.width / (calibration?.pixelsPerMeter ?? 1)
    : 1;
  const heightMeters = texture
    ? texture.image.height / (calibration?.pixelsPerMeter ?? 1)
    : 1;

  function floorPoint(event: MouseEvent): THREE.Vector3 | null {
    const rect = gl.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -floorY);
    const point = new THREE.Vector3();
    return raycaster.ray.intersectPlane(plane, point) ? point : null;
  }

  function snapPoint(point: THREE.Vector3) {
    if (snap.enabled) {
      const step = inchesToMeters(snap.translationInches);
      return { x: snapToStep(point.x, step), z: snapToStep(point.z, step) };
    }
    return { x: point.x, z: point.z };
  }

  function handleDragStart(type: "move" | "rotate", event: ThreeEvent<PointerEvent>) {
    event.stopPropagation();
    const point = floorPoint(event.nativeEvent);
    const angle = point
      ? Math.atan2(point.z - underlay.position.z, point.x - underlay.position.x)
      : 0;
    dragRef.current = {
      type,
      startClientX: event.nativeEvent.clientX,
      startClientY: event.nativeEvent.clientY,
      startPosition: { ...underlay.position },
      startRotation: underlay.rotation,
      startAngle: angle,
    };
    onDragStart();
    onStatus(type === "move" ? "Aligning underlay" : "Rotating underlay");
    onDraggingChange(true);
  }

  useEffect(() => {
    function move(event: MouseEvent) {
      const drag = dragRef.current;
      if (!drag) {
        return;
      }
      const point = floorPoint(event);
      if (!point) {
        return;
      }
      if (drag.type === "move") {
        const snapped = snapPoint(point);
        onPreview({ position: { x: snapped.x, z: snapped.z } });
      } else {
        const angle = Math.atan2(
          point.z - underlay.position.z,
          point.x - underlay.position.x,
        );
        let rotation = drag.startRotation + (angle - drag.startAngle);
        if (snap.enabled) {
          const step = (snap.rotationDegrees * Math.PI) / 180;
          rotation = Math.round(rotation / step) * step;
        }
        onPreview({ rotation });
      }
    }
    function up() {
      if (!dragRef.current) {
        return;
      }
      dragRef.current = null;
      onDraggingChange(false);
      onCommit();
      onStatus(null);
    }
    function key(event: KeyboardEvent) {
      if (event.key === "Escape" && dragRef.current) {
        dragRef.current = null;
        onDraggingChange(false);
        onCancel();
        onStatus(null);
      }
    }
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("keydown", key);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [underlay.position, underlay.rotation, snap]);

  if (!visible) {
    return null;
  }

  const interactive = alignMode;

  return (
    <group
      position={[underlay.position.x, floorY + 0.02, underlay.position.z]}
      rotation={[0, underlay.rotation, 0]}
      userData={{ underlay: true }}
    >
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={interactive ? (event) => handleDragStart("move", event) : undefined}
      >
        <planeGeometry args={[widthMeters, heightMeters]} />
        <meshBasicMaterial
          map={texture}
          transparent
          opacity={underlay.opacity}
          depthWrite={false}
        />
      </mesh>
      {interactive ? (
        <>
          <mesh position={[0, 0.04, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[widthMeters + 0.08, heightMeters + 0.08]} />
            <meshBasicMaterial
              color="#3b82f6"
              transparent
              opacity={0.25}
              depthWrite={false}
            />
          </mesh>
          <mesh
            position={[0, 0.06, heightMeters / 2 + 0.12]}
            onPointerDown={(event) => handleDragStart("rotate", event)}
          >
            <sphereGeometry args={[0.09, 16, 16]} />
            <meshBasicMaterial color="#3b82f6" />
          </mesh>
        </>
      ) : null}
    </group>
  );
}

export default PlanUnderlay;
