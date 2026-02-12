import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Package, ShoppingCart, FileText } from 'lucide-react';
import { MaterialOrder, WorkItem, ORDER_STATUS_LABELS, OrderStatus, WORK_ITEM_TYPE_LABELS } from '@/types/materialOrder';
import { MaterialOrderWizard } from '@/components/ordering/MaterialOrderWizard';

export default function MaterialOrders() {
  const { user, userOrgRoles, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [selectedWorkItem, setSelectedWorkItem] = useState<WorkItem | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<MaterialOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);
  
  const organizationId = userOrgRoles[0]?.organization_id;

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (organizationId) {
      fetchData();
    }
  }, [organizationId]);

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchOrders(), fetchWorkItems()]);
    setLoading(false);
  };

  const fetchOrders = async () => {
    const { data, error } = await supabase
      .from('material_orders')
      .select(`
        *,
        work_item:work_items(id, title, item_type, location_ref),
        supplier:suppliers(id, name, supplier_code)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      return;
    }
    setOrders(data || []);
  };

  const fetchWorkItems = async () => {
    const { data, error } = await supabase
      .from('work_items')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching work items:', error);
      return;
    }
    setWorkItems(data || []);
  };

  const fetchOrderDetails = async (orderId: string) => {
    const { data: items, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at');

    if (error) {
      console.error('Error fetching order items:', error);
      return;
    }

    const order = orders.find(o => o.id === orderId);
    if (order) {
      setSelectedOrder({ ...order, items: items || [] });
    }
  };

  const handleStartOrder = (workItemId: string) => {
    const wi = workItems.find(w => w.id === workItemId);
    if (wi) {
      setSelectedWorkItem(wi);
      setWizardOpen(true);
    }
  };

  const handleWizardComplete = () => {
    setWizardOpen(false);
    setSelectedWorkItem(null);
    fetchOrders();
  };

  const getStatusBadgeVariant = (status: OrderStatus) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'default';
      case 'APPROVED': return 'default';
      case 'FULFILLED': return 'default';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadgeClass = (status: OrderStatus) => {
    if (status === 'APPROVED') return 'bg-blue-600';
    if (status === 'FULFILLED') return 'bg-green-600';
    return '';
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Material Orders">
        <div className="p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Material Orders" subtitle="Create and manage material orders">
      <div className="space-y-4 sm:space-y-6">
        <div className="flex justify-end">
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="sm:size-default">
                <Plus className="h-4 w-4 sm:mr-2" />
                <span className="hidden sm:inline">New Order</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Select Work Item</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Choose the work item this order is for:
                </p>
                {workItems.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No work items available. Create a work item first.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-auto">
                    {workItems.map(wi => (
                      <Card 
                        key={wi.id}
                        className="cursor-pointer hover:border-primary transition-colors"
                        onClick={() => handleStartOrder(wi.id)}
                      >
                        <CardContent className="py-3 px-3 sm:px-4">
                          <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-medium text-sm truncate">{wi.title}</p>
                              <p className="text-xs text-muted-foreground truncate">{wi.location_ref || 'No location'}</p>
                            </div>
                            <Badge variant="outline" className="text-[10px] sm:text-xs shrink-0">
                              {WORK_ITEM_TYPE_LABELS[wi.item_type]}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Orders List */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-lg font-semibold">Orders</h2>
            {orders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No orders yet</p>
                </CardContent>
              </Card>
            ) : (
              orders.map(order => (
                <Card 
                  key={order.id}
                  className={`cursor-pointer transition-colors ${
                    selectedOrder?.id === order.id ? 'border-primary' : ''
                  }`}
                  onClick={() => fetchOrderDetails(order.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">
                        {order.work_item?.title || 'Unknown Work Item'}
                      </CardTitle>
                      <Badge 
                        variant={getStatusBadgeVariant(order.status as OrderStatus)}
                        className={getStatusBadgeClass(order.status as OrderStatus)}
                      >
                        {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                      </Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      {order.ordering_mode === 'PACKS' ? (
                        <Package className="h-3 w-3" />
                      ) : (
                        <ShoppingCart className="h-3 w-3" />
                      )}
                      {order.ordering_mode === 'PACKS' ? 'From Pack' : 'Individual Items'}
                    </CardDescription>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>

          {/* Order Details */}
          <div className="md:col-span-2">
            {selectedOrder ? (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{selectedOrder.work_item?.title}</CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Badge variant="outline">
                          {selectedOrder.ordering_mode === 'PACKS' ? 'From Pack' : 'Individual Items'}
                        </Badge>
                        {selectedOrder.supplier && (
                          <span>Supplier: {selectedOrder.supplier.name}</span>
                        )}
                      </CardDescription>
                    </div>
                    <Badge 
                      variant={getStatusBadgeVariant(selectedOrder.status as OrderStatus)}
                      className={getStatusBadgeClass(selectedOrder.status as OrderStatus)}
                    >
                      {ORDER_STATUS_LABELS[selectedOrder.status as OrderStatus]}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="overflow-x-auto -mx-4 sm:mx-0">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs">SKU</TableHead>
                            <TableHead className="text-xs">Description</TableHead>
                            <TableHead className="text-right text-xs">Qty</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">UOM</TableHead>
                            <TableHead className="text-xs hidden sm:table-cell">BF/LF</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-xs">
                                {item.supplier_sku || '-'}
                              </TableCell>
                              <TableCell className="text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">{item.description}</TableCell>
                              <TableCell className="text-right text-xs sm:text-sm">{item.quantity}</TableCell>
                              <TableCell className="text-xs hidden sm:table-cell">{item.uom}</TableCell>
                              <TableCell className="text-xs hidden sm:table-cell">
                                {item.computed_bf && <span>{item.computed_bf} BF</span>}
                                {item.computed_lf && <span>{item.computed_lf} LF</span>}
                                {!item.computed_bf && !item.computed_lf && '-'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">No items in this order</p>
                  )}

                  {selectedOrder.notes && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Notes:</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Select an order to view details</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Wizard Dialog */}
        <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Material Order Wizard</DialogTitle>
            </DialogHeader>
            {selectedWorkItem && (
              <MaterialOrderWizard
                workItem={selectedWorkItem}
                onComplete={handleWizardComplete}
                onCancel={() => setWizardOpen(false)}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
