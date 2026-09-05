"use client";

import type { Group } from "three";

export default function ImportedModel({ scene }: { scene: Group }) {
  return <primitive object={scene} />;
}
