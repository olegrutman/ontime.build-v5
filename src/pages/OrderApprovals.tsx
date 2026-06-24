import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Check, X, Package, ShoppingCart, Eye } from 'lucide-react';
import { 
  MaterialOrder, 
  OrderItem,
  ORDER_STATUS_LABELS,
  OrderStatus,
  WORK_ITEM_TYPE_LABELS,
  WorkItemType
} from '@/types/materialOrder';

export default function OrderApprovals() {
  const { user, currentRole, permissions, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [orders, setOrders] = useState<MaterialOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<MaterialOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [orderToReject, setOrderToReject] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    } else if (!authLoading && !permissions?.canApprove) {
      toast.error('You do not have permission to approve orders');
      navigate('/');
    }
  }, [user, permissions, authLoading, navigate]);

  useEffect(() => {
    if (permissions?.canApprove) {
      fetchOrders();
    }
  }, [permissions]);

  const fetchOrders = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('material_orders')
      .select(`
        *,
        supplier:suppliers(id, name, supplier_code)
      `)
      .in('status', ['SUBMITTED', 'APPROVED', 'FULFILLED', 'CANCELLED'])
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Error fetching orders:', error);
      setLoading(false);
      return;
    }
    setOrders((data || []).map((d: any) => ({ ...d, work_item: null })));
    setLoading(false);
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

  const handleApprove = async (orderId: string) => {
    const { error } = await supabase
      .from('material_orders')
      .update({ 
        status: 'APPROVED',
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
      })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to approve order: ' + error.message);
      return;
    }

    toast.success('Order approved');
    fetchOrders();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: 'APPROVED' } : null);
    }
  };

  const handleReject = async () => {
    if (!orderToReject) return;

    const { error } = await supabase
      .from('material_orders')
      .update({ 
        status: 'CANCELLED',
        notes: rejectReason,
      })
      .eq('id', orderToReject);

    if (error) {
      toast.error('Failed to reject order: ' + error.message);
      return;
    }

    toast.success('Order rejected');
    setRejectDialogOpen(false);
    setRejectReason('');
    setOrderToReject(null);
    fetchOrders();
    if (selectedOrder?.id === orderToReject) {
      setSelectedOrder(prev => prev ? { ...prev, status: 'CANCELLED' } : null);
    }
  };

  const handleMarkFulfilled = async (orderId: string) => {
    const { error } = await supabase
      .from('material_orders')
      .update({ status: 'FULFILLED' })
      .eq('id', orderId);

    if (error) {
      toast.error('Failed to update order: ' + error.message);
      return;
    }

    toast.success('Order marked as fulfilled');
    fetchOrders();
    if (selectedOrder?.id === orderId) {
      setSelectedOrder(prev => prev ? { ...prev, status: 'FULFILLED' } : null);
    }
  };

  const openRejectDialog = (orderId: string) => {
    setOrderToReject(orderId);
    setRejectDialogOpen(true);
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'DRAFT': return 'secondary';
      case 'SUBMITTED': return 'default';
      case 'APPROVED': return 'default';
      case 'FULFILLED': return 'default';
      case 'CANCELLED': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusBadgeClass = (status: string) => {
    if (status === 'APPROVED') return 'bg-blue-600';
    if (status === 'FULFILLED') return 'bg-green-600';
    return '';
  };

  if (authLoading || loading) {
    return (
      <AppLayout title="Order Approvals">
        <div className="p-4 sm:p-6 flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AppLayout>
    );
  }

  const submittedOrders = orders.filter(o => o.status === 'SUBMITTED');
  const processedOrders = orders.filter(o => o.status !== 'SUBMITTED');

  return (
    <AppLayout title="Order Approvals" subtitle="Review and approve material orders">
      <div className="space-y-4 sm:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          {/* Pending Approvals */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-base sm:text-lg font-semibold flex items-center gap-2">
              Pending Review
              {submittedOrders.length > 0 && (
                <Badge variant="destructive">{submittedOrders.length}</Badge>
              )}
            </h2>
            {submittedOrders.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No orders pending approval
                </CardContent>
              </Card>
            ) : (
              submittedOrders.map(order => (
                <Card 
                  key={order.id}
                  className={`cursor-pointer transition-colors ${
                    selectedOrder?.id === order.id ? 'border-primary' : ''
                  }`}
                  onClick={() => fetchOrderDetails(order.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <CardTitle className="text-base">{order.work_item?.title}</CardTitle>
                      <Badge>Pending</Badge>
                    </div>
                    <CardDescription className="flex items-center gap-2">
                      {order.ordering_mode === 'PACKS' ? (
                        <Package className="h-3 w-3" />
                      ) : (
                        <ShoppingCart className="h-3 w-3" />
                      )}
                      {order.ordering_mode === 'PACKS' ? 'From Pack' : 'Individual Items'}
                      {order.work_item?.item_type && (
                        <Badge variant="outline" className="text-xs">
                          {WORK_ITEM_TYPE_LABELS[order.work_item.item_type as WorkItemType]}
                        </Badge>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); handleApprove(order.id); }}
                      >
                        <Check className="h-4 w-4 mr-1" /> Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="destructive"
                        className="flex-1"
                        onClick={(e) => { e.stopPropagation(); openRejectDialog(order.id); }}
                      >
                        <X className="h-4 w-4 mr-1" /> Reject
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}

            {processedOrders.length > 0 && (
              <>
                <h2 className="text-base sm:text-lg font-semibold mt-6 sm:mt-8">Previously Reviewed</h2>
                {processedOrders.map(order => (
                  <Card 
                    key={order.id}
                    className={`cursor-pointer transition-colors opacity-75 ${
                      selectedOrder?.id === order.id ? 'border-primary opacity-100' : ''
                    }`}
                    onClick={() => fetchOrderDetails(order.id)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-base">{order.work_item?.title}</CardTitle>
                        <Badge 
                          variant={getStatusBadgeVariant(order.status)}
                          className={getStatusBadgeClass(order.status)}
                        >
                          {ORDER_STATUS_LABELS[order.status as OrderStatus]}
                        </Badge>
                      </div>
                      <CardDescription className="flex items-center gap-2">
                        {order.ordering_mode === 'PACKS' ? 'From Pack' : 'Individual Items'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                ))}
              </>
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
                      <CardDescription className="flex items-center gap-2 mt-1">
                        <Badge variant="outline">
                          {selectedOrder.ordering_mode === 'PACKS' ? 'From Pack' : 'Individual Items'}
                        </Badge>
                        {selectedOrder.work_item?.location_ref && (
                          <span>@ {selectedOrder.work_item.location_ref}</span>
                        )}
                        {selectedOrder.supplier && (
                          <span>• Supplier: {selectedOrder.supplier.name}</span>
                        )}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      {selectedOrder.status === 'SUBMITTED' && (
                        <>
                          <Button onClick={() => handleApprove(selectedOrder.id)}>
                            <Check className="h-4 w-4 mr-2" /> Approve
                          </Button>
                          <Button variant="destructive" onClick={() => openRejectDialog(selectedOrder.id)}>
                            <X className="h-4 w-4 mr-2" /> Reject
                          </Button>
                        </>
                      )}
                      {selectedOrder.status === 'APPROVED' && (
                        <Button variant="outline" onClick={() => handleMarkFulfilled(selectedOrder.id)}>
                          Mark Fulfilled
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedOrder.notes && selectedOrder.status === 'CANCELLED' && (
                    <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 mb-6">
                      <p className="text-sm font-medium text-destructive">Rejection Reason:</p>
                      <p className="text-sm mt-1">{selectedOrder.notes}</p>
                    </div>
                  )}

                  {/* Order summary */}
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Items</p>
                      <p className="text-2xl font-bold">{selectedOrder.items?.length || 0}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Board Feet</p>
                      <p className="text-2xl font-bold">
                        {selectedOrder.items?.reduce((sum, item) => sum + (Number(item.computed_bf) || 0), 0).toFixed(1) || '0'}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total Linear Feet</p>
                      <p className="text-2xl font-bold">
                        {selectedOrder.items?.reduce((sum, item) => sum + (Number(item.computed_lf) || 0), 0).toFixed(1) || '0'}
                      </p>
                    </div>
                  </div>

                  {selectedOrder.items && selectedOrder.items.length > 0 ? (
                    <div className="border rounded-lg overflow-auto max-h-96">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>SKU</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Qty</TableHead>
                            <TableHead>UOM</TableHead>
                            <TableHead>BF/LF</TableHead>
                            <TableHead>Source</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedOrder.items.map(item => (
                            <TableRow key={item.id}>
                              <TableCell className="font-mono text-sm">
                                {item.supplier_sku || '-'}
                              </TableCell>
                              <TableCell>{item.description}</TableCell>
                              <TableCell className="text-right">{item.quantity}</TableCell>
                              <TableCell>{item.uom}</TableCell>
                              <TableCell>
                                {item.computed_bf && <span>{item.computed_bf} BF</span>}
                                {item.computed_lf && <span>{item.computed_lf} LF</span>}
                                {!item.computed_bf && !item.computed_lf && '-'}
                              </TableCell>
                              <TableCell>
                                <Badge variant={item.from_pack ? 'secondary' : 'outline'}>
                                  {item.from_pack ? 'Pack' : 'Direct'}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <Eye className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No items in this order</p>
                    </div>
                  )}

                  {selectedOrder.notes && selectedOrder.status !== 'CANCELLED' && (
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <p className="text-sm font-medium">Order Notes:</p>
                      <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Select an order to review details
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Reject Dialog */}
        <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Reject Order</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejectReason">Reason for Rejection</Label>
                <Textarea
                  id="rejectReason"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Provide feedback for the requester..."
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setRejectDialogOpen(false)} className="w-full sm:w-auto">
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleReject} className="w-full sm:w-auto">
                Reject Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
}
