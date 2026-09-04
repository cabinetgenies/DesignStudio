"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Grid, OrbitControls } from "@react-three/drei";
import {
  Component,
  memo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import * as THREE from "three";
import { backgroundColors, cameraPresets } from "@/lib/studio/camera-presets";
import type { CameraView, StudioSettings } from "@/lib/studio/types";
import DemoKitchen from "./DemoKitchen";

interface SceneCanvasProps {
  settings: StudioSettings;
  commandRef: { current: CameraView | null };
}

type ControlsHandle = {
  target: THREE.Vector3;
  update: () => void;
};

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

function KitchenGrid() {
  return (
    <Grid
      position={[0, 0.01, 0]}
      args={[40, 40]}
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
  commandRef: { current: CameraView | null };
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

function CameraRig({ commandRef }: CameraRigProps) {
  const animation = useRef<CameraAnimation | null>(null);

  useFrame((state, delta) => {
    const controls = state.controls as unknown as ControlsHandle | null;
    if (!controls) {
      return;
    }

    const command = commandRef.current;
    if (command) {
      commandRef.current = null;
      const preset = cameraPresets[command];
      animation.current = {
        fromPosition: state.camera.position.clone(),
        toPosition: new THREE.Vector3(...preset.position),
        fromTarget: controls.target.clone(),
        toTarget: new THREE.Vector3(...preset.target),
        elapsed: 0,
        duration: preset.duration,
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

    controls.target.x = THREE.MathUtils.clamp(controls.target.x, -4, 4);
    controls.target.y = THREE.MathUtils.clamp(controls.target.y, 0, 2.4);
    controls.target.z = THREE.MathUtils.clamp(controls.target.z, -4, 4);
  });

  return null;
}

function SceneCanvas({
  settings,
  commandRef,
}: SceneCanvasProps) {
  const [ready, setReady] = useState(false);

  return (
    <SceneErrorBoundary>
      <div className="absolute inset-0">
        <Canvas
          shadows="soft"
          dpr={[1, 2]}
          camera={{
            position: cameraPresets.home.position,
            fov: 42,
            near: 0.1,
            far: 120,
          }}
          onCreated={() => setReady(true)}
        >
          <BackgroundColor color={backgroundColors[settings.background]} />
          <SceneLights />
          <DemoKitchen />
          {settings.showGrid ? <KitchenGrid /> : null}
          <OrbitControls
            makeDefault
            enableDamping={false}
            enablePan
            minDistance={1.2}
            maxDistance={15}
            minPolarAngle={0.1}
            maxPolarAngle={Math.PI / 2 - 0.03}
            target={cameraPresets.home.target}
          />
          <CameraRig commandRef={commandRef} />
          <ShadowController enabled={settings.showShadows} />
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
