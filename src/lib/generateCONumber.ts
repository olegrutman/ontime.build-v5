import { supabase } from '@/integrations/supabase/client';

function getProjectCode(name: string | undefined | null, fallbackId: string): string {
  if (!name) return fallbackId.replace(/-/g, '').substring(0, 3).toUpperCase();
  const cleaned = name.replace(/^(the\s+)/i, '').trim();
  return cleaned.substring(0, 3).toUpperCase() || fallbackId.substring(0, 3).toUpperCase();
}

function getOrgInitials(name: string | undefined | null, fallbackId: string | null): string {
  if (!name) return (fallbackId ?? 'XX').replace(/-/g, '').substring(0, 2).toUpperCase();
  return name.replace(/^(the\s+)/i, '').trim().substring(0, 2).toUpperCase() || (fallbackId ?? 'XX').substring(0, 2).toUpperCase();
}

export async function generateCONumber({
  projectId,
  creatorOrgId,
  assignedToOrgId,
  isTM,
}: {
  projectId: string;
  creatorOrgId: string;
  assignedToOrgId: string | null;
  isTM: boolean;
}): Promise<string> {
  // Fetch project name + org names in parallel (maybeSingle to avoid throw)
  const [projectRes, creatorRes, upstreamRes] = await Promise.all([
    supabase.from('projects').select('name').eq('id', projectId).maybeSingle(),
    supabase.from('organizations').select('name').eq('id', creatorOrgId).maybeSingle(),
    assignedToOrgId
      ? supabase.from('organizations').select('name').eq('id', assignedToOrgId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const projCode = getProjectCode(projectRes.data?.name, projectId);
  const creatorInit = getOrgInitials(creatorRes.data?.name, creatorOrgId);
  const upstreamInit = assignedToOrgId
    ? getOrgInitials(upstreamRes.data?.name, assignedToOrgId)
    : 'NA';

  const typePrefix = isTM ? 'WO' : 'CO';
  const prefix = `${typePrefix}-${projCode}-${creatorInit}-${upstreamInit}`;

  // Find max existing sequence
  const { data: existing } = await supabase
    .from('change_orders')
    .select('co_number')
    .eq('project_id', projectId);

  let maxSeq = 0;
  if (existing) {
    const pattern = new RegExp(`^${prefix}-(\\d+)$`);
    for (const row of existing) {
      if (!row.co_number) continue;
      const match = row.co_number.match(pattern);
      if (match) {
        const num = parseInt(match[1], 10);
        if (num > maxSeq) maxSeq = num;
      }
    }
  }

  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
}
