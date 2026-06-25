import { useEffect, useRef, useState } from 'react';
import { Search, FolderOpen, FileText, Truck, Users, X } from 'lucide-react';
import { PROJECTS, URGENT_ORDERS } from './mockData';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onNavigateProject: (id: string) => void;
}

const GROUPS = [
  {
    label: 'Projects',
    icon: FolderOpen,
    items: PROJECTS.map(p => ({ id: p.id, label: p.name, sub: p.phase, type: 'project' as const })),
  },
  {
    label: 'Orders',
    icon: Truck,
    items: URGENT_ORDERS.slice(0, 3).map(o => ({ id: o.id, label: o.id, sub: o.title, type: 'order' as const })),
  },
  {
    label: 'Invoices',
    icon: FileText,
    items: [
      { id: 'INV-1048', label: 'INV-1048', sub: 'Cherry Hills — $18,400', type: 'invoice' as const },
      { id: 'INV-1047', label: 'INV-1047', sub: 'Hardware & fasteners — $4,200', type: 'invoice' as const },
    ],
  },
  {
    label: 'Crew',
    icon: Users,
    items: [
      { id: 'c1', label: 'Mike Rivera', sub: 'Project Manager', type: 'crew' as const },
      { id: 'c2', label: 'Sara Lin', sub: 'Field Engineer', type: 'crew' as const },
    ],
  },
];

export function CommandPalette({ open, onClose, onNavigateProject }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setQuery('');
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) onClose();
        else onClose(); // toggle handled by parent
      }
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, onClose]);

  if (!open) return null;

  const q = query.toLowerCase();
  const filtered = GROUPS.map(g => ({
    ...g,
    items: g.items.filter(i => i.label.toLowerCase().includes(q) || i.sub.toLowerCase().includes(q)),
  })).filter(g => g.items.length > 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-[560px] mx-4 bg-[#0D1F3C] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-[scaleIn_180ms_ease-out]"
        onClick={e => e.stopPropagation()}
        style={{ animation: 'scaleIn 180ms ease-out' }}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b border-white/10">
          <Search className="w-4 h-4 text-white/40" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search projects, orders, invoices, crew…"
            className="flex-1 bg-transparent text-white text-sm placeholder:text-white/30 outline-none"
          />
          <button onClick={onClose} className="text-white/40 hover:text-white/70">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="max-h-[360px] overflow-y-auto py-2">
          {filtered.length === 0 && (
            <p className="text-white/30 text-sm text-center py-8">No results found</p>
          )}
          {filtered.map(group => (
            <div key={group.label} className="mb-1">
              <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] uppercase tracking-wider text-white/30 font-medium">
                <group.icon className="w-3 h-3" />
                {group.label}
              </div>
              {group.items.map(item => (
                <button
                  key={item.id}
                  className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-white/5 transition-colors text-left"
                  onClick={() => {
                    if (item.type === 'project') onNavigateProject(item.id);
                    onClose();
                  }}
                >
                  <span className="text-white text-sm font-medium">{item.label}</span>
                  <span className="text-white/30 text-xs truncate">{item.sub}</span>
                </button>
              ))}
            </div>
          ))}
        </div>
        <div className="border-t border-white/10 px-4 py-2 flex items-center gap-4 text-[10px] text-white/25">
          <span>↑↓ Navigate</span>
          <span>↵ Open</span>
          <span>esc Close</span>
        </div>
      </div>
      <style>{`
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.97); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
