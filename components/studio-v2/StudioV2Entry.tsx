"use client";

import dynamic from "next/dynamic";

const StudioV2Shell = dynamic(() => import("./StudioV2Shell"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500">
      Loading Studio V2…
    </div>
  ),
});

export default function StudioV2Entry({ projectName }: { projectName: string }) {
  return <StudioV2Shell projectName={projectName} />;
}
