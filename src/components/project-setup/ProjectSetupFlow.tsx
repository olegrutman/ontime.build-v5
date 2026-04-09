import { ProjectInfoSummary } from './ProjectInfoSummary';

interface ProjectSetupFlowProps {
  projectId: string;
  projectName?: string;
  projectType?: string;
}

export function ProjectSetupFlow({ projectId }: ProjectSetupFlowProps) {
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6">
      <ProjectInfoSummary projectId={projectId} />
    </div>
  );
}
