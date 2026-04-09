import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SOVLivePreview } from '@/components/setup-wizard-v2/SOVLivePreview';
import { WizardQuestion as WizardQuestionComponent } from '@/components/setup-wizard-v2/WizardQuestion';
import type { BuildingType, Answers, SOVLine, WizardQuestion } from '@/hooks/useSetupWizardV2';
import { generateSOVLines } from '@/hooks/useSetupWizardV2';
import { OrgType } from '@/types/organization';
import { DollarSign, ArrowUp, ArrowDown } from 'lucide-react';

interface ContractsStepProps {
  buildingType: BuildingType;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  sovLines: SOVLine[];
  visibleQuestions: WizardQuestion[];
  creatorOrgType?: OrgType;
}

export function ContractsStep({
  buildingType,
  answers,
  setAnswer,
  sovLines,
  visibleQuestions,
  creatorOrgType,
}: ContractsStepProps) {
  const isTC = creatorOrgType === 'TC';
  const contractValue = typeof answers.contract_value === 'number' ? answers.contract_value : 0;
  const fcContractValue = typeof answers.fc_contract_value === 'number' ? answers.fc_contract_value : 0;

  // Generate FC SOV lines using same scope but FC contract value
  const fcSovLines = useMemo(() => {
    if (!isTC || fcContractValue <= 0) return [];
    const fcAnswers = { ...answers, contract_value: fcContractValue };
    return generateSOVLines(buildingType, fcAnswers);
  }, [isTC, buildingType, answers, fcContractValue]);

  // Material responsibility question
  const matQuestion = visibleQuestions.find(q => q.fieldKey === 'material_responsibility');

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold">Contracts</h2>
        <p className="text-sm text-muted-foreground">
          {isTC
            ? 'Enter both your upstream (GC) and downstream (FC) contract values.'
            : 'Enter the total contract value for this project.'}
        </p>
      </div>

      {/* Material responsibility */}
      {matQuestion && (
        <Card>
          <CardContent className="pt-4">
            <WizardQuestionComponent
              question={matQuestion}
              value={answers[matQuestion.fieldKey] ?? null}
              onChange={(val) => setAnswer(matQuestion.fieldKey, val)}
              answers={answers}
            />
          </CardContent>
        </Card>
      )}

      {/* Contract inputs */}
      <div className={isTC ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
        {/* GC / Primary contract */}
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

        {/* FC contract (TC only) */}
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

      {/* SOV Preview(s) */}
      {contractValue > 0 && (
        <div className={isTC && fcContractValue > 0 ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
          <Card className="overflow-hidden">
            <div className="px-4 py-2 border-b bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground">
                {isTC ? 'GC → TC SOV' : 'SOV Preview'}
              </p>
            </div>
            <SOVLivePreview lines={sovLines} buildingType={buildingType} />
          </Card>

          {isTC && fcContractValue > 0 && (
            <Card className="overflow-hidden">
              <div className="px-4 py-2 border-b bg-muted/30">
                <p className="text-xs font-medium text-muted-foreground">TC → FC SOV</p>
              </div>
              <SOVLivePreview lines={fcSovLines} buildingType={buildingType} />
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
