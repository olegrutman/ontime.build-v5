import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  LayoutDashboard,
  Settings2,
  DollarSign,
  AlertTriangle,
  MessageSquareMore,
  FileText,
  Receipt,
  Package,
  RotateCcw,
  CalendarDays,
  PenLine,
  ArrowLeft,
  Settings,
  Lock,
  LogOut,
  Search,
  Pin,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFeatureEnabled } from '@/components/auth/FeatureGate';
import { useAuth } from '@/hooks/useAuth';
import { useSidebarAttention } from '@/hooks/useSidebarAttention';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';

interface NavItem {
  key: string;
  label: string;
  icon: React.ElementType;
  route: string;
  featureKey?: string;
  hideForSupplier?: boolean;
  premium?: boolean;
}

interface NavSection {
  key: string;
  label: string;
  items: NavItem[];
}

function getNavSections(isTM: boolean): NavSection[] {
  return [
    {
      key: 'overview',
      label: 'Overview',
      items: [
        { key: 'overview', label: 'Overview', icon: LayoutDashboard, route: 'overview' },
        { key: 'setup', label: 'Project Info', icon: Settings2, route: 'setup' },
      ],
    },
    {
      key: 'scope',
      label: 'Scope & Contracts',
      items: [
        ...(!isTM
          ? [{ key: 'sov', label: 'Schedule of Values', icon: DollarSign, route: 'sov', featureKey: 'sov_contracts', hideForSupplier: true } as NavItem]
          : []),
        { key: 'change-orders', label: isTM ? 'Work Orders' : 'Change Orders', icon: AlertTriangle, route: 'change-orders', featureKey: 'change_orders', hideForSupplier: true },
        { key: 'rfis', label: 'RFIs', icon: MessageSquareMore, route: 'rfis', premium: true, hideForSupplier: true },
        { key: 'estimates', label: 'Estimates', icon: FileText, route: 'estimates', featureKey: 'supplier_estimates' },
      ],
    },
    {
      key: 'financials',
      label: 'Financials',
      items: [
        { key: 'invoices', label: 'Invoices', icon: Receipt, route: 'invoices', featureKey: 'invoicing' },
        { key: 'purchase-orders', label: 'Purchase Orders', icon: Package, route: 'purchase-orders', featureKey: 'purchase_orders' },
        { key: 'returns', label: 'Returns', icon: RotateCcw, route: 'returns', featureKey: 'returns_tracking' },
        { key: 'backcharges', label: 'Backcharges', icon: AlertTriangle, route: 'backcharges', hideForSupplier: true },
        { key: 'payment-apps', label: 'Payment Apps', icon: FileText, route: 'payment-apps', hideForSupplier: true },
      ],
    },
    {
      key: 'field',
      label: 'Field Ops',
      items: [
        { key: 'schedule', label: 'Schedule', icon: CalendarDays, route: 'schedule', featureKey: 'schedule_gantt', premium: true, hideForSupplier: true },
        { key: 'daily-log', label: 'Daily Log', icon: PenLine, route: 'daily-log', featureKey: 'daily_logs', premium: true, hideForSupplier: true },
      ],
    },
    {
      key: 'documents',
      label: 'Documents',
      items: [
        { key: 'settings', label: 'Settings', icon: Settings, route: 'settings' },
      ],
    },
  ];
}

// Pinned destinations differ by role. Suppliers live in the estimate→PO→invoice loop;
// GC/TC/FC pin the CO + invoice workflow.
const PINNED_KEYS_DEFAULT = ['overview', 'change-orders', 'invoices'];
const PINNED_KEYS_SUPPLIER = ['overview', 'estimates', 'purchase-orders'];

function AttentionBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="bg-amber-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] rounded-full flex items-center justify-center shrink-0 px-1">
      {count}
    </span>
  );
}

function NavRow({
  item,
  active,
  projectId,
  attentionCount,
  pinned,
}: {
  item: NavItem;
  active: boolean;
  projectId: string;
  attentionCount?: number;
  pinned?: boolean;
}) {
  const navigate = useNavigate();
  const enabled = useFeatureEnabled(item.featureKey as any);
  if (item.featureKey && !enabled) return null;
  const Icon = item.icon;
  return (
    <button
      onClick={() => navigate(`/project/${projectId}/${item.route}`)}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left w-full',
        active
          ? 'bg-white/15 text-white'
          : 'text-slate-300 hover:text-white hover:bg-white/10'
      )}
    >
      <Icon className="w-4 h-4 shrink-0" strokeWidth={1.8} />
      <span className="truncate flex-1">{item.label}</span>
      {pinned && !active && <Pin className="w-3 h-3 text-slate-500 shrink-0" />}
      {attentionCount && attentionCount > 0 ? <AttentionBadge count={attentionCount} /> : null}
      {item.premium && <Lock className="w-3 h-3 text-slate-500 shrink-0" />}
    </button>
  );
}

