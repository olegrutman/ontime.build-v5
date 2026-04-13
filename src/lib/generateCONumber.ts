import { supabase } from '@/integrations/supabase/client';

function getProjectCode(name: string | undefined): string {
  if (!name) return 'XXX';
  const cleaned = name.replace(/^(the\s+)/i, '').trim();
  return cleaned.substring(0, 3).toUpperCase();
}

function getOrgInitials(name: string | undefined): string {
  if (!name) return 'XX';
  return name.replace(/^(the\s+)/i, '').trim().substring(0, 2).toUpperCase();
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
  // Fetch project name + org names in parallel
  const [projectRes, creatorRes, upstreamRes] = await Promise.all([
    supabase.from('projects').select('name').eq('id', projectId).single(),
    supabase.from('organizations').select('name').eq('id', creatorOrgId).single(),
    assignedToOrgId
      ? supabase.from('organizations').select('name').eq('id', assignedToOrgId).single()
      : Promise.resolve({ data: null }),
  ]);

  const projCode = getProjectCode(projectRes.data?.name);
  const creatorInit = getOrgInitials(creatorRes.data?.name);
  const upstreamInit = assignedToOrgId ? getOrgInitials(upstreamRes.data?.name) : 'XX';

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
