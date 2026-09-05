export interface PlanPageMeta {
  pageNumber: number;
  widthPt: number;
  heightPt: number;
}

export interface PlanCalibration {
  pageNumber: number;
  pointA: { x: number; y: number };
  pointB: { x: number; y: number };
  realDistanceMeters: number;
  pixelsPerMeter: number;
  confirmed: boolean;
  assisted?: {
    candidateId: string;
    source: "native-pdf-text" | "raster-ocr" | "combined";
  };
}

export interface PlanUnderlayAlignment {
  position: { x: number; z: number };
  rotation: number;
  opacity: number;
  visible: boolean;
}

export interface PlanState {
  fileName: string | null;
  fileSize: number | null;
  pageCount: number;
  selectedPage: number;
  pageRotation: number;
  pageOpacity: number;
  alignMode: boolean;
  hideFloor: boolean;
  calibration: PlanCalibration | null;
  underlay: PlanUnderlayAlignment;
}

export const DEFAULT_UNDERLAY_ALIGNMENT: PlanUnderlayAlignment = {
  position: { x: 0, z: 0 },
  rotation: 0,
  opacity: 0.5,
  visible: false,
};

export const DEFAULT_PLAN_STATE: PlanState = {
  fileName: null,
  fileSize: null,
  pageCount: 0,
  selectedPage: 1,
  pageRotation: 0,
  pageOpacity: 0.7,
  alignMode: false,
  hideFloor: false,
  calibration: null,
  underlay: DEFAULT_UNDERLAY_ALIGNMENT,
};
