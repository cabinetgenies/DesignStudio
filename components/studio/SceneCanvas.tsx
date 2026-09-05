"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Grid, OrbitControls, TransformControls } from "@react-three/drei";
import {
  Component,
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { backgroundColors, demoCameraPresets } from "@/lib/studio/camera-presets";
import {
  type MaterialAssignments,
  type ZoneMaterialSelections,
} from "@/lib/studio/material-zones";
import {
  reconcileOverrides,
  type OverrideEntry,
} from "@/lib/studio/material-overrides";
import {
  applyWorldDelta,
  readLocalTransform,
  type LocalTransform,
  type SceneApi,
  type SnapConfig,
  type TransformState,
} from "@/lib/studio/transforms";
import {
  collectEditableObjects,
  computeWorldBounds,
  findByAppId,
  computeHomePose,
  type WallPlanes,
} from "@/lib/studio/space-planning";
import type {
  CameraCommand,
  StudioFocus,
  StudioSettings,
} from "@/lib/studio/types";
import DemoKitchen from "./DemoKitchen";
import ImportedModel from "./ImportedModel";
import RoomRenderer from "./RoomRenderer";
import ParametricCabinet from "./ParametricCabinet";
import CabinetTransformController from "./CabinetTransformController";
import DimensionOverlay from "./DimensionOverlay";
import WallEndpointHandles from "./WallEndpointHandles";
import SnapGuides from "./SnapGuides";
import PlanUnderlay from "./PlanUnderlay";
import type { RoomLayout } from "@/lib/studio/room";
import type { CabinetInstance } from "@/lib/studio/cabinet";
import { materialsByZone } from "@/lib/studio/materials";
import type { DimensionItem } from "@/lib/studio/dimensions";
import type { ViewMode } from "@/lib/studio/transforms";
import type { EditableObjectInfo } from "@/lib/studio/editable-objects";
import type { PlanState } from "@/lib/studio/plan";
import type { PdfDocument } from "@/lib/studio/pdf";
import {
  buildSnapTargets,
  computeSnap,
  convexHullFootprint,
  type SnapResult,
  type SnapTargets,
} from "@/lib/studio/geometry-snapping";

interface SceneCanvasProps {
  settings: StudioSettings;
  commandRef: { current: CameraCommand | null };
  focus: StudioFocus;
  gridOrigin: [number, number, number];
  modelScene: THREE.Group | null;
  modelSceneRef: { current: THREE.Group | null };
  hasModel: boolean;
  onSelectObject: (appId: string | null, additive: boolean) => void;
  assignments: MaterialAssignments;
  zoneSelections: ZoneMaterialSelections;
  materialsApplied: boolean;
  showZones: boolean;
  selectedKeys: string[];
  room: RoomLayout;
  previewRoom: RoomLayout | null;
  reviewing: boolean;
  presenting: boolean;
  viewMode: ViewMode;
  selectedWallId: string | null;
  endpointTolerance: number;
  onSelectWall: (id: string | null) => void;
  onSelectOpening: (id: string | null) => void;
  onWallPreview: (room: RoomLayout) => void;
  onWallCommit: () => void;
  onWallCancel: () => void;
  onWallDragStart: () => void;
  onWallStatus: (status: string | null) => void;
  onWallDraggingChange: (dragging: boolean) => void;
  dimensions: DimensionItem[];
  activeObjects: EditableObjectInfo[];
  onSnapStatus: (status: string | null) => void;
  plan: PlanState;
  pdfDocument: PdfDocument | null;
  onUnderlayDragStart: () => void;
  onUnderlayPreview: (patch: {
    position?: { x: number; z: number };
    rotation?: number;
  }) => void;
  onUnderlayCommit: () => void;
  onUnderlayCancel: () => void;
  onUnderlayStatus: (status: string | null) => void;
  onUnderlayDraggingChange: (dragging: boolean) => void;
  importTransform: {
    position: [number, number, number];
    rotation: [number, number, number];
    scale: number;
  };
  transforms: Record<string, TransformState>;
  originals: Record<string, LocalTransform>;
  transformMode: "translate" | "rotate" | null;
  snap: SnapConfig;
  wallPlanes: WallPlanes;
  sceneApiRef: { current: SceneApi | null };
  onCommitTransforms: (patch: Record<string, LocalTransform>) => void;
  onSnap: (message: string) => void;
  cabinetInstances: Record<string, CabinetInstance>;
  selectedCabinetIds: string[];
  onSelectCabinet: (id: string, additive: boolean) => void;
  onCabinetMoveCommit: (id: string, position: [number, number, number]) => void;
  onCabinetMoveStart: (id: string, position: [number, number, number]) => void;
  onCabinetMovePreview: (id: string, position: [number, number, number]) => void;
  onCabinetMoveCancel: () => void;
  onCabinetRotateCommit: (
    id: string,
    rotation: [number, number, number],
  ) => void;
  onCabinetRotateStart: (id: string, rotation: [number, number, number]) => void;
  onCabinetRotatePreview: (id: string, rotation: [number, number, number]) => void;
  cabinetRunPreview: CabinetInstance[] | null;
}

type ControlsHandle = {
  target: THREE.Vector3;
  update: () => void;
};

const GRID_ARGS: [number, number] = [40, 40];

interface SceneErrorBoundaryProps {
  children: ReactNode;
}

interface SceneErrorBoundaryState {
  hasError: boolean;
}

class SceneErrorBoundary extends Component<
  SceneErrorBoundaryProps,
  SceneErrorBoundaryState
> {
  state: SceneErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): SceneErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full w-full items-center justify-center bg-zinc-50 p-6 text-center">
          <div className="max-w-sm">
            <p className="text-sm font-medium text-zinc-700">
              Unable to load the 3D viewport
            </p>
            <p className="mt-1 text-sm leading-5 text-zinc-500">
              Your browser may not support WebGL, or hardware acceleration is
              disabled.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function BackgroundColor({ color }: { color: string }) {
  const lastColor = useRef<string | null>(null);

  useFrame((state) => {
    if (lastColor.current === color) {
      return;
    }
    state.scene.background = new THREE.Color(color);
    lastColor.current = color;
  });

  return null;
}

function ShadowController({ enabled }: { enabled: boolean }) {
  const lastEnabled = useRef<boolean | null>(null);

  useFrame((state) => {
    if (lastEnabled.current === enabled) {
      return;
    }
    state.gl.shadowMap.enabled = enabled;
    lastEnabled.current = enabled;
  });

  return null;
}

function CameraClipPlanes({ focus }: { focus: StudioFocus }) {
  const lastClip = useRef<string | null>(null);

  useFrame((state) => {
    const camera = state.camera as THREE.PerspectiveCamera;
    const distance = Math.max(focus.radius * 3, 0.001);
    const near = Math.max(distance * 0.001, 0.001);
    const far = Math.max(distance * 100, 100);
    const key = `${near}|${far}`;

    if (lastClip.current === key) {
      return;
    }

    camera.near = near;
    camera.far = far;
    camera.updateProjectionMatrix();
    lastClip.current = key;
  });

  return null;
}

function SceneLights() {
  return (
    <>
      <hemisphereLight intensity={0.85} color="#ffffff" groundColor="#d9d4cc" />
      <directionalLight
        position={[4.5, 7, 3.5]}
        intensity={2.4}
        castShadow
        shadow-bias={-0.0002}
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-7}
        shadow-camera-right={7}
        shadow-camera-top={7}
        shadow-camera-bottom={-7}
        shadow-radius={4}
      />
    </>
  );
}

