// Job titles are now defined per org type in src/types/organization.ts
// Use getJobTitlesForOrgType(orgType) or ALL_JOB_TITLES from there.
export { ALL_JOB_TITLES as JOB_TITLES, getJobTitlesForOrgType } from '@/types/organization';

export interface SignupWizardData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  orgName: string;
  orgType: string;
  street: string;
  city: string;
  state: string;
  zip: string;
  jobTitle: string;
  trade: string;
  tradeCustom: string;
  signupPath?: 'new' | 'join';
  joinOrgId?: string;
  joinOrgName?: string;
}
