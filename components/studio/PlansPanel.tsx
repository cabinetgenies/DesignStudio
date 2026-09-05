"use client";

import { useRef } from "react";
import { formatBytes } from "@/lib/utils";
import type {
  PlanCalibration,
  PlanState,
  PlanUnderlayAlignment,
} from "@/lib/studio/plan";
import { validateCalibration } from "@/lib/studio/calibration-validation";
import { formatFeetInches } from "@/lib/studio/transforms";
import { feetToMeters, metersToFeet } from "@/lib/studio/transforms";

interface PlansPanelProps {
  plan: PlanState;
  calibration: PlanCalibration | null;
  pageDimensions: { widthPt: number; heightPt: number } | null;
  onReplaceFile: (file: File) => void;
  onRemove: () => void;
  onUnderlay: (patch: Partial<PlanUnderlayAlignment>) => void;
  onResetUnderlay: () => void;
  onConfirmCalibration: () => void;
  alignMode: boolean;
  hideFloor: boolean;
  onAlignMode: (value: boolean) => void;
  onHideFloor: (value: boolean) => void;
  onCenterUnderlay: () => void;
  onAlignToOrigin: () => void;
}

function workflowStatus(plan: PlanState): string {
  if (!plan.fileName) {
    return "No plan uploaded";
  }
  if (!plan.calibration) {
    return "Select plan page";
  }
  if (!plan.calibration.confirmed) {
    return "Scale ready to confirm";
  }
  if (!plan.underlay.visible) {
    return "Underlay ready";
  }
  return "Underlay aligned";
}

export default function PlansPanel({
  plan,
  calibration,
  pageDimensions,
  onReplaceFile,
  onRemove,
  onUnderlay,
  onResetUnderlay,
  onConfirmCalibration,
  alignMode,
  hideFloor,
  onAlignMode,
  onHideFloor,
  onCenterUnderlay,
  onAlignToOrigin,
}: PlansPanelProps) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const validation = validateCalibration(
    calibration,
    plan.selectedPage,
    pageDimensions,
  );

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            onReplaceFile(file);
          }
          event.target.value = "";
        }}
        className="hidden"
      />
      <div className="rounded-md bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
        <p>
          <span className="font-medium text-zinc-800">Status:</span>{" "}
          {workflowStatus(plan)}
        </p>
        {plan.fileName ? (
          <p className="mt-1 truncate">
            {plan.fileName}
            {plan.fileSize != null ? ` · ${formatBytes(plan.fileSize)}` : ""}
          </p>
        ) : null}
        {plan.pageCount > 0 ? (
          <p>
            Page {plan.selectedPage} of {plan.pageCount}
          </p>
        ) : null}
        {calibration?.confirmed ? (
          <p>
            Scale: 1px = {formatFeetInches(1 / calibration.pixelsPerMeter)}
          </p>
        ) : null}
        {calibration && !calibration.confirmed ? (
          <>
            {validation.severity === "warning" ? (
              <p className="mt-2 text-xs font-medium text-amber-600">
                {validation.message}
              </p>
            ) : validation.severity === "error" ? (
              <p className="mt-2 text-xs font-medium text-red-600">
                {validation.message}
              </p>
            ) : null}
            <button
              type="button"
              onClick={onConfirmCalibration}
              disabled={validation.severity === "error"}
              className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-md bg-zinc-900 px-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-300 disabled:text-zinc-500"
            >
              {validation.severity === "warning"
                ? "Confirm Anyway"
                : "Confirm Scale"}
            </button>
          </>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Replace PDF
        </button>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-8 items-center justify-center rounded-md border border-red-200 bg-white px-2 text-xs font-medium text-red-600 hover:bg-red-50"
        >
          Remove PDF
        </button>
      </div>

      <div className="border-t border-zinc-100 pt-3">
        <p className="mb-2 text-[11px] font-medium text-zinc-500">Underlay</p>
        <label className="flex cursor-pointer items-center justify-between py-1.5">
          <span className="text-sm text-zinc-700">Visible</span>
          <input
            type="checkbox"
            checked={plan.underlay.visible}
            onChange={(event) => onUnderlay({ visible: event.target.checked })}
            className="accent-zinc-900"
          />
        </label>
        <label className="block py-1.5">
          <span className="text-sm text-zinc-700">Opacity</span>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={plan.underlay.opacity}
            onChange={(event) =>
              onUnderlay({ opacity: Number(event.target.value) })
            }
            className="mt-1 w-full"
          />
        </label>
        <label className="block py-1.5">
          <span className="text-sm text-zinc-700">Rotation</span>
          <input
            type="number"
            step={15}
            value={Number((plan.underlay.rotation * 180) / Math.PI).toFixed(0)}
            onChange={(event) => {
              const degrees = Number.parseFloat(event.target.value);
              if (Number.isFinite(degrees)) {
                onUnderlay({ rotation: (degrees * Math.PI) / 180 });
              }
            }}
            className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-2 py-1.5">
          <label className="block">
            <span className="text-sm text-zinc-700">X</span>
            <input
              type="number"
              step={0.05}
              value={Number(metersToFeet(plan.underlay.position.x).toFixed(2))}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                if (Number.isFinite(value)) {
                  onUnderlay({
                    position: {
                      x: feetToMeters(value),
                      z: plan.underlay.position.z,
                    },
                  });
                }
              }}
              className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="text-sm text-zinc-700">Z</span>
            <input
              type="number"
              step={0.05}
              value={Number(metersToFeet(plan.underlay.position.z).toFixed(2))}
              onChange={(event) => {
                const value = Number.parseFloat(event.target.value);
                if (Number.isFinite(value)) {
                  onUnderlay({
                    position: {
                      x: plan.underlay.position.x,
                      z: feetToMeters(value),
                    },
                  });
                }
              }}
              className="mt-1 h-8 w-full rounded-md border border-zinc-200 px-2 text-sm"
            />
          </label>
        </div>
        <button
          type="button"
          onClick={onResetUnderlay}
          className="mt-2 inline-flex h-8 w-full items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Reset Alignment
        </button>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onAlignMode(!alignMode)}
            className={`inline-flex h-8 items-center justify-center rounded-md px-2 text-xs font-medium ${
              alignMode
                ? "bg-zinc-900 text-white hover:bg-zinc-800"
                : "border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
            }`}
          >
            {alignMode ? "Finish Alignment" : "Align Underlay"}
          </button>
          <button
            type="button"
            onClick={onCenterUnderlay}
            className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Center Underlay
          </button>
          <button
            type="button"
            onClick={onAlignToOrigin}
            className="inline-flex h-8 items-center justify-center rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Align to Origin
          </button>
          <label className="flex h-8 cursor-pointer items-center justify-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50">
            <input
              type="checkbox"
              checked={hideFloor}
              onChange={(event) => onHideFloor(event.target.checked)}
              className="accent-zinc-900"
            />
            Hide Floor
          </label>
        </div>
      </div>
    </div>
  );
}
