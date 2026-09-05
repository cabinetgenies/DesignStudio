"use client";

import type { CabinetFrontType, CabinetInstance } from "@/lib/studio/cabinet";
import { feetToMeters, metersToFeet } from "@/lib/studio/transforms";

function Field({
  label,
  value,
  suffix,
  onCommit,
  disabled,
}: {
  label: string;
  value: number;
  suffix: string;
  onCommit: (value: number) => void;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] text-zinc-500">{label} ({suffix})</span>
      <input
        type="number"
        disabled={disabled}
        step="any"
        defaultValue={Number(value.toFixed(3))}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onCommit(n);
        }}
        className="mt-0.5 h-7 w-full rounded-md border border-zinc-200 px-2 text-xs"
      />
    </label>
  );
}

export default function CabinetInspector({
  cabinet,
  onUpdate,
  onDuplicate,
  onReset,
  onToggleLock,
  onHide,
  onRename,
  disabled,
}: {
  cabinet: CabinetInstance;
  onUpdate: (id: string, patch: Partial<CabinetInstance>) => void;
  onDuplicate: (id: string) => void;
  onReset: (id: string) => void;
  onToggleLock: (id: string) => void;
  onHide: (id: string) => void;
  onRename: (id: string, name: string) => void;
  disabled?: boolean;
}) {
  const ft = metersToFeet;
  const deg = (rad: number) => (rad * 180) / Math.PI;
  const rad = (deg: number) => (deg * Math.PI) / 180;
  return (
    <div className="space-y-3">
      <div>
        <p className="text-xs font-semibold text-zinc-800">{cabinet.name}</p>
        <p className="text-[11px] text-zinc-500">
          {cabinet.catalogId} · {cabinet.category}
        </p>
      </div>
      <input
        type="text"
        defaultValue={cabinet.name}
        disabled={disabled}
        onBlur={(e) => onRename(cabinet.id, e.target.value.trim())}
        className="h-7 w-full rounded-md border border-zinc-200 px-2 text-xs"
      />
      <div className="grid grid-cols-3 gap-2">
        <Field disabled={disabled} label="W" value={ft(cabinet.widthM)} suffix="ft" onCommit={(v) => onUpdate(cabinet.id, { widthM: feetToMeters(v) })} />
        <Field disabled={disabled} label="H" value={ft(cabinet.heightM)} suffix="ft" onCommit={(v) => onUpdate(cabinet.id, { heightM: feetToMeters(v) })} />
        <Field disabled={disabled} label="D" value={ft(cabinet.depthM)} suffix="ft" onCommit={(v) => onUpdate(cabinet.id, { depthM: feetToMeters(v) })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field disabled={disabled} label="X" value={cabinet.position[0]} suffix="m" onCommit={(v) => onUpdate(cabinet.id, { position: [v, cabinet.position[1], cabinet.position[2]] })} />
        <Field disabled={disabled} label="Y" value={cabinet.position[1]} suffix="m" onCommit={(v) => onUpdate(cabinet.id, { position: [cabinet.position[0], v, cabinet.position[2]] })} />
        <Field disabled={disabled} label="Z" value={cabinet.position[2]} suffix="m" onCommit={(v) => onUpdate(cabinet.id, { position: [cabinet.position[0], cabinet.position[1], v] })} />
      </div>
      <div className="grid grid-cols-3 gap-2">
        <Field disabled={disabled} label="Rotation" value={deg(cabinet.rotation[1])} suffix="deg" onCommit={(v) => onUpdate(cabinet.id, { rotation: [0, rad(v), 0] })} />
      </div>
      {disabled ? (
        <p className="text-[11px] font-medium text-blue-600">Transforming cabinet</p>
      ) : null}
      <select
        value={cabinet.frontType}
        disabled={disabled}
        onChange={(e) => onUpdate(cabinet.id, { frontType: e.target.value as CabinetFrontType })}
        className="h-7 w-full rounded-md border border-zinc-200 px-2 text-xs"
      >
        <option value="door">Door</option>
        <option value="double-door">Double Door</option>
        <option value="drawer">Drawer</option>
        <option value="drawer-stack">Drawer Stack</option>
        <option value="door-drawer">Door + Drawer</option>
        <option value="open">Open</option>
      </select>
      <select
        value={cabinet.finishZone ?? "none"}
        disabled={disabled}
        onChange={(e) =>
          onUpdate(cabinet.id, {
            finishZone:
              e.target.value === "none" ? null : (e.target.value as "perimeter" | "island"),
          })
        }
        className="h-7 w-full rounded-md border border-zinc-200 px-2 text-xs"
      >
        <option value="none">No Finish Zone</option>
        <option value="perimeter">Perimeter</option>
        <option value="island">Island</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <Field disabled={disabled} label="Doors" value={cabinet.doorCount} suffix="" onCommit={(v) => onUpdate(cabinet.id, { doorCount: Math.max(0, Math.round(v)) })} />
        <Field disabled={disabled} label="Drawers" value={cabinet.drawerCount} suffix="" onCommit={(v) => onUpdate(cabinet.id, { drawerCount: Math.max(0, Math.round(v)) })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" disabled={disabled} onClick={() => onDuplicate(cabinet.id)} className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700">Duplicate</button>
        <button type="button" disabled={disabled} onClick={() => onReset(cabinet.id)} className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700">Reset</button>
        <button type="button" disabled={disabled} onClick={() => onToggleLock(cabinet.id)} className="h-8 rounded-md border border-zinc-200 text-xs text-zinc-700">{cabinet.locked ? "Unlock" : "Lock"}</button>
        <button type="button" disabled={disabled} onClick={() => onHide(cabinet.id)} className="h-8 rounded-md border border-red-200 text-xs text-red-600">Hide</button>
      </div>
    </div>
  );
}
