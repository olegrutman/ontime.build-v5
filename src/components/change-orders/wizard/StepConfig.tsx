import { useEffect, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import type { COCreatedByRole, COPricingType } from '@/types/changeOrder';
import type { COWizardData } from './COWizard';

interface TeamMember {
  id:       string;
  org_id:   string;
  org_name: string;
  role:     string;
}

interface StepConfigProps {
  data:      COWizardData;
  onChange:  (patch: Partial<COWizardData>) => void;
  role:      COCreatedByRole;
  projectId: string;
}

const PRICING_OPTIONS: {
  type:        COPricingType;
  title:       string;
  description: string;
}[] = [
  {
    type:        'fixed',
    title:       'Fixed price',
    description: 'TC submits a lump sum or itemized price. You approve before work begins.',
  },
  {
    type:        'tm',
    title:       'Time and material',
    description: 'TC logs hours and costs as work happens. Running total is visible to you in real time.',
  },
  {
    type:        'nte',
    title:       'Not to exceed',
    description: 'TC tracks hours like T&M but cannot bill past the cap you set. TC must notify you before going over.',
  },
];

export function StepConfig({ data, onChange, role, projectId }: StepConfigProps) {
  const [tcMembers, setTcMembers] = useState<TeamMember[]>([]);
  const [fcMembers, setFcMembers] = useState<TeamMember[]>([]);
  const [loading,   setLoading]   = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    supabase
      .from('project_team')
      .select(`
        id,
        org_id,
        role,
        organization:organizations(id, name)
      `)
      .eq('project_id', projectId)
      .eq('status', 'Accepted')
      .then(({ data: rows }) => {
        const members: TeamMember[] = (rows ?? [])
          .filter((r: any) => r.org_id && r.organization)
          .map((r: any) => ({
            id:       r.id,
            org_id:   r.org_id,
            org_name: r.organization?.name ?? 'Unknown',
            role:     r.role ?? '',
          }));
        setTcMembers(members.filter(m =>
          m.role === 'Trade Contractor' || m.role === 'TC'
        ));
        setFcMembers(members.filter(m =>
          m.role === 'Field Crew' || m.role === 'FC'
        ));
        setLoading(false);
      });
  }, [projectId]);

  // GC role config
  if (role === 'GC') {
    return (
      <div className="space-y-6">
        {/* Assign TC */}
        <div className="space-y-2">
          <Label>Assign to Trade Contractor *</Label>
          <Select
            value={data.assignedToOrgId}
            onValueChange={(v) => onChange({ assignedToOrgId: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a trade contractor" />
            </SelectTrigger>
            <SelectContent>
              {tcMembers.length === 0 && !loading && (
                <SelectItem value="_none" disabled>
                  No accepted trade contractors on this project
                </SelectItem>
              )}
              {tcMembers.map(m => (
                <SelectItem key={m.org_id} value={m.org_id}>
                  {m.org_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {tcMembers.length === 0 && !loading && (
            <p className="text-xs text-muted-foreground">
              Add and accept a trade contractor on the project team before creating a change order.
            </p>
          )}
        </div>

        {/* Pricing type */}
        <div className="space-y-3">
          <Label>Pricing type</Label>
          <div className="space-y-2">
            {PRICING_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => onChange({ pricingType: opt.type })}
                className={cn(
                  'w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                  data.pricingType === opt.type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:bg-muted/40'
                )}
              >
                <span className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
                  data.pricingType === opt.type ? 'border-primary' : 'border-muted-foreground/40'
                )}>
                  {data.pricingType === opt.type && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">{opt.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {data.pricingType === 'nte' && (
            <div className="space-y-1.5 pl-7">
              <Label>Maximum amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={data.nteCap}
                  onChange={(e) => onChange({ nteCap: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
              <p className="text-xs text-muted-foreground">
                TC will be warned at 80% and notified at 95%. They must request your approval to exceed this amount.
              </p>
            </div>
          )}
        </div>

        {/* Responsibility */}
        <ResponsibilitySection data={data} onChange={onChange} />

        {/* Share toggle */}
        <ShareToggle
          value={data.shareDraftNow}
          onChange={(v) => onChange({ shareDraftNow: v })}
          label="Share this CO with TC immediately"
          hint="If off, TC cannot see this CO until you choose to share it."
        />
      </div>
    );
  }

  // TC role config
  if (role === 'TC') {
    return (
      <div className="space-y-6">
        {/* Pricing type */}
        <div className="space-y-3">
          <Label>Pricing type</Label>
          <div className="space-y-2">
            {PRICING_OPTIONS.map(opt => (
              <button
                key={opt.type}
                onClick={() => onChange({ pricingType: opt.type })}
                className={cn(
                  'w-full flex items-start gap-3 p-3.5 rounded-xl border-2 text-left transition-all',
                  data.pricingType === opt.type
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/30 hover:bg-muted/40'
                )}
              >
                <span className={cn(
                  'w-4 h-4 rounded-full border-2 shrink-0 mt-0.5 flex items-center justify-center',
                  data.pricingType === opt.type ? 'border-primary' : 'border-muted-foreground/40'
                )}>
                  {data.pricingType === opt.type && (
                    <span className="w-2 h-2 rounded-full bg-primary" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">{opt.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {opt.description}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {data.pricingType === 'nte' && (
            <div className="space-y-1.5 pl-7">
              <Label>Maximum amount *</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  value={data.nteCap}
                  onChange={(e) => onChange({ nteCap: e.target.value })}
                  className="pl-7"
                  placeholder="0.00"
                />
              </div>
            </div>
          )}
        </div>

        {/* FC input */}
        <div className="space-y-3">
          <ToggleRow
            label="Field crew input needed"
            hint="FC will be able to add hours and notes"
            checked={data.fcInputNeeded}
            onChange={(v) => onChange({ fcInputNeeded: v })}
          />

          {data.fcInputNeeded && (
            <div className="pl-4 space-y-2">
              <Label>Assign Field Crew</Label>
              <Select
                value={data.assignedToOrgId}
                onValueChange={(v) => onChange({ assignedToOrgId: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select field crew" />
                </SelectTrigger>
                <SelectContent>
                  {fcMembers.length === 0 && !loading && (
                    <SelectItem value="_none" disabled>
                      No accepted field crews on this project
                    </SelectItem>
                  )}
                  {fcMembers.map(m => (
                    <SelectItem key={m.org_id} value={m.org_id}>
                      {m.org_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        {/* Materials */}
        <div className="space-y-3">
          <ToggleRow
            label="Materials needed"
            hint="Track materials on this change order"
            checked={data.materialsNeeded}
            onChange={(v) => onChange({ materialsNeeded: v, materialsOnSite: v ? data.materialsOnSite : false })}
          />

          {data.materialsNeeded && (
            <div className="pl-4">
              <ToggleRow
                label="Materials already on site"
                hint="No new order needed"
                checked={data.materialsOnSite}
                onChange={(v) => onChange({ materialsOnSite: v })}
              />
            </div>
          )}
        </div>

        <ToggleRow
          label="Equipment needed"
          hint="Track equipment costs on this change order"
          checked={data.equipmentNeeded}
          onChange={(v) => onChange({ equipmentNeeded: v })}
        />

        <ShareToggle
          value={data.shareDraftNow}
          onChange={(v) => onChange({ shareDraftNow: v })}
          label="Share with GC immediately"
          hint="If off, GC cannot see this CO until you choose to share it."
        />
      </div>
    );
  }

  // FC role config
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Review your scope and location selections. You can add your hours and actual costs
        after the CO is created.
      </p>

      <div className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Selected items
        </p>
        <div className="flex flex-wrap gap-1.5">
          {data.selectedItems.map(item => (
            <span
              key={item.id}
              className="px-2.5 py-1 rounded-full bg-muted text-foreground text-xs"
            >
              {item.item_name}
            </span>
          ))}
        </div>
      </div>

      {data.selectedItems.some(i => i.locationTag) && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            Item locations
          </p>
          <div className="space-y-0.5">
            {data.selectedItems.filter(i => i.locationTag).map((item, i) => (
              <p key={i} className="text-sm text-foreground">{item.item_name}: {item.locationTag}</p>
            ))}
          </div>
        </div>
      )}

      <ShareToggle
        value={data.shareDraftNow}
        onChange={(v) => onChange({ shareDraftNow: v })}
        label="Share with TC immediately"
        hint="If off, TC cannot see this CO until you choose to share it."
      />
    </div>
  );
}

function ResponsibilitySection({
  data,
  onChange,
}: {
  data:     COWizardData;
  onChange: (patch: Partial<COWizardData>) => void;
}) {
  return (
    <div className="space-y-4">
      {/* Materials */}
      <div className="space-y-2">
        <Label>Materials</Label>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Materials needed</p>
            <p className="text-xs text-muted-foreground">
              TC will build a material list on this CO
            </p>
          </div>
          <Switch
            checked={data.materialsNeeded}
            onCheckedChange={(v) =>
              onChange({
                materialsNeeded:      v,
                materialsResponsible: v ? (data.materialsResponsible ?? 'TC') : null,
              })
            }
          />
        </div>

        {data.materialsNeeded && (
          <div className="flex gap-2">
            {(['TC', 'GC'] as const).map(party => (
              <button
                key={party}
                onClick={() => onChange({ materialsResponsible: party })}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                  data.materialsResponsible === party
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                )}
              >
                {party} responsible
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Equipment */}
      <div className="space-y-2">
        <Label>Equipment</Label>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Equipment needed</p>
            <p className="text-xs text-muted-foreground">
              TC will add equipment costs to this CO
            </p>
          </div>
          <Switch
            checked={data.equipmentNeeded}
            onCheckedChange={(v) =>
              onChange({
                equipmentNeeded:      v,
                equipmentResponsible: v ? (data.equipmentResponsible ?? 'TC') : null,
              })
            }
          />
        </div>

        {data.equipmentNeeded && (
          <div className="flex gap-2">
            {(['TC', 'GC'] as const).map(party => (
              <button
                key={party}
                onClick={() => onChange({ equipmentResponsible: party })}
                className={cn(
                  'flex-1 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                  data.equipmentResponsible === party
                    ? 'border-primary bg-primary/5 text-foreground'
                    : 'border-border text-muted-foreground hover:border-primary/30'
                )}
              >
                {party} responsible
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  hint,
  checked,
  onChange,
}: {
  label:    string;
  hint:     string;
  checked:  boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function ShareToggle({
  value,
  onChange,
  label,
  hint,
}: {
  value:    boolean;
  onChange: (v: boolean) => void;
  label:    string;
  hint:     string;
}) {
  return (
    <div className="flex items-center justify-between p-3.5 rounded-xl border bg-muted/30">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}