function KitchenGrid({ position }: { position: [number, number, number] }) {
  return (
    <Grid
      position={position}
      args={GRID_ARGS}
      cellSize={0.25}
      cellThickness={0.5}
      cellColor="#d7d5d2"
      sectionSize={1}
      sectionThickness={0.8}
      sectionColor="#b4b0a9"
      fadeDistance={14}
      fadeStrength={1.6}
      infiniteGrid
    />
  );
}

interface CameraRigProps {
  commandRef: { current: CameraCommand | null };
  focus: StudioFocus;
}

interface CameraAnimation {
  fromPosition: THREE.Vector3;
  toPosition: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  elapsed: number;
  duration: number;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function CameraRig({ commandRef, focus }: CameraRigProps) {
  const animation = useRef<CameraAnimation | null>(null);

  useFrame((state, delta) => {
    const controls = state.controls as unknown as ControlsHandle | null;
    if (!controls) {
      return;
    }

    const command = commandRef.current;
    if (command) {
      commandRef.current = null;
      animation.current = {
        fromPosition: state.camera.position.clone(),
        toPosition: new THREE.Vector3(...command.position),
        fromTarget: controls.target.clone(),
        toTarget: new THREE.Vector3(...command.target),
        elapsed: 0,
        duration: command.duration,
      };
    }

    const current = animation.current;
    if (current) {
      current.elapsed += delta;
      const t = Math.min(current.elapsed / current.duration, 1);
      const eased = easeInOutCubic(t);
      state.camera.position.lerpVectors(
        current.fromPosition,
        current.toPosition,
        eased,
      );
      controls.target.lerpVectors(
        current.fromTarget,
        current.toTarget,
        eased,
      );
      controls.update();

      if (t >= 1) {
        animation.current = null;
      }
    }

    const halfRange = Math.max(focus.radius * 2, 1);
    controls.target.x = THREE.MathUtils.clamp(
      controls.target.x,
      focus.center[0] - halfRange,
      focus.center[0] + halfRange,
    );
    controls.target.y = THREE.MathUtils.clamp(
      controls.target.y,
      0,
      Math.max(focus.center[1] + halfRange, 1),
    );
    controls.target.z = THREE.MathUtils.clamp(
      controls.target.z,
      focus.center[2] - halfRange,
      focus.center[2] + halfRange,
    );
  });

  return null;
}

interface InteractionHandlerProps {
  hasModel: boolean;
  onSelectObject: (appId: string | null, additive: boolean) => void;
  onSelectWall: (id: string | null) => void;
  onSelectOpening: (id: string | null) => void;
}

function InteractionHandler({
  hasModel,
  onSelectObject,
  onSelectWall,
  onSelectOpening,
}: InteractionHandlerProps) {
  const camera = useThree((state) => state.camera);
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const handlersRef = useRef({ onSelectObject, onSelectWall, onSelectOpening });

  useEffect(() => {
    handlersRef.current = { onSelectObject, onSelectWall, onSelectOpening };
  }, [onSelectObject, onSelectWall, onSelectOpening]);

  useEffect(() => {
    const element = gl.domElement;

    function handleClick(event: MouseEvent) {
      const additive = event.ctrlKey || event.metaKey;
      const rect = element.getBoundingClientRect();
      const pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -((event.clientY - rect.top) / rect.height) * 2 + 1,
      );
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(pointer, camera);

      const meshes: THREE.Mesh[] = [];
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.isMesh && mesh.visible) {
          if (mesh.userData.dimension || mesh.parent?.userData.dimension) {
            return;
          }
          if (mesh.userData.endpointHandle) {
            return;
          }
          if (mesh.userData.guide || mesh.parent?.userData.guide) {
            return;
          }
          meshes.push(mesh);
        }
      });

