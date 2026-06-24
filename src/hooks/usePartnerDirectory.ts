import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

export interface PartnerOrg {
  org_id: string;
  org_code: string;
  name: string;
  type: string;
  project_count: number;
  most_recent_project: string | null;
  most_recent_date: string | null;
}

export interface PartnerPerson {
  key: string;
  user_id: string | null;
  name: string;
  email: string;
  org_name: string;
  org_type: string;
  role: string;
  project_count: number;
  most_recent_project: string | null;
  most_recent_date: string | null;
}

export const ORG_TYPE_ORDER = ['GC', 'TC', 'FC', 'SUPPLIER'] as const;

const ROLE_TO_ORG_TYPE: Record<string, string> = {
  'General Contractor': 'GC',
  'Trade Contractor': 'TC',
  'Field Crew': 'FC',
  'Supplier': 'SUPPLIER',
};

export function usePartnerDirectory() {
  const { user, userOrgRoles } = useAuth();
  const [partners, setPartners] = useState<PartnerOrg[]>([]);
  const [people, setPeople] = useState<PartnerPerson[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'organizations' | 'people'>('organizations');

  const currentOrg = userOrgRoles[0]?.organization;

  useEffect(() => {
    if (currentOrg?.id) {
      fetchPartners();
    }
  }, [currentOrg?.id]);

  const fetchPartners = async () => {
    if (!currentOrg?.id) return;

    setLoading(true);

    const { data: myProjects, error: projectsError } = await supabase
      .from('project_team')
      .select('project_id')
      .eq('org_id', currentOrg.id)
      .eq('status', 'Accepted');

    if (projectsError || !myProjects?.length) {
      setPartners([]);
      setPeople([]);
      setLoading(false);
      return;
    }

    const projectIds = myProjects.map((p) => p.project_id);

    const { data: teamMembers, error: teamError } = await supabase
      .from('project_team')
      .select(`
        org_id,
        project_id,
        user_id,
        invited_name,
        invited_email,
        invited_org_name,
        role,
        projects!inner (
          id,
          name,
          updated_at
        ),
        organizations!inner (
          id,
          org_code,
          name,
          type
        )
      `)
      .in('project_id', projectIds)
      .neq('org_id', currentOrg.id)
      .eq('status', 'Accepted');

    if (teamError) {
      console.error('Error fetching team members:', teamError);
      setPartners([]);
      setPeople([]);
      setLoading(false);
      return;
    }

    // === Build org map ===
    const orgMap = new Map<string, PartnerOrg>();
    const projectsByOrg = new Map<string, {
      projectIds: Set<string>;
      mostRecent: { name: string; date: string } | null;
    }>();

    // === Build people map ===
    const peopleMap = new Map<string, PartnerPerson>();
    const projectsByPerson = new Map<string, {
      projectIds: Set<string>;
      mostRecent: { name: string; date: string } | null;
    }>();

    teamMembers?.forEach((member) => {
      const org = member.organizations as unknown as { id: string; org_code: string; name: string; type: string };
      const project = member.projects as unknown as { id: string; name: string; updated_at: string };
      if (!org || !project) return;

      // --- Org aggregation ---
      if (!orgMap.has(org.id)) {
        orgMap.set(org.id, {
          org_id: org.id,
          org_code: org.org_code,
          name: org.name,
          type: org.type,
          project_count: 0,
          most_recent_project: null,
          most_recent_date: null,
        });
      }

      if (!projectsByOrg.has(org.id)) {
        projectsByOrg.set(org.id, { projectIds: new Set(), mostRecent: null });
      }

      const orgEntry = projectsByOrg.get(org.id)!;
      orgEntry.projectIds.add(member.project_id);

      if (!orgEntry.mostRecent || new Date(project.updated_at) > new Date(orgEntry.mostRecent.date)) {
        orgEntry.mostRecent = { name: project.name, date: project.updated_at };
      }

      // --- People aggregation ---
      const personKey = member.user_id || member.invited_email || '';
      if (!personKey) return;

      if (!peopleMap.has(personKey)) {
        const name = member.invited_name || member.invited_email || 'Unknown';
        const orgType = ROLE_TO_ORG_TYPE[member.role || ''] || org.type;

        peopleMap.set(personKey, {
          key: personKey,
          user_id: member.user_id,
          name,
          email: member.invited_email || '',
          org_name: member.invited_org_name || org.name,
          org_type: orgType,
          role: member.role || '',
          project_count: 0,
          most_recent_project: null,
          most_recent_date: null,
        });
      }

      if (!projectsByPerson.has(personKey)) {
        projectsByPerson.set(personKey, { projectIds: new Set(), mostRecent: null });
      }

      const personEntry = projectsByPerson.get(personKey)!;
      personEntry.projectIds.add(member.project_id);

      if (!personEntry.mostRecent || new Date(project.updated_at) > new Date(personEntry.mostRecent.date)) {
        personEntry.mostRecent = { name: project.name, date: project.updated_at };
      }
    });

    // Finalize org counts
    projectsByOrg.forEach((data, orgId) => {
      const partner = orgMap.get(orgId);
      if (partner) {
        partner.project_count = data.projectIds.size;
        partner.most_recent_project = data.mostRecent?.name || null;
        partner.most_recent_date = data.mostRecent?.date || null;
      }
    });

    // Finalize people counts
    projectsByPerson.forEach((data, personKey) => {
      const person = peopleMap.get(personKey);
      if (person) {
        person.project_count = data.projectIds.size;
        person.most_recent_project = data.mostRecent?.name || null;
        person.most_recent_date = data.mostRecent?.date || null;
      }
    });

    setPartners(Array.from(orgMap.values()));
    setPeople(Array.from(peopleMap.values()));
    setLoading(false);
  };

  // Filter partners by search query
  const filteredPartners = useMemo(() => {
    if (!searchQuery.trim()) return partners;
    const query = searchQuery.toLowerCase();
    return partners.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.org_code.toLowerCase().includes(query) ||
        (p.most_recent_project && p.most_recent_project.toLowerCase().includes(query))
    );
  }, [partners, searchQuery]);

  // Filter people by search query
  const filteredPeople = useMemo(() => {
    if (!searchQuery.trim()) return people;
    const query = searchQuery.toLowerCase();
    return people.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.org_name.toLowerCase().includes(query) ||
        (p.most_recent_project && p.most_recent_project.toLowerCase().includes(query))
    );
  }, [people, searchQuery]);

  // Group partners by type
  const groupedPartners = useMemo(() => {
    const groups: Record<string, PartnerOrg[]> = {};
    ORG_TYPE_ORDER.forEach((type) => {
      groups[type] = filteredPartners
        .filter((p) => p.type === type)
        .sort((a, b) => {
          if (a.most_recent_date && b.most_recent_date) {
            return new Date(b.most_recent_date).getTime() - new Date(a.most_recent_date).getTime();
          }
          if (a.most_recent_date) return -1;
          if (b.most_recent_date) return 1;
          return b.project_count - a.project_count;
        });
    });
    return groups;
  }, [filteredPartners]);

  // Group people by org type
  const groupedPeople = useMemo(() => {
    const groups: Record<string, PartnerPerson[]> = {};
    ORG_TYPE_ORDER.forEach((type) => {
      groups[type] = filteredPeople
        .filter((p) => p.org_type === type)
        .sort((a, b) => {
          if (a.most_recent_date && b.most_recent_date) {
            return new Date(b.most_recent_date).getTime() - new Date(a.most_recent_date).getTime();
          }
          if (a.most_recent_date) return -1;
          if (b.most_recent_date) return 1;
          return b.project_count - a.project_count;
        });
    });
    return groups;
  }, [filteredPeople]);

  return {
    user,
    loading,
    searchQuery,
    setSearchQuery,
    activeTab,
    setActiveTab,
    partners,
    people,
    filteredPartners,
    filteredPeople,
    groupedPartners,
    groupedPeople,
  };
}
