import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Briefcase, 
  FileEdit, 
  Clock, 
  FileText, 
  Search,
  ChevronRight,
  ArrowRight,
  Filter
} from 'lucide-react';
import { StateBadge } from '@/components/StateBadge';
import { WorkItemState, WorkItemType, WORK_ITEM_TYPE_LABELS, WORK_ITEM_STATE_LABELS } from '@/types/workItem';
import { formatDistanceToNow } from 'date-fns';

interface WorkItemRow {
  id: string;
  title: string;
  code: string | null;
  item_type: string;
  state: string;
  amount: number | null;
  location_ref: string | null;
  parent_work_item_id: string | null;
  created_at: string;
  updated_at: string;
}

const TYPE_ICONS: Record<WorkItemType, typeof Briefcase> = {
  PROJECT: Briefcase,
  SOV_ITEM: FileText,
  CHANGE_WORK: FileEdit,
  TM_WORK: Clock,
};

const TYPE_COLORS: Record<WorkItemType, string> = {
  PROJECT: 'bg-blue-500/10 text-blue-600 border-blue-200',
  SOV_ITEM: 'bg-purple-500/10 text-purple-600 border-purple-200',
  CHANGE_WORK: 'bg-amber-500/10 text-amber-600 border-amber-200',
  TM_WORK: 'bg-green-500/10 text-green-600 border-green-200',
};

export default function WorkItems() {
  const navigate = useNavigate();
  const { user, userOrgRoles, currentRole } = useAuth();
  
  const [workItems, setWorkItems] = useState<WorkItemRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<WorkItemType | 'ALL'>('ALL');
  const [filterState, setFilterState] = useState<WorkItemState | 'ALL'>('ALL');

  useEffect(() => {
    if (user && userOrgRoles.length > 0) {
      fetchWorkItems();
    }
  }, [user, userOrgRoles]);

  const fetchWorkItems = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('work_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching work items:', error);
    } else {
      setWorkItems(data || []);
    }
    setLoading(false);
  };

  // Filter logic
  const filteredItems = workItems.filter(item => {
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'ALL' || item.item_type === filterType;
    const matchesState = filterState === 'ALL' || item.state === filterState;
    return matchesSearch && matchesType && matchesState;
  });

  // Stats
  const stateCounts = {
    ALL: workItems.length,
    OPEN: workItems.filter(w => w.state === 'OPEN').length,
    PRICED: workItems.filter(w => w.state === 'PRICED').length,
    APPROVED: workItems.filter(w => w.state === 'APPROVED').length,
    EXECUTED: workItems.filter(w => w.state === 'EXECUTED').length,
  };

  const typeCounts = {
    PROJECT: workItems.filter(w => w.item_type === 'PROJECT').length,
    SOV_ITEM: workItems.filter(w => w.item_type === 'SOV_ITEM').length,
    CHANGE_WORK: workItems.filter(w => w.item_type === 'CHANGE_WORK').length,
    TM_WORK: workItems.filter(w => w.item_type === 'TM_WORK').length,
  };

  const formatCurrency = (amount?: number | null) => {
    if (amount === undefined || amount === null) return '—';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Please sign in to view work items.</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="w-6 h-6" />
            Work Items
          </h1>
          <p className="text-muted-foreground">
            Unified view of all projects, SOV items, change orders, and T&M work
          </p>
        </div>

        {/* Type Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {(Object.keys(TYPE_ICONS) as WorkItemType[]).map((type) => {
            const Icon = TYPE_ICONS[type];
            return (
              <Card 
                key={type}
                className={`cursor-pointer transition-all ${
                  filterType === type ? 'ring-2 ring-primary' : 'hover:shadow-md'
                }`}
                onClick={() => setFilterType(filterType === type ? 'ALL' : type)}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${TYPE_COLORS[type]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{typeCounts[type]}</p>
                    <p className="text-xs text-muted-foreground">{WORK_ITEM_TYPE_LABELS[type]}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or code..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={filterState} onValueChange={(v) => setFilterState(v as WorkItemState | 'ALL')}>
            <SelectTrigger className="w-full sm:w-[160px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All States ({stateCounts.ALL})</SelectItem>
              <SelectItem value="OPEN">Open ({stateCounts.OPEN})</SelectItem>
              <SelectItem value="PRICED">Priced ({stateCounts.PRICED})</SelectItem>
              <SelectItem value="APPROVED">Approved ({stateCounts.APPROVED})</SelectItem>
              <SelectItem value="EXECUTED">Executed ({stateCounts.EXECUTED})</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Work Items List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No work items found</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {filteredItems.map((item) => {
              const Icon = TYPE_ICONS[item.item_type as WorkItemType] || Briefcase;
              return (
                <Card 
                  key={item.id}
                  className="cursor-pointer hover:shadow-md transition-all"
                  onClick={() => navigate(`/work-item/${item.id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded-lg shrink-0 ${TYPE_COLORS[item.item_type as WorkItemType] || ''}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {item.code && (
                            <Badge variant="outline" className="text-xs font-mono shrink-0">
                              {item.code}
                            </Badge>
                          )}
                          <StateBadge state={item.state as WorkItemState} size="sm" />
                        </div>
                        <h3 className="font-medium truncate">{item.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          {WORK_ITEM_TYPE_LABELS[item.item_type as WorkItemType]} • 
                          Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="font-semibold">{formatCurrency(item.amount)}</p>
                        {item.location_ref && (
                          <p className="text-xs text-muted-foreground">{item.location_ref}</p>
                        )}
                      </div>

                      <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
