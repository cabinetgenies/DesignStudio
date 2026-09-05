"use client";

import { useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { StudioPresentationContext } from "@/lib/studio/presentation-context";
import AppHeader from "./AppHeader";
import AppSidebar from "./AppSidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const pathname = usePathname();
  const isStudio =
    pathname.startsWith("/projects/") && pathname.endsWith("/studio");
  const isStudioV2 = pathname.includes("/studio-v2");

  const mainClassName = isStudioV2
    ? "h-screen overflow-hidden"
    : isStudio
    ? presenting
      ? "h-screen overflow-hidden"
      : "lg:h-[calc(100vh-4rem)] lg:overflow-hidden"
    : "mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10";

  return (
    <StudioPresentationContext.Provider value={{ presenting, setPresenting }}>
      <div className="min-h-screen bg-zinc-50 text-zinc-900">
        {!presenting && !isStudioV2 ? (
          <AppSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
        ) : null}
        <div className={presenting || isStudioV2 ? "" : "lg:pl-64"}>
          {!presenting && !isStudioV2 ? (
            <AppHeader onMenuClick={() => setSidebarOpen(true)} />
          ) : null}
          <main className={mainClassName}>{children}</main>
        </div>
      </div>
    </StudioPresentationContext.Provider>
  );
}
