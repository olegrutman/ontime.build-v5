import { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import AppHeader from '@/components/AppHeader';
import { 
  DollarSign, 
  Plus,
  MapPin,
  Building2,
  Receipt,
  ClipboardList,
  Users,
  FileText,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { toast } from 'sonner';
import InvoiceForm from '@/components/invoices/InvoiceForm';
import InvoiceList from '@/components/invoices/InvoiceList';
import InvoiceDetail from '@/components/invoices/InvoiceDetail';
import ChangeOrderForm from '@/components/change-orders/ChangeOrderForm';
import ChangeOrderList from '@/components/change-orders/ChangeOrderList';
import ChangeOrderDetail from '@/components/change-orders/ChangeOrderDetail';
import ProjectTeamManager from '@/components/projects/ProjectTeamManager';
import ProjectOverview from '@/components/projects/ProjectOverview';
import SovManager from '@/components/sov/SovManager';
import CorForm from '@/components/change-order-requests/CorForm';
import CorList from '@/components/change-order-requests/CorList';
import CorDetail from '@/components/change-order-requests/CorDetail';

type AppRole = 'FIELD_CREW' | 'TRADE_CONTRACTOR' | 'GC';

interface ScopeFlags {
  roof?: boolean;
  decks?: boolean;
  garage?: boolean;
  porches?: boolean;
  basement?: boolean;
  hardware_installation?: boolean;
}

interface Project {
  id: string;
  name: string;
  address: string;
  floors: number;
  structure_type: string;
  scope_flags: ScopeFlags;
  contract_mode: 'TWO_PARTY' | 'THREE_PARTY';
  creator_user_id: string;
  is_archived: boolean;
  last_activity_at: string;
  created_at: string;
}

interface ContractContext {
  id: string;
  type: 'DOWNSTREAM' | 'UPSTREAM';
  tc_company_id: string;
  counterparty_company_id: string;
}

type ViewMode = 'main' | 'invoice-new' | 'invoice-detail' | 'change-order-new' | 'change-order-detail' | 'cor-new' | 'cor-detail';
type SovContextType = 'DOWNSTREAM' | 'UPSTREAM';

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [contractContexts, setContractContexts] = useState<ContractContext[]>([]);
  const [selectedSovContext, setSelectedSovContext] = useState<SovContextType>('UPSTREAM');
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>('main');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceRefresh, setInvoiceRefresh] = useState(0);
  const [changeOrderRefresh, setChangeOrderRefresh] = useState(0);
  const [selectedChangeOrderId, setSelectedChangeOrderId] = useState<string | null>(null);
  const [corRefresh, setCorRefresh] = useState(0);
  const [selectedCorId, setSelectedCorId] = useState<string | null>(null);

  useEffect(() => {
    if (id && user) {
      fetchProjectData();
      fetchUserRole();
    }
  }, [id, user]);

  const fetchUserRole = async () => {
    if (!id || !user) return;
    
    try {
      const { data, error } = await supabase
        .rpc('get_user_project_role', { 
          _project_id: id, 
          _user_id: user.id 
        });
      
      if (!error && data) {
        setUserRole(data as AppRole);
      }
    } catch (error) {
      console.error('Error fetching user role:', error);
    }
  };

  const fetchProjectData = async () => {
    try {
      const { data: projectData, error: projectError } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (projectError) throw projectError;
      
      const scopeFlags = (projectData.scope_flags as ScopeFlags) || {};
      setProject({ ...projectData, scope_flags: scopeFlags });

      const { data: contextData } = await supabase
        .from('contract_contexts')
        .select('*')
        .eq('project_id', id);

      if (contextData && contextData.length > 0) {
        setContractContexts(contextData);
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceSaved = () => {
    setViewMode('main');
    setSelectedInvoiceId(null);
    setInvoiceRefresh(prev => prev + 1);
  };

  const handleChangeOrderSaved = () => {
    setViewMode('main');
    setSelectedChangeOrderId(null);
    setChangeOrderRefresh(prev => prev + 1);
  };

  const handleCorSaved = () => {
    setViewMode('main');
    setSelectedCorId(null);
    setCorRefresh(prev => prev + 1);
  };

  // Role-based context selection
  const isTC = userRole === 'TRADE_CONTRACTOR';
  const isFC = userRole === 'FIELD_CREW';
  const isGC = userRole === 'GC';

  // Get the correct context for invoicing based on role:
  // - TC bills upstream (to GC) using UPSTREAM context
  // - FC bills TC using DOWNSTREAM context  
  // - GC does not create invoices (they receive them)
  const invoiceContext = useMemo(() => {
    if (isTC) {
      return contractContexts.find(c => c.type === 'UPSTREAM');
    } else if (isFC) {
      return contractContexts.find(c => c.type === 'DOWNSTREAM');
    }
    return null; // GC cannot create invoices
  }, [contractContexts, isTC, isFC]);

  // For change orders, use the same logic
  const changeOrderContext = useMemo(() => {
    if (isTC) {
      // TC can create COs in both contexts, default to UPSTREAM for GC-facing
      return contractContexts.find(c => c.type === 'UPSTREAM');
    } else if (isFC) {
      return contractContexts.find(c => c.type === 'DOWNSTREAM');
    }
    return null; // GC doesn't create COs
  }, [contractContexts, isTC, isFC]);

  // Get the first available contract context (fallback)
  const defaultContext = contractContexts[0];
  
  // Get SOV context based on selection - must be before early returns
  const sovContext = useMemo(() => {
    // For FC, only show DOWNSTREAM SOV
    if (isFC) return contractContexts.find(c => c.type === 'DOWNSTREAM');
    // For GC, only show UPSTREAM SOV
    if (isGC) return contractContexts.find(c => c.type === 'UPSTREAM');
    // For TC, use selection
    return contractContexts.find(c => c.type === selectedSovContext);
  }, [contractContexts, selectedSovContext, isFC, isGC]);

  // Determine if user can create invoices
  const canCreateInvoice = isTC || isFC;
  const canCreateChangeOrder = isTC || isFC;
  const canCreateCor = isTC || isGC;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex items-center gap-2">
          <Building2 className="h-8 w-8 text-accent" />
          <span className="text-xl font-semibold">Loading...</span>
        </div>
      </div>
    );
  }

  if (!project) return null;

  if (viewMode === 'invoice-new' && invoiceContext) {
    return (
      <InvoiceForm
        projectId={id!}
        contractContextId={invoiceContext.id}
        onClose={() => setViewMode('main')}
        onSaved={handleInvoiceSaved}
      />
    );
  }

  if (viewMode === 'invoice-detail' && selectedInvoiceId) {
    return (
      <InvoiceDetail
        invoiceId={selectedInvoiceId}
        projectId={id!}
        onClose={() => { setViewMode('main'); setSelectedInvoiceId(null); }}
        onEdit={() => setViewMode('invoice-new')}
        onUpdated={handleInvoiceSaved}
      />
    );
  }

  if (viewMode === 'change-order-new' && changeOrderContext) {
    return (
      <ChangeOrderForm
        projectId={id!}
        contractContextId={changeOrderContext.id}
        onClose={() => setViewMode('main')}
        onSaved={handleChangeOrderSaved}
      />
    );
  }

  if (viewMode === 'change-order-detail' && selectedChangeOrderId) {
    return (
      <ChangeOrderDetail
        changeOrderId={selectedChangeOrderId}
        projectId={id!}
        onClose={() => { setViewMode('main'); setSelectedChangeOrderId(null); }}
        onUpdated={handleChangeOrderSaved}
      />
    );
  }

  if (viewMode === 'cor-new') {
    return (
      <CorForm
        projectId={id!}
        onClose={() => setViewMode('main')}
        onSaved={handleCorSaved}
      />
    );
  }

  if (viewMode === 'cor-detail' && selectedCorId) {
    return (
      <CorDetail
        corId={selectedCorId}
        projectId={id!}
        onClose={() => { setViewMode('main'); setSelectedCorId(null); }}
        onUpdated={handleCorSaved}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-safe-bottom">
      <AppHeader title={project.name} showBack onBack={() => navigate('/dashboard')} />

      <main className="container px-4 py-6">
        <Card className="border-0 shadow-md mb-6">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
                <Building2 className="h-6 w-6 text-accent" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-lg text-foreground">{project.name}</h2>
                <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="h-3 w-3" />
                  {project.address}
                </p>
                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge variant="secondary">{project.structure_type}</Badge>
                  <Badge variant="outline">{project.floors} Floor{project.floors > 1 ? 's' : ''}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-6 mb-4">
            <TabsTrigger value="overview"><DollarSign className="h-4 w-4 mr-1" />Overview</TabsTrigger>
            <TabsTrigger value="sov"><FileText className="h-4 w-4 mr-1" />SOV</TabsTrigger>
            <TabsTrigger value="cors"><ClipboardList className="h-4 w-4 mr-1" />CORs</TabsTrigger>
            <TabsTrigger value="change-orders"><ClipboardList className="h-4 w-4 mr-1" />COs</TabsTrigger>
            <TabsTrigger value="invoices"><Receipt className="h-4 w-4 mr-1" />Invoices</TabsTrigger>
            <TabsTrigger value="team"><Users className="h-4 w-4 mr-1" />Team</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <ProjectOverview
              projectId={id!}
              contractContextId={defaultContext?.id}
              scopeFlags={project.scope_flags}
              contractMode={project.contract_mode}
              onNavigateToCOs={() => document.querySelector<HTMLButtonElement>('[value="change-orders"]')?.click()}
              onNavigateToInvoices={() => document.querySelector<HTMLButtonElement>('[value="invoices"]')?.click()}
            />
          </TabsContent>

          <TabsContent value="sov">
            <div className="space-y-4">
              {/* SOV context indicator for FC and GC */}
              {isFC && (
                <Card className="border-0 shadow-md bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Your Contract: <span className="text-accent">TC → FC</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Schedule of Values for work you perform for the Trade Contractor
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {isGC && (
                <Card className="border-0 shadow-md bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <FileText className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Your Contract: <span className="text-accent">TC → GC</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Schedule of Values for work the Trade Contractor performs for you
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Context Selector - only show for TC in THREE_PARTY mode */}
              {project.contract_mode === 'THREE_PARTY' && isTC && (
                <Card className="border-0 shadow-md bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-accent" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">
                            Viewing: <span className="text-accent">{selectedSovContext === 'UPSTREAM' ? 'TC → GC' : 'TC → FC'}</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {selectedSovContext === 'UPSTREAM' 
                              ? 'Contract for work you bill to the General Contractor'
                              : 'Contract for work Field Crew bills to you'}
                          </p>
                        </div>
                      </div>
                      <Select value={selectedSovContext} onValueChange={(v) => setSelectedSovContext(v as SovContextType)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UPSTREAM">
                            <span>TC → GC</span>
                          </SelectItem>
                          <SelectItem value="DOWNSTREAM">
                            <span>TC → FC</span>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {sovContext ? (
                <SovManager
                  key={sovContext.id}
                  projectId={id!}
                  contractContextId={sovContext.id}
                  structureType={project.structure_type}
                  floors={project.floors}
                  scopeFlags={project.scope_flags as Record<string, boolean>}
                />
              ) : (
                <Card className="border-0 shadow-md">
                  <CardContent className="p-6 text-center text-muted-foreground">
                    No contract context available for your role
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="cors">
            <div className="space-y-4">
              {/* COR direction indicator */}
              {canCreateCor && (
                <Card className="border-0 shadow-md bg-warning/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center">
                        <ClipboardList className="h-5 w-5 text-warning" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Change Order Requests – <span className="text-warning">Pricing Optional</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isGC 
                            ? 'Request work from Trade Contractor before pricing is finalized'
                            : 'Request work from Field Crew and add pricing before converting to CO'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {isFC && (
                <Card className="border-0 shadow-md bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <ArrowDown className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Work Requests from: <span className="text-accent">Trade Contractor</span></p>
                        <p className="text-xs text-muted-foreground">Submit hours for requested work</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {canCreateCor && (
                <Button variant="accent" size="lg" className="w-full" onClick={() => setViewMode('cor-new')}>
                  <Plus className="h-5 w-5 mr-2" />New Change Order Request
                </Button>
              )}
              
              <CorList
                projectId={id!}
                refreshTrigger={corRefresh}
                onSelect={(corId) => { setSelectedCorId(corId); setViewMode('cor-detail'); }}
              />
            </div>
          </TabsContent>

          <TabsContent value="change-orders">
            <div className="space-y-4">
              {/* CO submission direction indicator */}
              {canCreateChangeOrder && (
                <Card className="border-0 shadow-md bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <ArrowUp className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Submitting to: <span className="text-accent">{isTC ? 'General Contractor' : 'Trade Contractor'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isTC ? 'Submit change orders for GC approval' : 'Submit change orders for TC approval'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {isGC && (
                <Card className="border-0 shadow-md bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <ArrowDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Receiving from: <span className="text-foreground">Trade Contractor</span></p>
                        <p className="text-xs text-muted-foreground">Review and approve submitted change orders</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {canCreateChangeOrder && changeOrderContext && (
                <Button variant="accent" size="lg" className="w-full" onClick={() => setViewMode('change-order-new')}>
                  <Plus className="h-5 w-5 mr-2" />Create Change Order
                </Button>
              )}
              <ChangeOrderList
                contractContextId={isFC ? changeOrderContext?.id : defaultContext?.id}
                projectId={id}
                refreshTrigger={changeOrderRefresh}
                onSelectChangeOrder={(coId) => { setSelectedChangeOrderId(coId); setViewMode('change-order-detail'); }}
              />
            </div>
          </TabsContent>

          <TabsContent value="invoices">
            <div className="space-y-4">
              {/* Billing direction indicator */}
              {canCreateInvoice && (
                <Card className="border-0 shadow-md bg-accent/5">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
                        <ArrowUp className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">
                          Billing to: <span className="text-accent">{isTC ? 'General Contractor' : 'Trade Contractor'}</span>
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {isTC ? 'Submit invoices for GC approval and payment' : 'Submit invoices for TC approval and payment'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              {isGC && (
                <Card className="border-0 shadow-md bg-muted/30">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                        <ArrowDown className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Receiving invoices from: <span className="text-foreground">Trade Contractor</span></p>
                        <p className="text-xs text-muted-foreground">Review and approve submitted invoices</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
              
              <InvoiceList
                contractContextId={isFC ? invoiceContext?.id : defaultContext?.id}
                projectId={id}
                refreshTrigger={invoiceRefresh}
                onSelectInvoice={(invoiceId) => { setSelectedInvoiceId(invoiceId); setViewMode('invoice-detail'); }}
                onCreateNew={canCreateInvoice && invoiceContext ? () => setViewMode('invoice-new') : undefined}
              />
            </div>
          </TabsContent>

          <TabsContent value="team">
            <ProjectTeamManager projectId={id!} projectName={project.name} createdBy={project.creator_user_id} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}