import StudioEntry from "@/components/studio/StudioEntry";
import { getProjectById } from "@/lib/data";
import { humanizeId } from "@/lib/utils";

interface StudioPageProps {
  params: Promise<{ id: string }>;
}

export default async function StudioPage({ params }: StudioPageProps) {
  const { id } = await params;
  const project = getProjectById(id);
  const projectName = project?.name ?? humanizeId(id);

  return <StudioEntry projectName={projectName} />;
}
