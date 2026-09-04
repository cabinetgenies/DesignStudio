export type CameraView = "home" | "front" | "left" | "right" | "top";

export type BackgroundPreset = "light" | "warm" | "dark";

export interface StudioSettings {
  showGrid: boolean;
  showShadows: boolean;
  background: BackgroundPreset;
}
