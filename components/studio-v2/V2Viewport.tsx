"use client";

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import {
  V2Viewer,
  type V2CameraPose,
  type V2LoadResult,
  type V2View,
} from "@/lib/studio-v2/v2-viewer";

interface V2ViewportProps {
  xml?: string | null;
  onLoaded?: (result: V2LoadResult) => void;
  onError?: (message: string) => void;
}

export interface V2ViewportHandle {
  loadDae: (xml: string) => V2LoadResult;
  clearModel: () => void;
  resetView: () => void;
  setView: (view: V2View) => void;
  getCameraPose: () => V2CameraPose;
}

const V2Viewport = forwardRef<V2ViewportHandle, V2ViewportProps>(
  function V2Viewport({ xml, onLoaded, onError }, ref) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewerRef = useRef<V2Viewer | null>(null);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }
    const viewer = new V2Viewer(containerRef.current);
    viewerRef.current = viewer;
    return () => {
      viewer.dispose();
      viewerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!xml || !viewerRef.current) {
      return;
    }
    try {
      const result = viewerRef.current.loadDae(xml);
      onLoaded?.(result);
    } catch (error) {
      onError?.(
        error instanceof Error ? error.message : "The DAE could not be loaded.",
      );
    }
  }, [xml, onLoaded, onError]);

  useImperativeHandle(
    ref,
    () => ({
      loadDae: (xml) => {
        if (!viewerRef.current) {
          throw new Error("Viewer is not ready.");
        }
        return viewerRef.current.loadDae(xml);
      },
      clearModel: () => viewerRef.current?.clearModel(),
      resetView: () => viewerRef.current?.resetView(),
      setView: (view) => viewerRef.current?.setView(view),
      getCameraPose: () =>
        viewerRef.current?.getCameraPose() ?? {
          position: [0, 6, 9],
          target: [0, 1, 0],
        },
    }),
    [],
  );

  return <div ref={containerRef} className="h-full w-full" />;
  },
);

export default V2Viewport;
