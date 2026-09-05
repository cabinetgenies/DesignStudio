import type { PlanCalibration } from "./plan";

export interface CalibrationValidation {
  valid: boolean;
  severity: "ok" | "warning" | "error";
  code: string;
  message: string;
}

interface PageDimensions {
  widthPt: number;
  heightPt: number;
}

export function validateCalibration(
  calibration: PlanCalibration | null,
  activePage: number,
  pageDimensions: PageDimensions | null,
): CalibrationValidation {
  if (!calibration) {
    return {
      valid: false,
      severity: "error",
      code: "missing",
      message: "Scale requires calibration.",
    };
  }
  if (calibration.pageNumber !== activePage) {
    return {
      valid: false,
      severity: "error",
      code: "page-mismatch",
      message: "Calibration belongs to a different page.",
    };
  }
  if (!pageDimensions || pageDimensions.widthPt <= 0 || pageDimensions.heightPt <= 0) {
    return {
      valid: false,
      severity: "error",
      code: "no-dimensions",
      message: "Page dimensions are unavailable.",
    };
  }

  const dx = calibration.pointB.x - calibration.pointA.x;
  const dy = calibration.pointB.y - calibration.pointA.y;
  const pixelDistance = Math.hypot(dx, dy);
  if (!Number.isFinite(pixelDistance) || pixelDistance <= 4) {
    return {
      valid: false,
      severity: "error",
      code: "points-too-close",
      message: "Calibration points are too close together.",
    };
  }
  if (!Number.isFinite(calibration.realDistanceMeters) || calibration.realDistanceMeters <= 0) {
    return {
      valid: false,
      severity: "error",
      code: "invalid-distance",
      message: "Enter a positive real-world distance.",
    };
  }
  if (!Number.isFinite(calibration.pixelsPerMeter) || calibration.pixelsPerMeter <= 0) {
    return {
      valid: false,
      severity: "error",
      code: "non-finite-scale",
      message: "The calculated scale is not finite.",
    };
  }

  // Broad plausibility window; intentionally not a single fixed architectural scale.
  if (calibration.pixelsPerMeter < 5 || calibration.pixelsPerMeter > 20000) {
    return {
      valid: true,
      severity: "warning",
      code: "implausible-scale",
      message: "The calculated scale appears implausible.",
    };
  }

  return {
    valid: true,
    severity: "ok",
    code: "ok",
    message: "Calibration is valid.",
  };
}