      const hits = raycaster.intersectObjects(meshes, false);
      const hit = hits[0];
      if (!hit) {
        handlersRef.current.onSelectObject(null, false);
        handlersRef.current.onSelectWall(null);
        handlersRef.current.onSelectOpening(null);
        return;
      }

      const userData = hit.object.userData;
      if (userData.openingId) {
        handlersRef.current.onSelectOpening(userData.openingId as string);
        handlersRef.current.onSelectWall(userData.wallId as string);
        return;
      }
      if (userData.wallId) {
        handlersRef.current.onSelectWall(userData.wallId as string);
        return;
      }
      const appId = userData.appId as string | undefined;
      if (appId && (hasModel || userData.editable)) {
        handlersRef.current.onSelectObject(appId, additive);
        return;
      }
      handlersRef.current.onSelectObject(null, false);
    }

    element.addEventListener("click", handleClick);
    return () => element.removeEventListener("click", handleClick);
  }, [camera, gl, scene, hasModel]);

  return null;
}

interface MaterialControllerProps {
  sceneRef: { current: THREE.Group | null };
  demoRef: { current: THREE.Group | null };
  hasModel: boolean;
  assignments: MaterialAssignments;
  zoneSelections: ZoneMaterialSelections;
  materialsApplied: boolean;
  showZones: boolean;
  selectedKeys: string[];
}

interface LastReconcile {
  root: THREE.Object3D | null;
  assignments: MaterialAssignments;
  zoneSelections: ZoneMaterialSelections;
  materialsApplied: boolean;
  showZones: boolean;
  selectedKeys: string[];
}

