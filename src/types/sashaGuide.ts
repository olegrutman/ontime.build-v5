export type SashaGuideRole = 'GC' | 'TC' | 'FC' | 'SUPPLIER';

export type SashaGuideAdvance = 'click' | 'route' | 'action' | 'manual';

export type SashaGuideAction =
  | 'field-report-sorted'
  | 'field-report-item-added'
  | 'field-report-material-saved'
  | 'field-report-photos-added'
  | 'field-report-submitted';

export interface SashaGuideStep {
  id: string;
  title: string;
  instruction: string;
  explanation?: string;
  targetSelector?: string;
  route?: (projectId: string | null) => string;
  advanceOn: SashaGuideAdvance;
  action?: SashaGuideAction;
  matchPath?: RegExp;
}

export interface SashaGuideDefinition {
  id: string;
  roles: SashaGuideRole[];
  title: string;
  description: string;
  completion: string;
  requiresProject?: boolean;
  steps: SashaGuideStep[];
}

export interface SashaGuideContextValue {
  role: SashaGuideRole | null;
  availableGuides: SashaGuideDefinition[];
  activeGuide: SashaGuideDefinition | null;
  currentStep: SashaGuideStep | null;
  stepIndex: number;
  isComplete: boolean;
  startGuide: (guideId: string) => void;
  nextStep: () => void;
  previousStep: () => void;
  stopGuide: () => void;
  finishGuide: () => void;
  isGuideCompleted: (guideId: string) => boolean;
}
