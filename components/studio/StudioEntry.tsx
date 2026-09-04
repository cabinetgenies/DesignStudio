"use client";

import dynamic from "next/dynamic";

const StudioShell = dynamic(() => import("./StudioShell"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-[60vh] items-center justify-center text-sm text-zinc-500 lg:h-full">
      Loading studio…
    </div>
  ),
});

export default function StudioEntry({ projectName }: { projectName: string }) {
  return <StudioShell projectName={projectName} />;
}