function MaterialController({
  sceneRef,
  demoRef,
  hasModel,
  assignments,
  zoneSelections,
  materialsApplied,
  showZones,
  selectedKeys,
}: MaterialControllerProps) {
  const entriesRef = useRef<Map<string, OverrideEntry>>(new Map());
  const lastRef = useRef<LastReconcile | null>(null);

  useFrame(() => {
    const root = hasModel ? sceneRef.current : demoRef.current;
    const last = lastRef.current;
    if (
      last &&
      last.root === root &&
      last.assignments === assignments &&
      last.zoneSelections === zoneSelections &&
      last.materialsApplied === materialsApplied &&
      last.showZones === showZones &&
      last.selectedKeys === selectedKeys
    ) {
      return;
    }

    lastRef.current = {
      root,
      assignments,
      zoneSelections,
      materialsApplied,
      showZones,
      selectedKeys,
    };

    reconcileOverrides(entriesRef.current, {
      root,
      hasModel,
      assignments,
      zoneSelections,
      materialsApplied,
      showZones,
      selectedKeys,
    });
  });

  useEffect(() => {
    const entries = entriesRef.current;
    return () => {
      for (const entry of entries.values()) {
        entry.mesh.material = entry.isArray
          ? entry.originals
          : entry.originals[0];
        for (const clone of entry.clones) {
          clone.dispose();
        }
      }
      entries.clear();
    };
  }, []);

  return null;
}

interface DragItem {
  object: THREE.Object3D;
  startWorld: THREE.Matrix4;
  parentInverse: THREE.Matrix4;
}

interface DragStart {
  pivotMatrix: THREE.Matrix4;
  items: DragItem[];
}

interface TransformControllerProps {
  hasModel: boolean;
  selectedKeys: string[];
  transformMode: "translate" | "rotate" | null;
  snap: SnapConfig;
  transforms: Record<string, TransformState>;
  originals: Record<string, LocalTransform>;
  wallPlanes: WallPlanes;
  room: RoomLayout;
  activeObjects: EditableObjectInfo[];
  sceneApiRef: { current: SceneApi | null };
  onCommit: (patch: Record<string, LocalTransform>) => void;
  onSnap: (message: string) => void;
  onSnapStatus: (status: string | null) => void;
  onSnapResult: (snap: SnapResult | null, guidePoint: [number, number, number] | null) => void;
}

function snapCabinetToWalls(
  objects: THREE.Object3D[],
  wallPlanes: WallPlanes,
): boolean {
  let snapped = false;
  for (const object of objects) {
    object.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(object);
    if (box.isEmpty()) {
      continue;
    }
    const size = box.getSize(new THREE.Vector3());

    if (Math.abs(box.min.y) > 0.001) {
      object.position.y += -box.min.y;
      snapped = true;
    }

    const center = box.getCenter(new THREE.Vector3());
    const snapX = snapNear(center.x, size.x / 2, wallPlanes.x);
    if (snapX !== null) {
      object.position.x += snapX - center.x;
      snapped = true;
    }
    const snapZ = snapNear(center.z, size.z / 2, wallPlanes.z);
    if (snapZ !== null) {
      object.position.z += snapZ - center.z;
      snapped = true;
    }
  }
  return snapped;
}

function snapNear(
  center: number,
  halfSize: number,
  planes: number[],
): number | null {
  let best: number | null = null;
  let bestDistance = Infinity;
  for (const plane of planes) {
    for (const sign of [1, -1]) {
      const face = plane + sign * halfSize;
      const distance = Math.abs(face - center);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = face;
      }
    }
  }
  return best !== null && bestDistance <= 0.6 ? best : null;
}

