import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle2, Circle } from 'lucide-react';
import { ContextBar } from '@/components/demo-v2/ContextBar';
import { CommandPalette } from '@/components/demo-v2/CommandPalette';
import { ActivityFeed } from '@/components/demo-v2/ActivityFeed';
import { BudgetRingChart } from '@/components/demo-v2/BudgetRingChart';
import { BottomSheet } from '@/components/demo-v2/BottomSheet';
import { MobileBottomNav } from '@/components/demo-v2/MobileBottomNav';
import { PROJECTS, BUDGET_LINES, ORDER_ITEMS, FIELD_TASKS } from '@/components/demo-v2/mockData';

type Tab = 'budget' | 'orders' | 'field';

function formatK(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n < 0) return `-$${Math.abs(n / 1000).toFixed(1)}K`;
  return `$${(n / 1000).toFixed(1)}K`;
}

export default function DemoV2ProjectOverview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [cmdOpen, setCmdOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('budget');
  const [heroBarWidth, setHeroBarWidth] = useState(0);
  const [sheet, setSheet] = useState<{ title: string; amount: string; meta: { label: string; value: string }[] } | null>(null);
  const [tasks, setTasks] = useState(FIELD_TASKS);
  const [orderFilter, setOrderFilter] = useState('All');

  const project = PROJECTS.find(p => p.id === id) || PROJECTS[0];

  useEffect(() => {
    const t = setTimeout(() => setHeroBarWidth(project.percentComplete), 300);
    return () => clearTimeout(t);
  }, [project.percentComplete]);

  const filteredOrders = orderFilter === 'All' ? ORDER_ITEMS : ORDER_ITEMS.filter(o => o.type === orderFilter);

  return (
    <div className="min-h-screen bg-[#0A1628] text-white">
      <ContextBar
        breadcrumbs={[
          { label: 'Dashboard', onClick: () => navigate('/demo-v2') },
          { label: 'Projects' },
          { label: project.name },
        ]}
        onCommandPalette={() => setCmdOpen(true)}
        onBack={() => navigate('/demo-v2')}
      />
      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(o => !o)}
        onNavigateProject={(pid) => navigate(`/demo-v2/project/${pid}`)}
      />

      <main className="pt-[52px] pb-24 min-[900px]:pb-8">
        <div className="max-w-[1400px] mx-auto px-4 py-4">
          {/* Back button */}
          <button
            onClick={() => navigate('/demo-v2')}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/70 text-sm mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex gap-8">
            {/* Left panel — 340px on desktop */}
            <div className="flex-1 min-[900px]:w-[340px] min-[900px]:max-w-[340px] min-[900px]:flex-none min-w-0">
              {/* Hero card */}
              <div
                className="rounded-xl p-5 mb-4 relative overflow-hidden"
                style={{
                  background: `radial-gradient(ellipse at 30% 20%, ${project.color}25, transparent 60%), #0D1F3C`,
                }}
              >
                <span className="text-[10px] uppercase tracking-wider font-semibold" style={{ color: project.color }}>
                  {project.phase}
                </span>
                <h1 className="text-[28px] font-bold text-white mt-1 leading-tight">
                  {project.name}
                </h1>
                <p className="text-white/40 text-xs mt-1">{project.location}</p>
                <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                  {project.status}
                </span>

                {/* 3 KPI tiles */}
                <div className="grid grid-cols-3 gap-2 mt-4">
                  {[
                    { label: 'Contract', value: formatK(project.contractValue) },
                    { label: 'Paid', value: formatK(project.paid) },
                    { label: 'Pending', value: formatK(project.pending) },
                  ].map(t => (
                    <div key={t.label} className="bg-white/5 rounded-lg px-2.5 py-2 text-center">
                      <p className="text-[9px] uppercase tracking-wider text-white/30">{t.label}</p>
                      <p className="text-white text-sm font-bold mt-0.5">
                        {t.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Progress bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-[10px] text-white/40 mb-1">
                    <span>Progress</span>
                    <span>{project.percentComplete}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10">
                    <div
                      className="h-full rounded-full transition-all duration-[1200ms] ease-out"
                      style={{ width: `${heroBarWidth}%`, background: project.color }}
                    />
                  </div>
                </div>
              </div>

              {/* Segment tabs */}
              <div className="flex gap-1 bg-white/5 rounded-lg p-1 mb-4">
                {(['budget', 'orders', 'field'] as Tab[]).map(t => (
                  <button
                    key={t}
                    onClick={() => setTab(t)}
                    className={`flex-1 py-2 text-xs font-medium rounded-md transition-all capitalize ${
                      tab === t ? 'bg-[#0D1F3C] text-white shadow-sm' : 'text-white/40 hover:text-white/60'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              {tab === 'budget' && (
                <div>
                  <div className="bg-[#0D1F3C] rounded-lg px-3.5 py-3 flex justify-between items-center mb-3">
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-white/30">Remaining</p>
                      <p className="text-white font-bold text-lg">
                        {formatK(project.contractValue - project.paid - project.pending)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] uppercase tracking-wider text-white/30">Total</p>
                      <p className="text-white/60 text-sm">
                        {formatK(project.contractValue)}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1">
                    {BUDGET_LINES.map((line, i) => {
                      const pct = line.total > 0 ? Math.round((line.spent / line.total) * 100) : 0;
                      return (
                        <button
                          key={line.id}
                          onClick={() => setSheet({
                            title: line.name,
                            amount: formatK(line.spent),
                            meta: [
                              { label: 'Supplier', value: line.supplier },
                              { label: 'Budget', value: formatK(line.total) },
                              { label: 'Spent', value: formatK(line.spent) },
                              { label: 'Remaining', value: formatK(line.total - line.spent) },
                            ],
                          })}
                          className="w-full bg-[#0D1F3C] rounded-lg p-3 text-left hover:bg-white/[0.04] transition-colors opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
                          style={{ animationDelay: `${i * 50}ms` }}
                        >
                          <div className="flex justify-between items-start mb-1.5">
                            <div>
                              <p className="text-white text-sm font-medium">{line.name}</p>
                              <p className="text-white/30 text-[11px]">{line.supplier}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-white text-sm">
                                {formatK(line.spent)} / {formatK(line.total)}
                              </p>
                              {line.total > 0 && (
                                <p className="text-white/30 text-[10px]">{pct}%</p>
                              )}
                            </div>
                          </div>
                          {line.total > 0 && (
                            <div className="h-1 rounded-full bg-white/5">
                              <div
                                className="h-full rounded-full bg-[#F5A623] transition-all duration-[1200ms] ease-out"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {tab === 'orders' && (
                <div>
                  <div className="flex gap-1.5 flex-wrap mb-3">
                    {['All', 'PO', 'WO', 'INV', 'CO'].map(f => (
                      <button
                        key={f}
                        onClick={() => setOrderFilter(f)}
                        className={`px-2.5 py-1 text-[11px] rounded-full font-medium transition-colors ${
                          orderFilter === f ? 'bg-[#0D1F3C] text-white' : 'bg-white/5 text-white/40 hover:text-white/60'
                        }`}
                      >
                        {f === 'All' ? 'All' : `${f}s`}
                      </button>
                    ))}
                  </div>
                  <div className="space-y-1">
                    {filteredOrders.map((order, i) => (
                      <button
                        key={order.id}
                        onClick={() => setSheet({
                          title: `${order.id} — ${order.description}`,
                          amount: `$${order.amount.toLocaleString()}`,
                          meta: [
                            { label: 'Type', value: order.type },
                            { label: 'Status', value: order.status },
                            { label: 'ID', value: order.id },
                            { label: 'Due', value: 'Mar 28, 2026' },
                          ],
                        })}
                        className="w-full flex items-center gap-3 p-3 rounded-lg bg-[#0D1F3C] hover:bg-white/[0.04] transition-colors text-left opacity-0 animate-[fadeUp_400ms_ease-out_forwards]"
                        style={{ borderLeft: `3px solid ${order.borderColor}`, animationDelay: `${i * 50}ms` }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-white/50 text-[11px] font-mono">{order.id}</p>
                          <p className="text-white text-sm">{order.description}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-white text-sm">
                            ${order.amount.toLocaleString()}
                          </p>
                          <span
                            className="text-[10px] px-1.5 py-0.5 rounded font-medium"
                            style={{ background: `${order.borderColor}20`, color: order.borderColor }}
                          >
                            {order.status}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {tab === 'field' && (
                <div className="space-y-1">
                  {tasks.map((task, i) => (
                    <div
                      key={task.id}
                      className={`flex items-start gap-3 p-3 rounded-lg bg-[#0D1F3C] opacity-0 animate-[fadeUp_400ms_ease-out_forwards] ${task.completed ? 'opacity-50' : ''}`}
                      style={{ animationDelay: `${i * 50}ms` }}
                    >
                      <button
                        onClick={() => setTasks(ts => ts.map(t => t.id === task.id ? { ...t, completed: !t.completed } : t))}
                        className="mt-0.5 shrink-0"
                      >
                        {task.completed ? (
                          <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        ) : (
                          <Circle className="w-5 h-5 text-white/20 hover:text-white/40 transition-colors" />
                        )}
                      </button>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${task.completed ? 'line-through text-white/30' : 'text-white'}`}>
                          {task.title}
                        </p>
                        <p className="text-white/25 text-[11px]">{task.subtitle}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[10px] text-white/30">{task.assignee}</span>
                          <span className="text-[10px] text-white/20">{task.dueDate}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right panel — desktop only */}
            <aside className="hidden min-[900px]:block flex-1 min-w-0">
              <div className="sticky top-[68px] space-y-6">
                <BudgetRingChart />
                <ActivityFeed />
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
