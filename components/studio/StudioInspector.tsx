"use client";

import type { BackgroundPreset, StudioSettings } from "@/lib/studio/types";
import { backgroundColors } from "@/lib/studio/camera-presets";
import { demoMaterials } from "@/lib/studio/demo-materials";

interface StudioInspectorProps {
  settings: StudioSettings;
  onSettingChange: <K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K],
  ) => void;
}

const backgroundOptions: { value: BackgroundPreset; label: string }[] = [
  { value: "light", label: "Light" },
  { value: "warm", label: "Warm" },
  { value: "dark", label: "Dark" },
];

const materialRows = [
  demoMaterials.perimeter,
  demoMaterials.island,
  demoMaterials.countertop,
  demoMaterials.floor,
  demoMaterials.walls,
  demoMaterials.hardware,
];

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between py-2.5">
      <span className="text-sm text-zinc-700">{label}</span>
      <span className="relative inline-flex shrink-0">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="peer sr-only"
        />
        <span className="h-6 w-11 rounded-full bg-zinc-200 transition-colors peer-checked:bg-zinc-900 peer-focus-visible:ring-2 peer-focus-visible:ring-zinc-400 peer-focus-visible:ring-offset-2" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-b border-zinc-100 py-5 last:border-b-0">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
        {title}
      </h2>
      <div className="mt-1">{children}</div>
    </section>
  );
}

export default function StudioInspector({
  settings,
  onSettingChange,
}: StudioInspectorProps) {
  return (
    <aside className="w-full shrink-0 border-t border-zinc-200 bg-white lg:w-[320px] lg:border-l lg:border-t-0 lg:overflow-y-auto">
      <div className="p-5">
        <Section title="Scene">
          <Toggle
            label="Grid"
            checked={settings.showGrid}
            onChange={(checked) => onSettingChange("showGrid", checked)}
          />
          <Toggle
            label="Shadows"
            checked={settings.showShadows}
            onChange={(checked) => onSettingChange("showShadows", checked)}
          />
          <div className="mt-3">
            <p className="mb-2 text-xs font-medium text-zinc-500">Background</p>
            <div className="grid grid-cols-3 gap-2">
              {backgroundOptions.map((option) => {
                const active = settings.background === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => onSettingChange("background", option.value)}
                    className={`flex items-center justify-center gap-2 rounded-md border px-2 py-2 text-xs font-medium transition-colors ${
                      active
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50"
                    }`}
                  >
                    <span
                      className="h-3 w-3 rounded-full border border-zinc-200"
                      style={{
                        backgroundColor: backgroundColors[option.value],
                      }}
                    />
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </Section>

        <Section title="Materials">
          <div className="divide-y divide-zinc-50">
            {materialRows.map((material) => (
              <div
                key={material.label}
                className="flex items-center justify-between py-2.5"
              >
                <span className="flex items-center gap-2.5">
                  <span
                    className="h-5 w-5 rounded-full border border-zinc-200"
                    style={{ backgroundColor: material.color }}
                  />
                  <span className="text-sm text-zinc-700">{material.label}</span>
                </span>
                <span className="text-xs font-medium text-zinc-400">Soon</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs leading-5 text-zinc-400">
            Material editing arrives in the next milestone.
          </p>
        </Section>

        <Section title="Saved Looks">
          <p className="text-sm text-zinc-500">No saved looks yet.</p>
        </Section>
      </div>
    </aside>
  );
}
