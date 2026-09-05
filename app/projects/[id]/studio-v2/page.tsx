import StudioV2Entry from "@/components/studio-v2/StudioV2Entry";
import { getProjectById } from "@/lib/data";
import { humanizeId } from "@/lib/utils";

interface StudioV2PageProps {
  params: Promise<{ id: string }>;
}

export default async function StudioV2Page({ params }: StudioV2PageProps) {
  const { id } = await params;
  const project = getProjectById(id);
  const projectName = project?.name ?? humanizeId(id);

  return <StudioV2Entry projectName={projectName} />;
}
