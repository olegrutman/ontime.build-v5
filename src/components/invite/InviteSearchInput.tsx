import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, User, Mail, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { OrgType, ORG_TYPE_LABELS } from '@/types/organization';

interface InviteTarget {
  result_type: 'organization' | 'person' | 'email';
  id: string | null;
  display_name: string;
  organization_name: string | null;
  email: string | null;
  city_state: string | null;
  org_type: OrgType | null;
}

interface InviteSearchInputProps {
  onSelect: (target: InviteTarget) => void;
  placeholder?: string;
  className?: string;
}

export function InviteSearchInput({
  onSelect,
  placeholder = 'Search by name, organization, or email...',
  className,
}: InviteSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<InviteTarget[]>([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 3) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('search_invite_targets', {
        _query: query,
        _limit: 10,
      });

      setLoading(false);

      if (error) {
        console.error('Search error:', error);
        setResults([]);
      } else {
        setResults((data || []) as InviteTarget[]);
        setIsOpen(true);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev < results.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : results.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        break;
    }
  };

  const handleSelect = (target: InviteTarget) => {
    onSelect(target);
    setQuery('');
    setResults([]);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'organization':
        return <Building2 className="w-4 h-4 text-muted-foreground" />;
      case 'person':
        return <User className="w-4 h-4 text-muted-foreground" />;
      case 'email':
        return <Mail className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Search className="w-4 h-4 text-muted-foreground" />;
    }
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 3 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="pl-10 pr-10"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-64 overflow-auto">
          {results.length === 0 && query.length >= 3 && !loading && (
            <div className="p-3 text-sm text-muted-foreground">
              No results found.{' '}
              <button
                type="button"
                className="text-primary hover:underline"
                onClick={() => {
                  if (query.includes('@')) {
                    handleSelect({
                      result_type: 'email',
                      id: null,
                      display_name: 'Invite by email',
                      organization_name: null,
                      email: query,
                      city_state: null,
                      org_type: null,
                    });
                  }
                }}
              >
                Invite "{query}" by email
              </button>
            </div>
          )}

          {results.map((result, index) => (
            <button
              key={`${result.result_type}-${result.id || result.email}`}
              type="button"
              className={cn(
                'w-full px-3 py-2 text-left flex items-start gap-3 hover:bg-accent transition-colors',
                highlightedIndex === index && 'bg-accent'
              )}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setHighlightedIndex(index)}
            >
              <div className="mt-0.5">{getIcon(result.result_type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">{result.display_name}</span>
                  {result.org_type && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {ORG_TYPE_LABELS[result.org_type]}
                    </Badge>
                  )}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {result.result_type === 'person' && (
                    <>
                      {result.organization_name}
                      {result.email && ` • ${result.email}`}
                      {result.city_state && result.city_state !== ', ' && ` • ${result.city_state}`}
                    </>
                  )}
                  {result.result_type === 'organization' && result.city_state && result.city_state !== ', ' && (
                    <>{result.city_state}</>
                  )}
                  {result.result_type === 'email' && result.email}
                </div>
              </div>
            </button>
          ))}

          {query.length >= 3 && query.length < 5 && results.length > 5 && (
            <div className="px-3 py-2 text-xs text-muted-foreground border-t">
              Type more to narrow results
            </div>
          )}
        </div>
      )}
    </div>
  );
}
