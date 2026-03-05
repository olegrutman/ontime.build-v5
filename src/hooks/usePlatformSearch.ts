import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface SearchResults {
  organizations: Array<{ id: string; name: string; type: string }>;
  users: Array<{ user_id: string; email: string; full_name: string | null }>;
  projects: Array<{ id: string; name: string; status: string }>;
}

export function usePlatformSearch() {
  const [results, setResults] = useState<SearchResults>({ organizations: [], users: [], projects: [] });
  const [searching, setSearching] = useState(false);

  const search = async (query: string) => {
    if (!query || query.length < 2) {
      setResults({ organizations: [], users: [], projects: [] });
      return;
    }

    setSearching(true);
    const q = `%${query}%`;

    const [orgsRes, usersRes, projectsRes] = await Promise.all([
      supabase.from('organizations').select('id, name, type').ilike('name', q).limit(10),
      supabase.from('profiles').select('user_id, email, full_name').or(`email.ilike.${q},full_name.ilike.${q}`).limit(10),
      supabase.from('projects').select('id, name, status').ilike('name', q).limit(10),
    ]);

    setResults({
      organizations: (orgsRes.data || []) as any[],
      users: (usersRes.data || []) as any[],
      projects: (projectsRes.data || []) as any[],
    });
    setSearching(false);
  };

  return { results, searching, search };
}