function TransformController({
  hasModel,
  selectedKeys,
  transformMode,
  snap,
  transforms,
  originals,
  wallPlanes,
  room,
  activeObjects,
  sceneApiRef,
  onCommit,
  onSnap,
  onSnapStatus,
  onSnapResult,
}: TransformControllerProps) {
  const scene = useThree((state) => state.scene);
  const camera = useThree(
    (state) => state.camera,
  ) as THREE.PerspectiveCamera;
  const controls = useThree(
    (state) => state.controls,
  ) as unknown as ControlsHandle | null;
  const dragStartRef = useRef<DragStart | null>(null);
  const lastTransformsRef = useRef<Record<string, TransformState> | null>(null);
  const snapTargetsRef = useRef<SnapTargets | null>(null);
  const snapResultRef = useRef<SnapResult | null>(null);
  const snapCallbacksRef = useRef({ onSnapResult, onSnapStatus });

  const selectedObjects = useMemo(
    () =>
      selectedKeys
        .map((id) => findByAppId(scene, id))
        .filter((object): object is THREE.Object3D => {
          if (!object) {
            return false;
          }
          const id = object.userData.appId as string | undefined;
          return id !== undefined && !transforms[id]?.locked;
        }),
    [scene, selectedKeys, transforms],
  );

  const pivot = useMemo(() => {
    if (transformMode === null || selectedObjects.length < 2) {
      return null;
    }
    const bounds = computeWorldBounds(selectedObjects);
    if (!bounds) {
      return null;
    }
    const group = new THREE.Object3D();
    group.position.set(...bounds.center);
    return group;
  }, [transformMode, selectedObjects]);

  const target = pivot ?? selectedObjects[0] ?? null;
  const enabled = transformMode !== null && target !== null;

  useFrame(() => {
    if (lastTransformsRef.current === transforms) {
      return;
    }
    lastTransformsRef.current = transforms;

    for (const object of collectEditableObjects(scene)) {
      const id = object.userData.appId as string | undefined;
      if (!id) {
        continue;
      }
      const state = transforms[id];
      if (state) {
        object.position.set(...state.position);
        object.rotation.set(...state.rotation);
        object.visible = !state.hidden;
      } else if (originals[id]) {
        object.position.set(...originals[id].position);
        object.rotation.set(...originals[id].rotation);
        object.visible = true;
      }
    }
  });

  useEffect(() => {
    snapCallbacksRef.current = { onSnapResult, onSnapStatus };
  }, [onSnapResult, onSnapStatus]);

  useEffect(() => {
    if (!enabled) {
      snapCallbacksRef.current.onSnapResult(null, null);
      snapCallbacksRef.current.onSnapStatus(null);
    }
    return () => {
      snapCallbacksRef.current.onSnapResult(null, null);
      snapCallbacksRef.current.onSnapStatus(null);
    };
  }, [enabled]);

  useEffect(() => {
    sceneApiRef.current = {
      duplicate(sourceId: string, targetId: string): boolean {
        const object = findByAppId(scene, sourceId);
        if (!object) {
          return false;
        }
        const clone = object.clone(true);
        clone.traverse((child) => {
          child.userData.appId = child.uuid;
          child.userData.editable = true;
        });
        clone.userData.appId = targetId;
        clone.name = `${object.name || object.type} copy`;
        object.parent?.add(clone);
        return true;
      },
      removeObject(appId: string): void {
        const object = findByAppId(scene, appId);
        object?.parent?.remove(object);
      },
      frameSelection(keys: string[]): void {
        const objects = keys
          .map((id) => findByAppId(scene, id))
          .filter((object): object is THREE.Object3D => Boolean(object));
        const bounds = computeWorldBounds(objects);
        if (!bounds || !controls) {
          return;
        }
        const pose = computeHomePose(bounds);
        camera.position.set(...pose.position);
        controls.target.set(...pose.target);
        controls.update();
      },
      frameRoom(bounds): void {
        if (!controls) {
          return;
        }
        const pose = computeHomePose(bounds);
        camera.position.set(...pose.position);
        controls.target.set(...pose.target);
        controls.update();
      },
    };
  }, [scene, camera, controls, sceneApiRef]);

  function handleMouseDown() {
    snapTargetsRef.current = buildSnapTargets(
      room,
      activeObjects,
      transforms,
      selectedKeys,
    );
    if (pivot) {
      pivot.updateWorldMatrix(true, false);
      const items: DragItem[] = [];
      for (const object of selectedObjects) {
        object.updateWorldMatrix(true, false);
        const parentInverse = object.parent
          ? object.parent.matrixWorld.clone().invert()
          : new THREE.Matrix4();
        items.push({
          object,
          startWorld: object.matrixWorld.clone(),
          parentInverse,
        });
      }
      dragStartRef.current = { pivotMatrix: pivot.matrixWorld.clone(), items };
    }
  }

  function handleObjectChange() {
    const start = dragStartRef.current;
    if (start && pivot) {
      pivot.updateWorldMatrix(true, false);
      const delta = start.pivotMatrix
        .clone()
        .invert()
        .multiply(pivot.matrixWorld);
      for (const item of start.items) {
        applyWorldDelta(item.object, delta, item.startWorld, item.parentInverse);
      }
    }
    applySnap();
  }

  function applySnap() {
    const targets = snapTargetsRef.current;
    if (!targets || selectedObjects.length === 0) {
      return;
    }

    const sizeById = new Map(
      activeObjects.map((object) => [object.id, object.size] as const),
    );
    const points: [number, number][] = [];
    for (const object of selectedObjects) {
      object.updateWorldMatrix(true, false);
      const id = object.userData.appId as string | undefined;
      const size = id ? sizeById.get(id) : undefined;
      if (!size) {
        continue;
      }
      const halfW = size[0] / 2;
      const halfD = size[2] / 2;
      const local: [number, number][] = [
        [-halfW, -halfD],
        [halfW, -halfD],
        [halfW, halfD],
        [-halfW, halfD],
      ];
      for (const [x, z] of local) {
        const vector = new THREE.Vector3(x, 0, z);
        object.localToWorld(vector);
        points.push([vector.x, vector.z]);
      }
    }
    if (points.length === 0) {
      return;
    }

    const footprint = convexHullFootprint(points);
    const result = computeSnap(footprint, targets, snap);

    if (result.correction.x !== 0 || result.correction.z !== 0) {
      const correctionTarget = pivot ?? selectedObjects[0];
      if (correctionTarget) {
        correctionTarget.position.set(
          correctionTarget.position.x + result.correction.x,
          correctionTarget.position.y,
          correctionTarget.position.z + result.correction.z,
        );
      }
    }

    snapResultRef.current = result.match ? result : null;
    const guidePoint: [number, number, number] = [
      footprint.center[0],
      selectedObjects[0].getWorldPosition(new THREE.Vector3()).y,
      footprint.center[1],
    ];
    onSnapResult(result.match ? result : null, guidePoint);
    onSnapStatus(
      result.match
        ? result.status
        : snap.enabled
          ? `Grid: ${snap.translationInches}"`
          : "Snap off",
    );
  }

  function handleMouseUp() {
    const start = dragStartRef.current;
    const patch: Record<string, LocalTransform> = {};
    const objects: THREE.Object3D[] = [];

    if (pivot && start) {
      for (const item of start.items) {
        const id = item.object.userData.appId as string | undefined;
        if (id) {
          objects.push(item.object);
        }
      }
    } else if (target) {
      const id = target.userData.appId as string | undefined;
      if (id) {
        objects.push(target);
      }
    }

    if (!hasModel && snapCabinetToWalls(objects, wallPlanes)) {
      onSnap("Snapped to floor / wall");
    }

    for (const object of objects) {
      const id = object.userData.appId as string;
      patch[id] = readLocalTransform(object);
    }

    dragStartRef.current = null;
    snapTargetsRef.current = null;
    snapResultRef.current = null;
    onSnapResult(null, null);
    onSnapStatus(null);
    if (Object.keys(patch).length > 0) {
      onCommit(patch);
    }
  }

  return (
    <>
      {pivot ? <primitive object={pivot} /> : null}
      {enabled ? (
        <TransformControls
          object={target}
          enabled={enabled}
          mode={transformMode ?? "translate"}
          space="world"
          translationSnap={null}
          rotationSnap={
            snap.enabled
              ? THREE.MathUtils.degToRad(snap.rotationDegrees)
              : null
          }
          onMouseDown={handleMouseDown}
          onObjectChange={handleObjectChange}
          onMouseUp={handleMouseUp}
        />
      ) : null}
    </>
  );
}

