import { useDemo } from '@/contexts/DemoContext';
import {
  getDemoProjectById,
  getDemoDataForProject,
  DEMO_TEAM,
  type DemoRole,
} from '@/data/demoData';

export function useDemoProject() {
  const { isDemoMode, demoProjectId } = useDemo();
  if (!isDemoMode || !demoProjectId) return null;
  return getDemoProjectById(demoProjectId);
}

export function useDemoProjectData() {
  const { isDemoMode, demoProjectId, demoRole } = useDemo();
  if (!isDemoMode || !demoProjectId || !demoRole) return null;
  return getDemoDataForProject(demoProjectId, demoRole);
}

export function useDemoTeam() {
  const { isDemoMode } = useDemo();
  if (!isDemoMode) return [];
  return DEMO_TEAM;
}
