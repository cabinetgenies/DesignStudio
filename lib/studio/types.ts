export type CameraView = "home" | "front" | "left" | "right" | "top";

export type BackgroundPreset = "light" | "warm" | "dark";

export interface StudioSettings {
  showGrid: boolean;
  showShadows: boolean;
  background: BackgroundPreset;
}

export interface CameraCommand {
  id?: number;
  view: CameraView;
  position: [number, number, number];
  target: [number, number, number];
  duration: number;
}

export interface StudioFocus {
  center: [number, number, number];
  radius: number;
}

export interface ModelBounds {
  center: [number, number, number];
  size: [number, number, number];
  min: [number, number, number];
  max: [number, number, number];
}

export interface ModelInfo {
  rootName: string;
  meshCount: number;
  groupCount: number;
  materialCount: number;
  bounds: ModelBounds;
}

export interface SceneNodeInfo {
  id: string;
  name: string;
  type: string;
  isMesh: boolean;
  hasMaterial: boolean;
  meshCount: number;
  children: SceneNodeInfo[];
}
