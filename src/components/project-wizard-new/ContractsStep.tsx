import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { BuildingType, Answers, SOVLine, WizardQuestion } from '@/hooks/useSetupWizardV2';
import type { TeamMember } from '@/types/projectWizard';
import { OrgType } from '@/types/organization';
import { DollarSign, ArrowUp, ArrowDown, ShieldCheck, Info } from 'lucide-react';

interface ContractsStepProps {
  buildingType: BuildingType | null;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  sovLines: SOVLine[];
  visibleQuestions: WizardQuestion[];
  creatorOrgType?: OrgType;
  creatorOrgName?: string;
  team?: TeamMember[];
}

const MATERIAL_OPTIONS = [
  { value: 'GC', label: 'GC supplies materials' },
  { value: 'TC', label: 'TC supplies materials' },
  { value: 'SPLIT', label: 'Split responsibility' },
] as const;

function findCompanyName(team: TeamMember[] | undefined, role: TeamMember['role']): string | null {
  const m = team?.find((t) => t.role === role);
  return m?.companyName?.trim() ? m.companyName.trim() : null;
}

export function ContractsStep({
  answers,
  setAnswer,
  creatorOrgType,
  creatorOrgName,
  team,
}: ContractsStepProps) {
  const isTC = creatorOrgType === 'TC';
  const isFC = creatorOrgType === 'FC';
  const contractValue = typeof answers.contract_value === 'number' ? answers.contract_value : 0;
  const fcContractValue = typeof answers.fc_contract_value === 'number' ? answers.fc_contract_value : 0;
  const materialResp = answers.material_responsibility ? String(answers.material_responsibility) : '';

  const myName = creatorOrgName?.trim() || 'Your company';
  const gcName = findCompanyName(team, 'General Contractor');
  const tcName = findCompanyName(team, 'Trade Contractor');
  const fcName = findCompanyName(team, 'Field Crew');

  // Resolve upstream party (who is paying me)
  const upstreamName = isTC ? gcName : isFC ? tcName : null;
  const upstreamRoleLabel = isTC ? 'General Contractor' : isFC ? 'Trade Contractor' : 'Owner / Client';
  const upstreamDisplay = upstreamName || upstreamRoleLabel;

  // Downstream party (only relevant for TC creator)
  const downstreamName = isTC ? fcName : null;
  const downstreamDisplay = downstreamName || 'Field Crew';

  const showDualCards = isTC;

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold">Primary Contracts</h2>
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
            <ShieldCheck className="h-3 w-3" />
            Official Record
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {isTC
            ? 'These become the official upstream and downstream contracts for this project.'
            : 'This becomes the official contract record for this project.'}
        </p>
      </div>

      {/* Material Responsibility — always visible */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Material Responsibility</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">Who is responsible for supplying materials on this project?</p>
          <RadioGroup
            value={materialResp}
            onValueChange={(val) => setAnswer('material_responsibility', val)}
            className="space-y-2"
          >
            {MATERIAL_OPTIONS.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`mat-${opt.value}`} />
                <Label htmlFor={`mat-${opt.value}`} className="font-normal cursor-pointer">{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <div className={showDualCards ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
        {/* Upstream (incoming) contract */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isTC || isFC ? (
                <>
                  <ArrowDown className="h-4 w-4 text-primary shrink-0" />
                  <span className="truncate">{upstreamDisplay} → {myName}</span>
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 text-primary shrink-0" />
                  Contract Value
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="contract_value" className="text-sm text-muted-foreground">
              {isTC || isFC
                ? `What is ${upstreamDisplay} paying ${myName}?`
                : `Total contract value for ${myName}`}
            </Label>
            <div className="relative mt-1.5">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
              <Input
                id="contract_value"
                type="number"
                min={0}
                className="pl-7"
                placeholder="0.00"
                value={contractValue || ''}
                onChange={(e) => setAnswer('contract_value', e.target.value ? Number(e.target.value) : 0)}
              />
            </div>
            {(isTC || isFC) && !upstreamName && (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                <span>Tip: Add a {upstreamRoleLabel} in Step 1 to name this contract.</span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Downstream (outgoing) contract — TC only */}
        {showDualCards && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-accent-foreground shrink-0" />
                <span className="truncate">{myName} → {downstreamDisplay}</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="fc_contract_value" className="text-sm text-muted-foreground">
                What is {myName} paying {downstreamDisplay}?
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="fc_contract_value"
                  type="number"
                  min={0}
                  className="pl-7"
                  placeholder="0.00"
                  value={fcContractValue || ''}
                  onChange={(e) => setAnswer('fc_contract_value', e.target.value ? Number(e.target.value) : 0)}
                />
              </div>
              {!downstreamName && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" />
                  <span>Tip: Add a Field Crew in Step 1 to name this contract.</span>
                </p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
