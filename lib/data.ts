import type { ActivityItem, Project, StatItem } from "./types";

export const initialProjects: Project[] = [
  {
    id: "johnson-kitchen",
    name: "Johnson Kitchen",
    client: "Johnson Family",
    type: "Kitchen",
    status: "In Progress",
    updatedAt: "2 hours ago",
  },
  {
    id: "aubuchon-model",
    name: "Aubuchon Model",
    client: "Aubuchon Homes",
    type: "Kitchen",
    status: "In Review",
    updatedAt: "Yesterday",
  },
  {
    id: "smith-remodel",
    name: "Smith Remodel",
    client: "Smith Residence",
    type: "Kitchen",
    status: "Draft",
    updatedAt: "3 days ago",
  },
];

export const initialStats: StatItem[] = [
  { label: "Active Projects", value: "8" },
  { label: "Saved Looks", value: "24" },
  { label: "Materials", value: "112" },
  { label: "Presentations", value: "6" },
];

export const initialActivity: ActivityItem[] = [
  { id: "activity-1", message: "Johnson Kitchen updated", time: "2 hours ago" },
  { id: "activity-2", message: "Look 3 saved", time: "5 hours ago" },
  {
    id: "activity-3",
    message: "Aubuchon Model opened in presentation mode",
    time: "Yesterday",
  },
];

export function getProjectById(id: string): Project | undefined {
  return initialProjects.find((project) => project.id === id);
}
