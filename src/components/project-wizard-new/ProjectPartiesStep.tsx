import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ElongatedSwitch } from '@/components/ui/switch';
import { Plus, Trash2, Building2, Shield, AlertCircle, ArrowUp, ArrowDown, Mail } from 'lucide-react';
import { TeamMember, TeamRole } from '@/types/projectWizard';
import { OrgType } from '@/types/organization';
import { AddTeamMemberDialog } from '@/components/project/AddTeamMemberDialog';
import { cn } from '@/lib/utils';

interface ProjectPartiesStepProps {
  team: TeamMember[];
  onTeamChange: (team: TeamMember[]) => void;
  selfPerform: boolean;
  onSelfPerformChange: (value: boolean) => void;
  creatorOrgName?: string;
  creatorRole?: string | null;
  creatorOrgType?: OrgType | null;
}

/** Roles that sit above the creator in the billing chain (creator bills them). */
export function upstreamRolesFor(orgType?: OrgType | null): TeamRole[] {
  if (orgType === 'TC') return ['General Contractor'];
  if (orgType === 'FC') return ['Trade Contractor', 'General Contractor'];
  if (orgType === 'SUPPLIER') return ['General Contractor', 'Trade Contractor'];
  return [];
}

/** Roles that sit below the creator in the billing chain (they bill the creator). */
export function downstreamRolesFor(orgType?: OrgType | null): TeamRole[] {
  if (orgType === 'GC') return ['Trade Contractor', 'Field Crew'];
  if (orgType === 'TC') return ['Field Crew'];
  return [];
}

export function partiesStepComplete(
  team: TeamMember[],
  selfPerform: boolean,
  orgType?: OrgType | null,
): boolean {
  const upstream = upstreamRolesFor(orgType);
  const downstream = downstreamRolesFor(orgType);

  const upstreamOk =
    upstream.length === 0 || team.some((m) => upstream.includes(m.role));
  const downstreamOk =
    downstream.length === 0 || selfPerform || team.some((m) => downstream.includes(m.role));

  return upstreamOk && downstreamOk;
}

