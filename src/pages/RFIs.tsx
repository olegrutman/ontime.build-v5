import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/layout/AppSidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import { TopBar } from '@/components/layout/TopBar';
import { useDefaultSidebarOpen } from '@/hooks/use-sidebar-default';
import { RFIsTab } from '@/components/rfi';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface ProjectOption {
  id: string;
  name: string;
}

export default function RFIs() {
  const { user } = useAuth();
  const defaultOpen = useDefaultSidebarOpen();
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');

  useEffect(() => {
    if (!user) return;
    supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .then(({ data }) => {
        if (data && data.length > 0) {
          setProjects(data);
          setSelectedProjectId(data[0].id);
        }
      });
  }, [user]);

  return (
    <SidebarProvider defaultOpen={defaultOpen}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset className="flex flex-col flex-1">
          <TopBar title="RFIs" />
          <main className="flex-1 overflow-auto">
            <div className="max-w-5xl mx-auto w-full p-4 sm:p-6 pb-20 space-y-4">
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedProjectId && <RFIsTab projectId={selectedProjectId} />}
            </div>
          </main>
        </SidebarInset>
        <BottomNav />
      </div>
    </SidebarProvider>
  );
}