interface ProjectSidebarProps {
  isSupplier?: boolean;
  isTM?: boolean;
}

export function ProjectSidebar({ isSupplier = false, isTM = false }: ProjectSidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { profile, signOut, userOrgRoles } = useAuth();
  const attentionCounts = useSidebarAttention(id);
  const currentOrg = userOrgRoles[0]?.organization;
  const [query, setQuery] = useState('');

  const initials = profile?.full_name
    ? profile.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  const pathParts = location.pathname.split('/');
  const activeSection = pathParts[3] || 'overview';

  const sections = useMemo(() => getNavSections(isTM), [isTM]);

  // Flat list of every visible item for pinned + search filtering.
  const allItems = useMemo(
    () => sections.flatMap((s) => s.items.filter((i) => !(i.hideForSupplier && isSupplier))),
    [sections, isSupplier]
  );

  const pinnedKeys = isSupplier ? PINNED_KEYS_SUPPLIER : PINNED_KEYS_DEFAULT;
  const pinnedItems = pinnedKeys
    .map((k) => allItems.find((i) => i.key === k))
    .filter((i): i is NavItem => !!i);

  const q = query.trim().toLowerCase();
  const searchResults = q
    ? allItems.filter((i) => i.label.toLowerCase().includes(q))
    : null;

  if (!id) return null;

  return (
    <aside className="hidden md:flex flex-col w-[200px] xl:w-[220px] shrink-0 bg-[hsl(var(--foreground))] text-white fixed left-0 top-[52px] bottom-0 z-40">
      <nav className="flex-1 flex flex-col gap-0.5 p-3 pt-4 overflow-y-auto">
        {/* Back to Dashboard */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left text-slate-400 hover:text-white hover:bg-white/10"
        >
          <ArrowLeft className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Dashboard</span>
        </button>

        {/* Search / Jump to */}
        <div className="relative mt-2 mb-1">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Jump to…"
            className="w-full bg-white/5 focus:bg-white/10 text-[12px] text-white placeholder:text-slate-500 rounded-lg pl-7 pr-2 py-1.5 outline-none border border-transparent focus:border-white/15 transition-colors"
          />
        </div>

        {searchResults ? (
          <div className="space-y-0.5 mt-1">
            {searchResults.length === 0 ? (
              <p className="text-[12px] text-slate-500 px-3 py-2">No matches.</p>
            ) : (
              searchResults.map((item) => (
                <NavRow
                  key={item.key}
                  item={item}
                  active={activeSection === item.route}
                  projectId={id}
                  attentionCount={attentionCounts[item.route]}
                />
              ))
            )}
          </div>
        ) : (
          <>
            {/* Pinned */}
            {pinnedItems.length > 0 && (
              <div className="mt-2 mb-1">
                <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Pinned
                </div>
                <div className="space-y-0.5">
                  {pinnedItems.map((item) => (
                    <NavRow
                      key={`pin-${item.key}`}
                      item={item}
                      active={activeSection === item.route}
                      projectId={id}
                      attentionCount={attentionCounts[item.route]}
                      pinned
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Flat sections with plain labels — no accordions */}
            {sections.map((section) => {
              const visibleItems = section.items.filter(
                (item) => !(item.hideForSupplier && isSupplier)
              );
              if (visibleItems.length === 0) return null;

              return (
                <div key={section.key} className="mt-2">
                  <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    {section.label}
                  </div>
                  <div className="space-y-0.5">
                    {visibleItems.map((item) => (
                      <NavRow
                        key={item.key}
                        item={item}
                        active={activeSection === item.route}
                        projectId={id}
                        attentionCount={attentionCounts[item.route]}
                      />
                    ))}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </nav>

      {/* Bottom pinned — Logo, Profile, Sign out */}
      <div className="border-t border-white/10 p-3 space-y-0.5">
        {currentOrg?.logo_url && (
          <div className="px-3 pb-2">
            <img
              src={currentOrg.logo_url}
              alt={currentOrg.name || 'Company'}
              className="max-h-9 max-w-[140px] object-contain rounded"
            />
          </div>
        )}
        <button
          onClick={() => navigate('/profile')}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left w-full text-slate-300 hover:text-white hover:bg-white/10"
        >
          <Avatar className="h-6 w-6">
            <AvatarFallback className="text-[9px] bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="truncate">{profile?.full_name || 'Profile'}</span>
        </button>
        <button
          onClick={() => signOut()}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left w-full text-slate-300 hover:text-white hover:bg-white/10"
        >
          <LogOut className="w-4 h-4 shrink-0" strokeWidth={1.8} />
          <span>Sign out</span>
        </button>
      </div>
    </aside>
  );
}
