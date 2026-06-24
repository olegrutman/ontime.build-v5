import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ContextBar } from '@/components/demo-v2/ContextBar';
import { CommandPalette } from '@/components/demo-v2/CommandPalette';
import { KpiCard } from '@/components/demo-v2/KpiCard';
import { ProjectCard } from '@/components/demo-v2/ProjectCard';
import { UrgentItem } from '@/components/demo-v2/UrgentItem';
import { ActivityFeed } from '@/components/demo-v2/ActivityFeed';
import { BottomSheet } from '@/components/demo-v2/BottomSheet';
import { MobileBottomNav } from '@/components/demo-v2/MobileBottomNav';
import { KPI_DATA, PROJECTS, URGENT_ORDERS } from '@/components/demo-v2/mockData';

export default function DemoV2Dashboard() {
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [sheet, setSheet] = useState<{ title: string; amount: string; meta: { label: string; value: string }[] } | null>(null);

  const handleOpenSheet = (order: typeof URGENT_ORDERS[0]) => {
    setSheet({
      title: order.title,
      amount: `$${order.amount.toLocaleString()}`,
      meta: [
        { label: 'Type', value: order.type },
        { label: 'Status', value: order.status },
        { label: 'Project', value: order.id },
        { label: 'Due', value: 'Mar 28, 2026' },
      ],
    });
  };

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <ContextBar
        breadcrumbs={[{ label: 'Dashboard' }]}
        onCommandPalette={() => setCmdOpen(true)}
      />
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(o => !o)}
        onNavigateProject={(id) => navigate(`/demo-v2/project/${id}`)}
      />

      <main className="pt-[52px] pb-24 min-[900px]:pb-8">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          <div className="flex gap-8">
            {/* Left column */}
            <div className="flex-1 min-w-0">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 min-[900px]:grid-cols-4 gap-3 mb-8">
                {KPI_DATA.map((kpi, i) => (
                  <KpiCard key={kpi.label} {...kpi} index={i} />
                ))}
              </div>

              {/* Your Projects */}
              <section className="mb-8">
                <h2
                  className="text-[11px] uppercase tracking-wider text-white/30 font-medium mb-3"
                >
                  Your Projects
                </h2>
                <div className="space-y-2">
                  {PROJECTS.map((project, i) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      index={i}
                      onViewProject={(id) => navigate(`/demo-v2/project/${id}`)}
                    />
                  ))}
                </div>
              </section>

              {/* Needs Attention */}
              <section>
                <h2 className="text-[11px] uppercase tracking-wider text-white/30 font-medium mb-3">
                  Needs Attention
                </h2>
                <div className="space-y-1">
                  {URGENT_ORDERS.map((order, i) => (
                    <UrgentItem
                      key={order.id}
                      order={order}
                      index={i}
                      onClick={() => handleOpenSheet(order)}
                    />
                  ))}
                </div>
              </section>
            </div>

            {/* Right column — desktop only */}
            <aside className="hidden min-[900px]:block w-[300px] shrink-0">
              <div className="sticky top-[68px] space-y-6">
                <ActivityFeed />

                {/* Mini portfolio */}
                <div>
                  <h3 className="text-[10px] uppercase tracking-wider text-white/30 font-medium px-1 mb-2">
                    Portfolio
                  </h3>
                  <div className="space-y-2">
                    {PROJECTS.map(p => (
                      <button
                        key={p.id}
                        onClick={() => navigate(`/demo-v2/project/${p.id}`)}
                        className="w-full flex items-center gap-2 px-2 py-1.5 rounded hover:bg-white/[0.03] transition-colors"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: p.color }} />
                        <span className="text-xs text-white/70 flex-1 text-left truncate">{p.name}</span>
                        <span className="text-[10px] text-white/30">{p.percentComplete}%</span>
                        <div className="w-12 h-1 rounded-full bg-white/5">
                          <div className="h-full rounded-full" style={{ width: `${p.percentComplete}%`, background: p.color }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </main>

      <BottomSheet
        open={!!sheet}
        onClose={() => setSheet(null)}
        title={sheet?.title || ''}
        amount={sheet?.amount}
        meta={sheet?.meta}
        actions={[
          { label: 'Approve', variant: 'primary', onClick: () => setSheet(null) },
          { label: 'Edit', variant: 'secondary', onClick: () => setSheet(null) },
          { label: 'Dismiss', variant: 'ghost', onClick: () => setSheet(null) },
        ]}
      />

      <MobileBottomNav active="home" onNavigate={() => {}} onSearch={() => setCmdOpen(true)} />

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
