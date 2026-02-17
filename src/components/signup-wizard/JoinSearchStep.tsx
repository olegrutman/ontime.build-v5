import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Building2, MapPin, ArrowLeft, Loader2, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { US_STATES, TRADES } from '@/types/projectWizard';
import { ORG_TYPE_LABELS } from '@/types/organization';
import { cn } from '@/lib/utils';

interface OrgResult {
  org_id: string;
  org_name: string;
  org_type: string;
  org_trade: string | null;
  org_address: { street?: string; city?: string; state?: string; zip?: string } | null;
  admin_name: string | null;
  allow_join_requests: boolean;
}

interface JoinSearchStepProps {
  onSelectOrg: (org: OrgResult) => void;
  onBack: () => void;
}

export function JoinSearchStep({ onSelectOrg, onBack }: JoinSearchStepProps) {
  const [state, setState] = useState('');
  const [trade, setTrade] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<OrgResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    setSearching(true);
    setHasSearched(true);

    const { data, error } = await supabase.rpc('search_organizations_for_join', {
      _state: (state && state !== '__all__') ? state : null,
      _trade: (trade && trade !== '__all__') ? trade : null,
      _query: query || null,
      _limit: 20,
    });

    if (!error && data) {
      setResults(data as unknown as OrgResult[]);
    } else {
      setResults([]);
    }
    setSearching(false);
  };

  const formatAddress = (addr: OrgResult['org_address']) => {
    if (!addr) return '';
    return [addr.city, addr.state].filter(Boolean).join(', ');
  };

  return (
    <Card className="p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold">Find Your Company</h2>
        <p className="text-sm text-muted-foreground mt-1">Search for your organization on Ontime.Build</p>
      </div>

      <div className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>State</Label>
            <Select value={state} onValueChange={setState}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Any state" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Any state</SelectItem>
                {US_STATES.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Trade</Label>
            <Select value={trade} onValueChange={setTrade}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Any trade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">Any trade</SelectItem>
                {TRADES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div>
          <Label>Company Name</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search by company name..."
                className="pl-10"
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
              />
            </div>
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
            </Button>
          </div>
        </div>

        {/* Results */}
        {hasSearched && (
          <div className="space-y-2 mt-4">
            {results.length === 0 && !searching && (
              <div className="text-center py-8 text-muted-foreground">
                <Building2 className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No organizations found. Try adjusting your search.</p>
              </div>
            )}
            {results.map(org => (
              <button
                key={org.org_id}
                onClick={() => onSelectOrg(org)}
                className={cn(
                  "w-full text-left p-4 rounded-lg border border-border hover:border-primary/50 transition-all",
                  "hover:bg-accent/50 cursor-pointer"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium truncate">{org.org_name}</h4>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {ORG_TYPE_LABELS[org.org_type as keyof typeof ORG_TYPE_LABELS] || org.org_type}
                      </Badge>
                    </div>
                    {(org.org_trade) && (
                      <p className="text-sm text-muted-foreground mt-0.5">{org.org_trade}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                      {formatAddress(org.org_address) && (
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {formatAddress(org.org_address)}
                        </span>
                      )}
                      {org.admin_name && (
                        <span>Admin: {org.admin_name}</span>
                      )}
                    </div>
                  </div>
                  {org.allow_join_requests ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-1" />
                  ) : (
                    <Badge variant="outline" className="text-xs shrink-0">Invite Only</Badge>
                  )}
                </div>
              </button>
            ))}
          </div>
        )}

        <div className="pt-2">
          <Button type="button" variant="outline" onClick={onBack} className="w-full">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
      </div>
    </Card>
  );
}
