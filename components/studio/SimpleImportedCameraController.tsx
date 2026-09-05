"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import * as THREE from "three";
import type { CameraCommand, StudioFocus } from "@/lib/studio/types";

interface ControlsHandle {
  target: THREE.Vector3;
  update: () => void;
}

interface SimpleImportedCameraControllerProps {
  focus: StudioFocus;
  commandRef: { current: CameraCommand | null };
  modelIdentity: string;
}

const DEBUG = process.env.NODE_ENV !== "production";

function writeMark(reason: string, detail: unknown) {
  if (!DEBUG) {
    return;
  }
  console.debug(`[SimpleImportedCameraController:write]`, {
    reason,
    ...(detail as object),
  });
}

export default function SimpleImportedCameraController({
  focus,
  commandRef,
  modelIdentity,
}: SimpleImportedCameraControllerProps) {
  const camera = useThree((state) => state.camera);
  const initializedIdentityRef = useRef<string | null>(null);
  const handledCommandRef = useRef<number | CameraCommand | null>(null);

  useEffect(() => {
    if (DEBUG) {
      console.debug("[SimpleImportedCameraController:mount]", {
        modelIdentity,
      });
    }
    return () => {
      if (DEBUG) {
        console.debug("[SimpleImportedCameraController:unmount]", {
          modelIdentity,
        });
      }
    };
  }, [modelIdentity]);

  useFrame((state) => {
    const controls = state.controls as unknown as ControlsHandle | null;
    if (!controls) {
      return;
    }

    if (
      modelIdentity &&
      initializedIdentityRef.current !== modelIdentity
    ) {
      initializedIdentityRef.current = modelIdentity;
      const targetY = focus.center[1] + focus.radius * 0.35;
      const target = new THREE.Vector3(
        focus.center[0],
        targetY,
        focus.center[2],
      );
      const position = new THREE.Vector3(
        focus.center[0] + focus.radius * 1.8,
        focus.center[1] + focus.radius * 0.9,
        focus.center[2] + focus.radius * 1.8,
      );
      camera.position.copy(position);
      controls.target.copy(target);
      controls.update();
      writeMark("initialization", {
        modelIdentity,
        position: position.toArray(),
        target: target.toArray(),
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
      writeMark(`preset:${command.view}`, {
        modelIdentity,
        position: command.position,
        target: command.target,
      });
    }
  });

  return null;
}
