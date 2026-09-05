"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CameraCommand } from "@/lib/studio/types";
import type { SavedCameraPose } from "@/lib/studio/simple-camera";

interface ControlsHandle {
  target: THREE.Vector3;
  update: () => void;
  addEventListener: (type: string, listener: (event: Event) => void) => void;
  removeEventListener: (type: string, listener: (event: Event) => void) => void;
}

interface SimpleImportedCameraControllerProps {
  commandRef: { current: CameraCommand | null };
  modelIdentity: string;
  savedPose: SavedCameraPose | null;
  onPoseChange: (pose: SavedCameraPose) => void;
  onUserStart: () => void;
  onUserEnd: () => void;
  onWrite: (reason: string, detail: Record<string, unknown>) => void;
}

export default function SimpleImportedCameraController({
  commandRef,
  modelIdentity,
  savedPose,
  onPoseChange,
  onUserStart,
  onUserEnd,
  onWrite,
}: SimpleImportedCameraControllerProps) {
  const camera = useThree((state) => state.camera);
  const controls = useThree((state) => state.controls) as unknown as
    | ControlsHandle
    | null;
  const appliedIdentityRef = useRef<string | null>(null);
  const handledCommandRef = useRef<number | CameraCommand | null>(null);

  useEffect(() => {
    if (!controls) {
      return;
    }

    const handleStart = () => {
      onUserStart();
    };
    const handleEnd = () => {
      onUserEnd();
      onPoseChange({
        modelIdentity,
        position: [
          camera.position.x,
          camera.position.y,
          camera.position.z,
        ],
        target: [controls.target.x, controls.target.y, controls.target.z],
        up: [camera.up.x, camera.up.y, camera.up.z],
      });
    };

    controls.addEventListener("start", handleStart);
    controls.addEventListener("end", handleEnd);
    return () => {
      controls.removeEventListener("start", handleStart);
      controls.removeEventListener("end", handleEnd);
    };
  }, [camera, controls, modelIdentity, onPoseChange, onUserEnd, onUserStart]);

  useFrame(() => {
    if (!controls) {
      return;
    }

    if (
      savedPose &&
      savedPose.modelIdentity === modelIdentity &&
      appliedIdentityRef.current !== modelIdentity
    ) {
      appliedIdentityRef.current = modelIdentity;
      camera.position.set(...savedPose.position);
      camera.up.set(...savedPose.up);
      controls.target.set(...savedPose.target);
      controls.update();
      onWrite("restore", {
        modelIdentity,
        position: savedPose.position,
        target: savedPose.target,
      });
      return;
    }

    const command = commandRef.current;
    const commandKey = command?.id !== undefined ? command.id : command;
    if (command && commandKey !== handledCommandRef.current) {
      handledCommandRef.current = commandKey;
      commandRef.current = null;
      camera.position.set(
        command.position[0],
        command.position[1],
        command.position[2],
      );
      controls.target.set(
        command.target[0],
        command.target[1],
        command.target[2],
      );
      controls.update();
      onPoseChange({
        modelIdentity,
        position: command.position,
        target: command.target,
        up: [camera.up.x, camera.up.y, camera.up.z],
      });
      onWrite(`preset:${command.view}`, {
        modelIdentity,
        position: command.position,
        target: command.target,
      });
    }
  });

  return null;
}
