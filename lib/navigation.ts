import type { ComponentType } from "react";
import {
  BookmarkIcon,
  DashboardIcon,
  FolderIcon,
  LayersIcon,
  SettingsIcon,
  type IconProps,
} from "@/components/icons";

export interface NavItem {
  label: string;
  href: string;
  icon: ComponentType<IconProps>;
}

export const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: DashboardIcon },
  { label: "Projects", href: "/projects", icon: FolderIcon },
  { label: "Materials", href: "/materials", icon: LayersIcon },
  { label: "Saved Looks", href: "/saved-looks", icon: BookmarkIcon },
  { label: "Settings", href: "/settings", icon: SettingsIcon },
];
