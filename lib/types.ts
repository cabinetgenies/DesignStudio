export type ProjectType = "Kitchen" | "Bathroom" | "Closet" | "Other";

export type ProjectStatus =
  | "In Progress"
  | "In Review"
  | "Draft"
  | "Presented";

export interface Project {
  id: string;
  name: string;
  client: string;
  type: ProjectType;
  status: ProjectStatus;
  updatedAt: string;
}

export interface StatItem {
  label: string;
  value: string;
}

export interface ActivityItem {
  id: string;
  message: string;
  time: string;
}
