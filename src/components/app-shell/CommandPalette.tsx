import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Folder, FileText, Handshake, Bell, MessageSquareMore, Home, Settings, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
}

interface SearchItem {
  id: string;
  label: string;
  group: string;
  icon: React.ElementType;
  path: string;
}

const STATIC_ROUTES: SearchItem[] = [
  { id: 'nav-dashboard', label: 'Dashboard', group: 'Navigation', icon: Home, path: '/dashboard' },
  { id: 'nav-partners', label: 'Partners', group: 'Navigation', icon: Handshake, path: '/partners' },
  { id: 'nav-reminders', label: 'Reminders', group: 'Navigation', icon: Bell, path: '/reminders' },
  { id: 'nav-rfis', label: 'RFIs', group: 'Navigation', icon: MessageSquareMore, path: '/rfis' },
  { id: 'nav-team', label: 'My Team', group: 'Navigation', icon: Users, path: '/org/team' },
  { id: 'nav-settings', label: 'Settings', group: 'Navigation', icon: Settings, path: '/settings' },
  { id: 'nav-profile', label: 'Profile', group: 'Navigation', icon: Settings, path: '/profile' },
];

export function CommandPalette({ open, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [query, setQuery] = useState('');
  const [projects, setProjects] = useState<SearchItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Load projects once
  useEffect(() => {
    if (!user) return;
    supabase
      .from('projects')
      .select('id, name')
      .order('name')
      .limit(50)
      .then(({ data }) => {
        if (data) {
          setProjects(
            data.map((p) => ({
              id: p.id,
              label: p.name,
              group: 'Projects',
              icon: Folder,
              path: `/project/${p.id}`,
            }))
          );
        }
      });
  }, [user]);

  const allItems = [...STATIC_ROUTES, ...projects];
  const filtered = query.trim()
    ? allItems.filter((i) => i.label.toLowerCase().includes(query.toLowerCase()))
    : allItems;

  const grouped = filtered.reduce<Record<string, SearchItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = [];
    acc[item.group].push(item);
    return acc;
  }, {});

  const flatFiltered = Object.values(grouped).flat();

  const handleSelect = useCallback(
    (item: SearchItem) => {
      navigate(item.path);
      onClose();
      setQuery('');
    },
    [navigate, onClose]
  );

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        setQuery('');
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, flatFiltered.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (flatFiltered[selectedIndex]) handleSelect(flatFiltered[selectedIndex]);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [open, flatFiltered, selectedIndex, handleSelect, onClose]);

  // Global ⌘K listener
  useEffect(() => {
    const handleGlobal = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (open) {
          onClose();
          setQuery('');
        }
      }
    };
    window.addEventListener('keydown', handleGlobal);
    return () => window.removeEventListener('keydown', handleGlobal);
  }, [open, onClose]);

  if (!open) return null;

  let flatIndex = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-foreground/20 backdrop-blur-sm" onClick={() => { onClose(); setQuery(''); }} />

      {/* Panel */}
      <div className="relative w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-scale-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-4 h-4 text-muted-foreground shrink-0" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects, pages…"
            className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground"
          />
          <kbd className="px-1.5 py-0.5 rounded bg-muted/40 text-[10px] text-muted-foreground font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[320px] overflow-y-auto py-2">
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group}>
              <div className="px-4 py-1.5 text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                {group}
              </div>
              {items.map((item) => {
                const thisIndex = flatIndex++;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors ${
                      thisIndex === selectedIndex
                        ? 'bg-primary/10 text-foreground'
                        : 'text-muted-foreground hover:bg-muted/30 hover:text-foreground'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
          {flatFiltered.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results found
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
