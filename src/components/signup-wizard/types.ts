export const JOB_TITLES = [
  'Owner', 'Project Manager', 'Superintendent', 'Estimator',
  'Office Manager', 'Foreman', 'Other',
];

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
