"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/navigation";
import { CloseIcon } from "./icons";

interface AppSidebarProps {
  open: boolean;
  onClose: () => void;
}

function isActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LogoMark() {
  return (
    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-zinc-900 text-white">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <rect x="3" y="3" width="18" height="18" rx="2.5" />
        <line x1="12" y1="3" x2="12" y2="21" />
        <circle cx="8.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
        <circle cx="15.5" cy="12" r="0.6" fill="currentColor" stroke="none" />
      </svg>
    </div>
  );
}

export default function AppSidebar({ open, onClose }: AppSidebarProps) {
  const pathname = usePathname();

  const content = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-end px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close navigation"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900"
        >
          <CloseIcon className="h-5 w-5" />
        </button>
      </div>

      <div className="flex items-center gap-3 px-6 py-6">
        <LogoMark />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-zinc-900">
            Design Studio
          </p>
          <p className="truncate text-xs text-zinc-500">
            Cabinet Genies Visualization Platform
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3">
        <p className="px-3 pb-2 text-xs font-medium uppercase tracking-wider text-zinc-400">
          Workspace
        </p>
        <ul className="space-y-1">
          {navItems.map((item) => {
            const active = isActive(pathname, item.href);
            const Icon = item.icon;
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    active
                      ? "bg-zinc-900 text-white"
                      : "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900"
                  }`}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-zinc-200 p-4">
        <div className="rounded-lg bg-zinc-50 px-4 py-3">
          <p className="text-xs font-medium text-zinc-900">Need a hand?</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            Reference docs and onboarding are coming soon.
          </p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-zinc-200 bg-white lg:block">
        {content}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white shadow-xl">
            {content}
          </aside>
        </div>
      ) : null}
    </>
  );
}