function MemberRow({ member, onRemove }: { member: TeamMember; onRemove: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-lg border text-sm bg-card">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center shrink-0">
          <Building2 className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="font-medium truncate">{member.companyName}</p>
          <p className="text-xs text-muted-foreground truncate">
            {member.contactName ? `${member.contactName} • ` : ''}
            {member.contactEmail || 'No email'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {member.trade && (
          <Badge variant="outline" className="hidden sm:inline-flex">
            {member.trade === 'Other' ? member.tradeCustom : member.trade}
          </Badge>
        )}
        <Badge variant={member.orgId ? 'secondary' : 'outline'} className="gap-1">
          {member.orgId ? 'On Ontime' : <><Mail className="h-3 w-3" /> Invite</>}
        </Badge>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onRemove}>
          <Trash2 className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

export function ProjectPartiesStep({
  team,
  onTeamChange,
  selfPerform,
  onSelfPerformChange,
  creatorOrgName,
  creatorRole,
  creatorOrgType,
}: ProjectPartiesStepProps) {
  const [dialogZone, setDialogZone] = useState<'upstream' | 'downstream' | null>(null);

  const upstreamRoles = upstreamRolesFor(creatorOrgType);
  const downstreamRoles = downstreamRolesFor(creatorOrgType);

  const upstreamMembers = team.filter((m) => upstreamRoles.includes(m.role));
  const downstreamMembers = team.filter((m) => downstreamRoles.includes(m.role));
  const otherMembers = team.filter(
    (m) => !upstreamRoles.includes(m.role) && !downstreamRoles.includes(m.role),
  );

  const removeMember = (id: string) => onTeamChange(team.filter((m) => m.id !== id));

  const handleSelfPerform = (value: boolean) => {
    onSelfPerformChange(value);
    if (value && downstreamMembers.length > 0) {
      onTeamChange(team.filter((m) => !downstreamRoles.includes(m.role)));
    }
  };

  const upstreamLabel = upstreamRoles.join(' or ');
  const downstreamLabel = downstreamRoles.join(' or ');
  const upstreamMissing = upstreamRoles.length > 0 && upstreamMembers.length === 0;
  const downstreamMissing =
    downstreamRoles.length > 0 && !selfPerform && downstreamMembers.length === 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold font-heading">Project Team</h2>
        <p className="text-sm text-muted-foreground">
          Define both sides of your contract chain so invoices and change orders route correctly.
        </p>
      </div>

      {/* Creator */}
      {creatorOrgName && creatorRole && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Shield className="h-5 w-5 text-primary" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{creatorOrgName}</p>
            <p className="text-xs text-muted-foreground">You — project owner</p>
          </div>
          <Badge variant="secondary">{creatorRole}</Badge>
        </div>
      )}

      {/* Upstream zone */}
      {upstreamRoles.length > 0 && (
        <section
          className={cn(
            'rounded-2xl border p-4 space-y-3',
            upstreamMissing && 'border-destructive/40 bg-destructive/5',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground font-heading flex items-center gap-1.5">
                <ArrowUp className="h-3.5 w-3.5" /> Who you bill — required
              </p>
              <p className="font-heading font-semibold text-sm mt-0.5">{upstreamLabel}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => setDialogZone('upstream')}>
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>

          {upstreamMembers.length > 0 ? (
            <div className="space-y-2">
              {upstreamMembers.map((m) => (
                <MemberRow key={m.id} member={m} onRemove={() => removeMember(m.id)} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              Add the {upstreamLabel.toLowerCase()} you're working for. If they're not on Ontime yet,
              use "Invite by Email" and we'll send them an invitation.
            </p>
          )}
        </section>
      )}

      {/* Downstream zone */}
      {downstreamRoles.length > 0 && (
        <section
          className={cn(
            'rounded-2xl border p-4 space-y-3',
            downstreamMissing && 'border-destructive/40 bg-destructive/5',
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground font-heading flex items-center gap-1.5">
                <ArrowDown className="h-3.5 w-3.5" /> Who bills you — required
              </p>
              <p className="font-heading font-semibold text-sm mt-0.5">{downstreamLabel}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={selfPerform}
              onClick={() => setDialogZone('downstream')}
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add
            </Button>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border">
            <ElongatedSwitch
              id="self-perform"
              checked={selfPerform}
              onCheckedChange={handleSelfPerform}
            />
            <Label htmlFor="self-perform" className="text-sm cursor-pointer leading-snug">
              We self-perform this work — no {downstreamLabel.toLowerCase()} to invite.
            </Label>
          </div>

          {!selfPerform && (
            downstreamMembers.length > 0 ? (
              <div className="space-y-2">
                {downstreamMembers.map((m) => (
                  <MemberRow key={m.id} member={m} onRemove={() => removeMember(m.id)} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-destructive flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                Add at least one {downstreamLabel.toLowerCase()}, or turn on self-performing above.
              </p>
            )
          )}
        </section>
      )}

      {/* Suppliers / anything else */}
      <section className="rounded-2xl border p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground font-heading">
              Suppliers & others — optional
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You can also add these later from the project team page.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setDialogZone(null) || setDialogZone('other' as never)}>
            <Plus className="h-4 w-4 mr-1.5" />
            Add
          </Button>
        </div>

        {otherMembers.length > 0 && (
          <div className="space-y-2">
            {otherMembers.map((m) => (
              <MemberRow key={m.id} member={m} onRemove={() => removeMember(m.id)} />
            ))}
          </div>
        )}
      </section>

      <AddTeamMemberDialog
        open={dialogZone !== null}
        onOpenChange={(open) => !open && setDialogZone(null)}
        creatorOrgType={creatorOrgType || null}
        restrictRoles={
          dialogZone === 'upstream'
            ? upstreamRoles
            : dialogZone === 'downstream'
              ? downstreamRoles
              : undefined
        }
        title={
          dialogZone === 'upstream'
            ? `Add ${upstreamLabel}`
            : dialogZone === 'downstream'
              ? `Add ${downstreamLabel}`
              : 'Add Team Member'
        }
        onMemberAdded={() => {}}
        mode="collect"
        onCollect={(member) => {
          onTeamChange([...team, member]);
          setDialogZone(null);
        }}
      />
    </div>
  );
}
