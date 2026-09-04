"use client";

import { useRef, useState } from "react";
import { defaultSettings } from "@/lib/studio/camera-presets";
import { useStudioPresentation } from "@/lib/studio/presentation-context";
import type { CameraView, StudioSettings } from "@/lib/studio/types";
import SceneCanvas from "./SceneCanvas";
import SceneControls from "./SceneControls";
import StudioInspector from "./StudioInspector";
import StudioToolbar from "./StudioToolbar";

interface StudioShellProps {
  projectName: string;
}

export default function StudioShell({ projectName }: StudioShellProps) {
  const { presenting, setPresenting } = useStudioPresentation();
  const [settings, setSettings] = useState<StudioSettings>(defaultSettings);
  const [activeView, setActiveView] = useState<CameraView>("home");
  const commandRef = useRef<CameraView | null>(null);

  function applyView(view: CameraView) {
    commandRef.current = view;
    setActiveView(view);
  }

  function updateSetting<K extends keyof StudioSettings>(
    key: K,
    value: StudioSettings[K],
  ) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="flex h-full flex-col">
      <StudioToolbar
        projectName={projectName}
        presenting={presenting}
        activeView={activeView}
        onViewChange={applyView}
        onTogglePresentation={() => setPresenting(!presenting)}
      />

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative h-[58vh] min-h-[320px] w-full lg:h-auto lg:flex-1">
          <SceneCanvas settings={settings} commandRef={commandRef} />
          <SceneControls presenting={presenting} activeView={activeView} />
        </div>

        {!presenting ? (
          <StudioInspector
            settings={settings}
            onSettingChange={updateSetting}
          />
        ) : null}
      </div>
    </div>
  );
}
