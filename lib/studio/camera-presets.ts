import type {
  BackgroundPreset,
  CameraView,
  StudioFocus,
  StudioSettings,
} from "./types";

export interface CameraPreset {
  position: [number, number, number];
  target: [number, number, number];
  duration: number;
}

export const demoCameraPresets: Record<CameraView, CameraPreset> = {
  home: {
    position: [5.2, 3.4, 5.4],
    target: [0, 0.9, -0.4],
    duration: 1.2,
  },
  front: {
    position: [0, 1.4, 5.4],
    target: [0, 1.1, -0.4],
    duration: 1.2,
  },
  left: {
    position: [-5.4, 1.4, -0.4],
    target: [0, 1.1, -0.4],
    duration: 1.2,
  },
  right: {
    position: [5.4, 1.4, -0.4],
    target: [0, 1.1, -0.4],
    duration: 1.2,
  },
  top: {
    position: [0.01, 6.2, 0.7],
    target: [0, 0, -0.4],
    duration: 1.2,
  },
};

export const demoFocus: StudioFocus = {
  center: [0, 0.9, -0.4],
  radius: 3.6,
};

export const backgroundColors: Record<BackgroundPreset, string> = {
  light: "#f4f4f5",
  warm: "#efe7db",
  dark: "#18181b",
};

export const defaultSettings: StudioSettings = {
  showGrid: true,
  showShadows: true,
  background: "light",
};
