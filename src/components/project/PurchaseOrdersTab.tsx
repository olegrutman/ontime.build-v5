import { useState, useEffect } from 'react';
import { FileText, Plus, Send, Eye, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { PurchaseOrder, PO_STATUS_LABELS } from '@/types/purchaseOrder';
import { POWizard } from '@/components/po-wizard';
import { POWizardData } from '@/types/poWizard';

interface PurchaseOrdersTabProps {
  projectId: string;
  projectName?: string;
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300',
  SENT: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
};

export function PurchaseOrdersTab({ projectId, projectName }: PurchaseOrdersTabProps) {
  const { userOrgRoles, currentRole } = useAuth();
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [wizardOpen, setWizardOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentOrgId = userOrgRoles[0]?.organization_id;
  const currentOrgType = userOrgRoles[0]?.organization?.type;
  const isSupplier = currentOrgType === 'SUPPLIER';
  const canCreatePO = currentRole === 'GC_PM' || currentRole === 'TC_PM';

  useEffect(() => {
    fetchPurchaseOrders();
  }, [projectId, currentOrgId]);

  const fetchPurchaseOrders = async () => {
    setLoading(true);
    
    let query = supabase
      .from('purchase_orders')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code),
        work_item:work_items(id, title)
      `)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });

    // Suppliers only see POs sent to them
    if (isSupplier) {
      // Get suppliers linked to this org
      const { data: supplierLinks } = await supabase
        .from('suppliers')
        .select('id')
        .eq('organization_id', currentOrgId);
      
      if (supplierLinks && supplierLinks.length > 0) {
        const supplierIds = supplierLinks.map(s => s.id);
        query = query.in('supplier_id', supplierIds);
      } else {
        // No supplier links, return empty
        setPurchaseOrders([]);
        setLoading(false);
        return;
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching POs:', error);
    } else {
      setPurchaseOrders((data || []) as PurchaseOrder[]);
    }
    setLoading(false);
  };

  const handleCreatePO = async (data: POWizardData) => {
    if (!currentOrgId) return;
    
    setIsSubmitting(true);
    try {
      // Generate PO number
      const { data: poNumber } = await supabase.rpc('generate_po_number', {
        org_id: currentOrgId,
      });

      // Create PO
      const { data: newPO, error: poError } = await supabase
        .from('purchase_orders')
        .insert({
          organization_id: currentOrgId,
          po_number: poNumber,
          po_name: `PO for ${data.project_name || 'Materials'}`,
          supplier_id: data.supplier_id,
          project_id: data.project_id,
          work_item_id: data.work_item_id,
          notes: data.notes || null,
          status: 'DRAFT',
        })
        .select()
        .single();

      if (poError) throw poError;

      // Insert line items
      if (data.line_items.length > 0) {
        const lineItems = data.line_items.map((item, idx) => ({
          po_id: newPO.id,
          line_number: idx + 1,
          supplier_sku: item.supplier_sku,
          description: item.description,
          quantity: item.quantity,
          uom: item.uom,
          pieces: item.pieces,
          length_ft: item.length_ft,
        }));

        const { error: lineError } = await supabase.from('po_line_items').insert(lineItems);
        if (lineError) throw lineError;
      }

      toast.success(`PO ${poNumber} created`);
      fetchPurchaseOrders();
    } catch (error: any) {
      console.error('Error creating PO:', error);
      toast.error('Failed to create PO: ' + error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPOs = statusFilter === 'all'
    ? purchaseOrders
    : purchaseOrders.filter(po => po.status === statusFilter);

  const stats = {
    total: purchaseOrders.length,
    draft: purchaseOrders.filter(po => po.status === 'DRAFT').length,
    sent: purchaseOrders.filter(po => po.status === 'SENT').length,
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Purchase Orders</h2>
          <p className="text-sm text-muted-foreground">
            {stats.total} PO{stats.total !== 1 ? 's' : ''} • {stats.draft} Draft • {stats.sent} Sent
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="SENT">Sent</SelectItem>
            </SelectContent>
          </Select>
          {canCreatePO && (
            <Button size="sm" onClick={() => setWizardOpen(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Create PO
            </Button>
          )}
        </div>
      </div>

      {/* PO List */}
      {filteredPOs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Purchase Orders</h3>
            <p className="text-sm text-muted-foreground text-center max-w-sm">
              {isSupplier
                ? 'No purchase orders have been sent to you for this project yet.'
                : 'Create a purchase order to request materials from suppliers.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Work Order</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPOs.map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {po.po_number}
                      </div>
                    </TableCell>
                    <TableCell>{po.supplier?.name || '—'}</TableCell>
                    <TableCell>
                      {po.work_item?.title || '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[po.status] || STATUS_COLORS.DRAFT}>
                        {PO_STATUS_LABELS[po.status as keyof typeof PO_STATUS_LABELS] || po.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(po.created_at), 'MMM d, yyyy')}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>

      {/* PO Creation Wizard */}
      <POWizard
        open={wizardOpen}
        onOpenChange={setWizardOpen}
        onComplete={handleCreatePO}
        isSubmitting={isSubmitting}
        initialProjectId={projectId}
        initialProjectName={projectName}
      />
    </>
  );
}
