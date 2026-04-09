import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { BuildingType, Answers, SOVLine, WizardQuestion } from '@/hooks/useSetupWizardV2';
import { OrgType } from '@/types/organization';
import { DollarSign, ArrowUp, ArrowDown, ShieldCheck } from 'lucide-react';

interface ContractsStepProps {
  buildingType: BuildingType | null;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  sovLines: SOVLine[];
  visibleQuestions: WizardQuestion[];
  creatorOrgType?: OrgType;
}

const MATERIAL_OPTIONS = [
  { value: 'GC', label: 'GC supplies materials' },
  { value: 'TC', label: 'TC supplies materials' },
  { value: 'SPLIT', label: 'Split responsibility' },
] as const;

export function ContractsStep({
  answers,
  setAnswer,
  creatorOrgType,
}: ContractsStepProps) {
  const isTC = creatorOrgType === 'TC';
  const contractValue = typeof answers.contract_value === 'number' ? answers.contract_value : 0;
  const fcContractValue = typeof answers.fc_contract_value === 'number' ? answers.fc_contract_value : 0;
  const materialResp = answers.material_responsibility ? String(answers.material_responsibility) : '';

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
            ? 'These become the official upstream (GC) and downstream (FC) contracts for this project.'
            : 'This becomes the official contract record for this project.'}
        </p>
      </div>

      {/* Material Responsibility — always visible, not dependent on buildingType */}
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

      <div className={isTC ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isTC ? (
                <>
                  <ArrowDown className="h-4 w-4 text-primary" />
                  GC → You (Upstream)
                </>
              ) : (
                <>
                  <DollarSign className="h-4 w-4 text-primary" />
                  Contract Value
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="contract_value" className="text-sm text-muted-foreground">
              {isTC ? 'What is the GC paying you?' : 'Total contract value'}
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
          </CardContent>
        </Card>

        {isTC && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-accent-foreground" />
                You → FC (Downstream)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="fc_contract_value" className="text-sm text-muted-foreground">
                What are you paying your field crew?
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