function SceneCanvas({
  settings,
  commandRef,
  focus,
  gridOrigin,
  modelScene,
  modelSceneRef,
  hasModel,
  onSelectObject,
  assignments,
  zoneSelections,
  materialsApplied,
  showZones,
  selectedKeys,
  room,
  presenting,
  viewMode,
  selectedWallId,
  endpointTolerance,
  onSelectWall,
  onSelectOpening,
  onWallPreview,
  onWallCommit,
  onWallCancel,
  onWallDragStart,
  onWallStatus,
  onWallDraggingChange,
  dimensions,
  activeObjects,
  onSnapStatus,
  plan,
  pdfDocument,
  onUnderlayDragStart,
  onUnderlayPreview,
  onUnderlayCommit,
  onUnderlayCancel,
  onUnderlayStatus,
  onUnderlayDraggingChange,
  importTransform,
  transforms,
  originals,
  transformMode,
  snap,
  wallPlanes,
  sceneApiRef,
  onCommitTransforms,
  onSnap,
  previewRoom,
  reviewing,
  cabinetInstances,
  selectedCabinetIds,
  onSelectCabinet,
  onCabinetMoveCommit,
  onCabinetMoveStart,
  onCabinetMovePreview,
  onCabinetMoveCancel,
  onCabinetRotateCommit,
  onCabinetRotateStart,
  onCabinetRotatePreview,
  cabinetRunPreview,
}: SceneCanvasProps) {
  const [ready, setReady] = useState(false);
  const [wallDragging, setWallDragging] = useState(false);
  const [snapResult, setSnapResult] = useState<SnapResult | null>(null);
  const [snapGuidePoint, setSnapGuidePoint] = useState<
    [number, number, number] | null
  >(null);
  const [underlayDragging, setUnderlayDragging] = useState(false);
  const [cabinetDragging, setCabinetDragging] = useState(false);
  const demoRef = useRef<THREE.Group | null>(null);
  const cabinetRegistryRef = useRef(new Map<string, THREE.Group>());

  const minDistance = Math.max(focus.radius * 0.05, 0.05);
  const maxDistance = Math.max(focus.radius * 8, 8);

  return (
    <SceneErrorBoundary>
      <div className="absolute inset-0">
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          camera={{
            position: demoCameraPresets.home.position,
            fov: 42,
            near: 0.1,
            far: 120,
          }}
          onCreated={() => setReady(true)}
        >
          <BackgroundColor color={backgroundColors[settings.background]} />
          <SceneLights />
          <CameraClipPlanes focus={focus} />

          <RoomRenderer
            room={room}
            showFloor={!plan.hideFloor}
            variant={reviewing ? "subdued" : "solid"}
          />
          {previewRoom ? (
            <RoomRenderer room={previewRoom} showFloor={false} variant="preview" />
          ) : null}
          <DimensionOverlay items={dimensions} />
          <SnapGuides
            snap={snapResult}
            guidePoint={snapGuidePoint}
            presenting={presenting}
          />
          <PlanUnderlay
            document={pdfDocument}
            selectedPage={plan.selectedPage}
            pageRotation={plan.pageRotation}
            calibration={plan.calibration}
            underlay={plan.underlay}
            floorY={room.floorY}
            viewMode={viewMode}
            presenting={presenting}
            alignMode={plan.alignMode}
            snap={snap}
            onDragStart={onUnderlayDragStart}
            onPreview={onUnderlayPreview}
            onCommit={onUnderlayCommit}
            onCancel={onUnderlayCancel}
            onStatus={onUnderlayStatus}
            onDraggingChange={(dragging) => {
              setUnderlayDragging(dragging);
              onUnderlayDraggingChange(dragging);
            }}
          />

          {hasModel && modelScene ? (
            <group
              position={importTransform.position}
              rotation={importTransform.rotation}
              scale={importTransform.scale}
            >
              <ImportedModel scene={modelScene} />
            </group>
          ) : (
            <group ref={demoRef}>
              <DemoKitchen />
            </group>
          )}

          {Object.values(cabinetInstances).map((cabinet) => (
            (() => {
              const zone = cabinet.finishZone;
              const finish =
                materialsApplied && zone
                  ? (() => {
                      const id = zoneSelections[zone];
                      const material = id
                        ? materialsByZone[zone]?.find((m) => m.id === id)
                        : null;
                      return material ?? null;
                    })()
                  : null;
              const hardware =
                materialsApplied && zoneSelections.hardware
                  ? materialsByZone.hardware.find(
                      (m) => m.id === zoneSelections.hardware,
                    ) ?? null
                  : null;
              return (
                <ParametricCabinet
                  key={cabinet.id}
                  instance={cabinet}
                  selected={selectedCabinetIds.includes(cabinet.id)}
                  onSelect={presenting ? () => {} : onSelectCabinet}
                  onRegisterObject={(id, object) => {
                    if (object) cabinetRegistryRef.current.set(id, object);
                    else cabinetRegistryRef.current.delete(id);
                  }}
                  materials={{
                    box: finish ?? { color: "#e8e2d7", roughness: 0.75, metalness: 0.05 },
                    front: finish ?? { color: "#c9b99a", roughness: 0.55, metalness: 0.05 },
                    hardware: hardware ?? { color: "#4a4a4a", roughness: 0.35, metalness: 0.7 },
                  }}
                />
              );
            })()
          ))}

          {cabinetRunPreview?.map((cabinet) => (
            <mesh
              key={`preview-${cabinet.id}`}
              position={cabinet.position}
              rotation={cabinet.rotation}
              raycast={() => null}
            >
              <boxGeometry args={[cabinet.widthM, cabinet.heightM, cabinet.depthM]} />
              <meshStandardMaterial color="#38bdf8" transparent opacity={0.35} depthWrite={false} />
            </mesh>
          ))}

          {settings.showGrid ? <KitchenGrid position={gridOrigin} /> : null}
          <OrbitControls
            makeDefault
            enabled={!wallDragging && !underlayDragging && !cabinetDragging}
            enableDamping={false}
            enablePan
            minDistance={minDistance}
            maxDistance={maxDistance}
            minPolarAngle={0.1}
            maxPolarAngle={Math.PI / 2 - 0.03}
            target={demoCameraPresets.home.target}
          />
          <CameraRig commandRef={commandRef} focus={focus} />
          <ShadowController enabled={settings.showShadows} />
          <InteractionHandler
            hasModel={hasModel}
            onSelectObject={onSelectObject}
            onSelectWall={onSelectWall}
            onSelectOpening={onSelectOpening}
          />
          <WallEndpointHandles
            room={room}
            selectedWallId={selectedWallId}
            snap={snap}
            tolerance={endpointTolerance}
            viewMode={viewMode}
            presenting={presenting}
            transformMode={
              selectedCabinetIds.length === 1 ? null : transformMode
            }
            onDragStart={onWallDragStart}
            onPreview={onWallPreview}
            onCommit={onWallCommit}
            onCancel={onWallCancel}
            onStatus={onWallStatus}
            onDraggingChange={(dragging) => {
              setWallDragging(dragging);
              onWallDraggingChange(dragging);
            }}
          />
          <MaterialController
            sceneRef={modelSceneRef}
            demoRef={demoRef}
            hasModel={hasModel}
            assignments={assignments}
            zoneSelections={zoneSelections}
            materialsApplied={materialsApplied}
            showZones={showZones}
            selectedKeys={selectedKeys}
          />
          <TransformController
            hasModel={hasModel}
            selectedKeys={selectedKeys}
            transformMode={transformMode}
            snap={snap}
            transforms={transforms}
            originals={originals}
            wallPlanes={wallPlanes}
            room={room}
            activeObjects={activeObjects}
            sceneApiRef={sceneApiRef}
            onCommit={onCommitTransforms}
            onSnap={onSnap}
            onSnapStatus={onSnapStatus}
            onSnapResult={(result, point) => {
              setSnapResult(result);
              setSnapGuidePoint(point);
            }}
          />
          {selectedCabinetIds.length === 1 &&
          (transformMode === "translate" || transformMode === "rotate") &&
          !presenting
            ? (() => {
                const cabinet = cabinetInstances[selectedCabinetIds[0]];
                return cabinet && !cabinet.hidden && !cabinet.locked ? (
                  <CabinetTransformController
                    cabinet={cabinet}
                    mode={transformMode as "translate" | "rotate"}
                    onCommit={onCabinetMoveCommit}
                    onRotateCommit={onCabinetRotateCommit}
                    onRotateStart={onCabinetRotateStart}
                    onRotatePreview={onCabinetRotatePreview}
                    rotationSnap={
                      snap.enabled
                        ? THREE.MathUtils.degToRad(snap.rotationDegrees)
                        : null
                    }
                    onDraggingChange={setCabinetDragging}
                    onStart={onCabinetMoveStart}
                    onPreview={onCabinetMovePreview}
                    onCancel={onCabinetMoveCancel}
                    allCabinets={cabinetInstances}
                    snapConfig={snap}
                    onSnapStatus={onSnapStatus}
                    room={room}
                    onSnapResult={(result) => {
                      setSnapResult(result);
                      setSnapGuidePoint(result ? cabinet.position : null);
                    }}
                  />
                ) : null;
              })()
            : null}
        </Canvas>

        {!ready ? (
          <div className="absolute inset-0 flex items-center justify-center bg-zinc-50 text-sm text-zinc-500">
            Preparing 3D workspace…
          </div>
        ) : null}
      </div>
    </SceneErrorBoundary>
  );
}

export default memo(SceneCanvas);
