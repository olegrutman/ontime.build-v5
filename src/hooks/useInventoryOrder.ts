import { useState, useCallback } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { InventoryItem } from '@/types/inventory';

export interface OrderLineItem {
  id?: string;
  sku: string;
  name: string;
  qty: number;
  qty_type: string;
  attributes_json?: Record<string, unknown>;
  line_notes?: string;
}

export interface DraftOrder {
  id: string;
  project_id: string | null;
  status: string;
  notes: string | null;
  lines: OrderLineItem[];
  created_at: string;
}

export function useInventoryOrder(projectId?: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showOrderToast, setShowOrderToast] = useState(false);

  // Fetch existing draft order for user (optionally within project context)
  const { data: draftOrder, isLoading: loadingDraft } = useQuery({
    queryKey: ['inventory-draft-order', user?.id, projectId],
    queryFn: async () => {
      if (!user?.id) return null;

      // Build query - filter by project if provided
      let query = supabase
        .from('material_orders')
        .select(`
          id,
          work_item_id,
          status,
          notes,
          created_at,
          order_items (
            id,
            supplier_sku,
            description,
            quantity,
            uom,
            notes
          )
        `)
        .eq('status', 'DRAFT')
        .order('created_at', { ascending: false })
        .limit(1);

      // If we have a project context, we need to filter by work items in that project
      // For now, just get the most recent draft
      const { data, error } = await query.single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching draft order:', error);
        return null;
      }

      if (!data) return null;

      // Transform to our interface
      const lines: OrderLineItem[] = (data.order_items || []).map((item: any) => ({
        id: item.id,
        sku: item.supplier_sku || '',
        name: item.description,
        qty: item.quantity,
        qty_type: item.uom,
        line_notes: item.notes,
      }));

      return {
        id: data.id,
        project_id: null, // We don't have direct project link in current schema
        status: data.status,
        notes: data.notes,
        lines,
        created_at: data.created_at,
      } as DraftOrder;
    },
    enabled: !!user?.id,
  });

  // Create new draft order
  const createDraftMutation = useMutation({
    mutationFn: async (workItemId: string) => {
      const { data, error } = await supabase
        .from('material_orders')
        .insert({
          work_item_id: workItemId,
          status: 'DRAFT',
          ordering_mode: 'ITEMS',
        })
        .select('id')
        .single();

      if (error) throw error;
      return data.id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-draft-order'] });
    },
  });

  // Add item to order
  const addItemMutation = useMutation({
    mutationFn: async ({ 
      orderId, 
      item, 
      qty = 1 
    }: { 
      orderId: string; 
      item: InventoryItem; 
      qty?: number;
    }) => {
      const { error } = await supabase
        .from('order_items')
        .insert({
          order_id: orderId,
          catalog_item_id: item.id,
          supplier_sku: item.supplier_sku,
          description: item.description,
          category: item.category,
          quantity: qty,
          uom: item.uom_default,
          from_pack: false,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-draft-order'] });
      setShowOrderToast(true);
    },
  });

  // Update line quantity
  const updateLineMutation = useMutation({
    mutationFn: async ({ lineId, qty }: { lineId: string; qty: number }) => {
      const { error } = await supabase
        .from('order_items')
        .update({ quantity: qty })
        .eq('id', lineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-draft-order'] });
    },
  });

  // Remove line
  const removeLineMutation = useMutation({
    mutationFn: async (lineId: string) => {
      const { error } = await supabase
        .from('order_items')
        .delete()
        .eq('id', lineId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-draft-order'] });
    },
  });

  // Submit order
  const submitOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from('material_orders')
        .update({ 
          status: 'SUBMITTED',
          submitted_at: new Date().toISOString(),
          submitted_by: user?.id,
        })
        .eq('id', orderId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory-draft-order'] });
      toast.success('Order submitted successfully');
    },
  });

  // Add item to order (handles draft creation if needed)
  const addToOrder = useCallback(async (
    item: InventoryItem, 
    qty: number = 1,
    workItemId?: string
  ) => {
    try {
      let orderId = draftOrder?.id;

      // Create draft if doesn't exist
      if (!orderId && workItemId) {
        orderId = await createDraftMutation.mutateAsync(workItemId);
      }

      if (!orderId) {
        toast.error('Please select a work item to create an order');
        return;
      }

      await addItemMutation.mutateAsync({ orderId, item, qty });
      toast.success('Added to order', {
        action: {
          label: 'View Order',
          onClick: () => {
            // Navigate to order - handled by component
          },
        },
      });
    } catch (error) {
      console.error('Error adding to order:', error);
      toast.error('Failed to add item to order');
    }
  }, [draftOrder, createDraftMutation, addItemMutation]);

  return {
    draftOrder,
    loadingDraft,
    addToOrder,
    updateLine: (lineId: string, qty: number) => updateLineMutation.mutate({ lineId, qty }),
    removeLine: (lineId: string) => removeLineMutation.mutate(lineId),
    submitOrder: (orderId: string) => submitOrderMutation.mutate(orderId),
    isAddingItem: addItemMutation.isPending,
    isSubmitting: submitOrderMutation.isPending,
    showOrderToast,
    dismissOrderToast: () => setShowOrderToast(false),
  };
}
