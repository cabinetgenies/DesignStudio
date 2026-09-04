import { SettingsIcon } from "@/components/icons";
import PagePlaceholder from "@/components/PagePlaceholder";

export default function SettingsPage() {
  return (
    <PagePlaceholder
      title="Settings"
      description="Manage your workspace, team, and preferences."
      icon={SettingsIcon}
    />
  );
}
