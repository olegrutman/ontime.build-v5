import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { BuildingType, Answers, SOVLine, WizardQuestion } from '@/hooks/useSetupWizardV2';
import { OrgType } from '@/types/organization';
import { DollarSign, ArrowUp, ArrowDown, ShieldCheck, Lock, Building2, Info } from 'lucide-react';

export interface DownstreamContractRow {
  id: string;                    // project_contracts.id
  org_name: string;              // company being paid
  role: string;                  // 'Trade Contractor' | 'Field Crew' | ...
  trade?: string | null;
  contract_sum: number;
  invited_only?: boolean;        // true if invite not yet accepted
}

export interface SupplierContractInfo {
  supplier_name: string;
  amount: number;
}

interface ContractsStepProps {
  buildingType: BuildingType | null;
  answers: Answers;
  setAnswer: (key: string, value: any) => void;
  sovLines: SOVLine[];
  visibleQuestions: WizardQuestion[];
  creatorOrgType?: OrgType;

  // ── Adoption mode (Finish Project Setup) ──
  /** When true, render party-labeled sections with supplier/owner/downstream rows. */
  adoptionMode?: boolean;
  supplierContract?: SupplierContractInfo | null;
  downstreamContracts?: DownstreamContractRow[];
  onDownstreamChange?: (id: string, contractSum: number) => void;
  ownerContractValue?: number;
  onOwnerContractChange?: (value: number) => void;
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
  adoptionMode,
  supplierContract,
  downstreamContracts = [],
  onDownstreamChange,
  ownerContractValue = 0,
  onOwnerContractChange,
}: ContractsStepProps) {
  // Suppliers don't have a setup-time contract — render nothing.
  if (creatorOrgType === 'SUPPLIER') return null;

  const isTC = creatorOrgType === 'TC';
  const isGC = creatorOrgType === 'GC';
  const materialResp = answers.material_responsibility ? String(answers.material_responsibility) : '';

  // ── Supplier card only shows if this buyer is materially responsible. ──
  const buyerIsMaterialResp =
    (isGC && materialResp === 'GC') ||
    (isTC && materialResp === 'TC') ||
    materialResp === 'SPLIT';

  /* ════════════════════════ ADOPTION MODE ════════════════════════ */
  if (adoptionMode) {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Project Contracts</h2>
            <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              <ShieldCheck className="h-3 w-3" />
              Official Record
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Define who is paying whom on this project. Each row is its own contract.
          </p>
        </div>

        {/* Material Responsibility */}
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

        {/* Supplier → You (locked) */}
        {buyerIsMaterialResp && supplierContract && (
          <Card className="bg-muted/30 border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Lock className="h-4 w-4 text-muted-foreground" />
                Supplier → You
                <span className="ml-2 text-xs font-normal text-muted-foreground">Locked — from accepted estimate</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{supplierContract.supplier_name}</span>
                </div>
                <span className="font-mono">${Number(supplierContract.amount || 0).toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Material cost agreement with the supplier. Adjusted later via change orders.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Owner → GC (optional, GC view only) */}
        {isGC && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowDown className="h-4 w-4 text-primary" />
                Owner → You (Prime contract)
                <span className="ml-2 text-xs font-normal text-muted-foreground">Optional</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="owner_contract_value" className="text-sm text-muted-foreground">
                What is the property owner paying you for this project? You can add this later.
              </Label>
              <div className="relative mt-1.5 max-w-sm">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="owner_contract_value"
                  type="number"
                  min={0}
                  className="pl-7"
                  placeholder="0.00"
                  value={ownerContractValue || ''}
                  onChange={(e) => onOwnerContractChange?.(e.target.value ? Number(e.target.value) : 0)}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {/* Downstream contracts (one row per invited team member) */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ArrowUp className="h-4 w-4 text-accent-foreground" />
              You → {isGC ? 'Trade Contractors' : 'Field Crews'} (Downstream)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {downstreamContracts.length === 0 ? (
              <div className="text-sm text-muted-foreground flex items-start gap-2 p-3 rounded-md bg-muted/30">
                <Info className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  No {isGC ? 'trade contractors' : 'field crews'} invited yet. Go back to the
                  <strong> Invite Team</strong> step to add them, or skip if self-performing.
                </span>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Enter what you're paying each {isGC ? 'TC' : 'FC'} for their portion of this project.
                </p>
                {downstreamContracts.map((row) => (
                  <div key={row.id} className="flex items-center justify-between gap-3 p-3 rounded-md border bg-card">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{row.org_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {row.role}{row.trade ? ` · ${row.trade}` : ''}{row.invited_only ? ' · Pending acceptance' : ''}
                      </p>
                    </div>
                    <div className="relative w-44 shrink-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                      <Input
                        type="number"
                        min={0}
                        className="pl-7"
                        placeholder="0.00"
                        value={row.contract_sum || ''}
                        onChange={(e) =>
                          onDownstreamChange?.(row.id, e.target.value ? Number(e.target.value) : 0)
                        }
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  /* ════════════════════════ STANDARD MODE ════════════════════════ */
  const contractValue = typeof answers.contract_value === 'number' ? answers.contract_value : 0;
  const fcContractValue = typeof answers.fc_contract_value === 'number' ? answers.fc_contract_value : 0;
  const gcTcContractValue = typeof answers.gc_tc_contract_value === 'number' ? answers.gc_tc_contract_value : 0;

  // Role-aware labeling for the upstream "what you are paid" card
  const upstreamCardTitle = isGC
    ? 'Owner → You (Prime contract)'
    : isTC
    ? 'General Contractor → You (Upstream)'
    : 'Contract Value';
  const upstreamFieldLabel = isGC
    ? "Owner contract value — your revenue from the property owner"
    : isTC
    ? 'What is the GC paying you?'
    : 'Total contract value';

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
            : isGC
            ? 'These become the official upstream (Owner) and downstream (Trade Contractor) contracts for this project.'
            : 'This becomes the official contract record for this project.'}
        </p>
      </div>

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

      <div className={isTC || isGC ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : ''}>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              {isTC || isGC ? (
                <ArrowDown className="h-4 w-4 text-primary" />
              ) : (
                <DollarSign className="h-4 w-4 text-primary" />
              )}
              {upstreamCardTitle}
              {isGC && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">Optional</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Label htmlFor="contract_value" className="text-sm text-muted-foreground">
              {upstreamFieldLabel}
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
                You → Field Crew (Downstream)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="fc_contract_value" className="text-sm text-muted-foreground">
                Field Crew contract value — what you'll pay your FC
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

        {isGC && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ArrowUp className="h-4 w-4 text-accent-foreground" />
                You → Trade Contractor (Downstream)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Label htmlFor="gc_tc_contract_value" className="text-sm text-muted-foreground">
                Trade Contractor contract value — what you'll pay your TC
              </Label>
              <div className="relative mt-1.5">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">$</span>
                <Input
                  id="gc_tc_contract_value"
                  type="number"
                  min={0}
                  className="pl-7"
                  placeholder="0.00"
                  value={gcTcContractValue || ''}
                  onChange={(e) => setAnswer('gc_tc_contract_value', e.target.value ? Number(e.target.value) : 0)}
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
