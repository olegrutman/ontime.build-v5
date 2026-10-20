import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Tables } from '@/integrations/supabase/types';

export type CrewWorker = Tables<'crew_workers'>;
export type CrewSpending = Tables<'actual_cost_entries'>;
export function useCrewTracker(projectId: string) {
  const { user, userOrgRoles } = useAuth();
  const client = useQueryClient();
  const orgIds = userOrgRoles.filter(r => r.organization?.type === 'FC').map(r => r.organization?.id).filter((id): id is string => !!id);
  const access = useQuery({
    queryKey: ['crew-tracker-access', projectId, user?.id, orgIds.join(',')],
    enabled: !!user && orgIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase.from('project_participants').select('organization_id').eq('project_id',projectId).eq('invite_status','ACCEPTED').in('organization_id',orgIds);
      if(error) throw error;
      return data?.[0]?.organization_id ?? null;
    },
  });
  const orgId = access.data;
  const workers = useQuery({ queryKey: ['crew-workers',orgId], enabled: !!orgId, queryFn: async () => {
    if(!orgId) return [];
    const {data,error} = await supabase.from('crew_workers').select('*').eq('organization_id',orgId).order('name');
    if(error) throw error; return data;
  }});
  const costs = useQuery({ queryKey: ['crew-spending',orgId,projectId], enabled: !!orgId, queryFn: async () => {
    if(!orgId) return [];
    const {data,error} = await supabase.from('actual_cost_entries').select('*').eq('organization_id',orgId).eq('project_id',projectId).order('entry_date',{ascending:false}).order('created_at',{ascending:false});
    if(error) throw error; return data;
  }});
  const orders = useQuery({queryKey:['crew-tracker-orders',orgId,projectId],enabled:!!orgId,queryFn:async()=>{
    const {data,error}=await supabase.from('change_orders_role_view').select('id,title,co_number').eq('project_id',projectId);
    if(error) throw error; return data ?? [];
  }});
  const refresh = () => {
    client.invalidateQueries({queryKey:['crew-spending']});
    client.invalidateQueries({queryKey:['actual-costs']});
    client.invalidateQueries({queryKey:['actual-costs-project-total']});
  };
  const saveWorker = useMutation({mutationFn: async (worker: {name:string;pay_basis:string;rate:number;id?:string;active?:boolean}) => {
    if(!orgId) throw new Error('Crew project access required');
    const {id,...fields}=worker;
    const result=id ? await supabase.from('crew_workers').update(fields).eq('id',id).eq('organization_id',orgId) : await supabase.from('crew_workers').insert({...fields,organization_id:orgId});
    if(result.error) throw result.error;
  },onSuccess:()=>client.invalidateQueries({queryKey:['crew-workers']}),onError:e=>toast.error(e.message)});
  const saveCosts = useMutation({mutationFn:async(entries: Omit<CrewSpending,'id'|'created_at'|'organization_id'|'entered_by'>[])=>{
    if(!orgId || !user) throw new Error('Crew project access required');
    const {error}=await supabase.from('actual_cost_entries').insert(entries.map(e=>({...e,organization_id:orgId,entered_by:user.id})));
    if(error) throw new Error(error.code==='23505' ? 'A worker already has pay logged on this date. Edit that entry instead.' : error.message);
  },onSuccess:()=>{refresh();toast.success('Spending saved');},onError:e=>toast.error(e.message)});
  const deleteCost=useMutation({mutationFn:async(entry:CrewSpending)=>{
    if(!orgId) throw new Error('Crew project access required');
    const {error}=await supabase.from('actual_cost_entries').delete().eq('id',entry.id).eq('organization_id',orgId).select('id');
    if(error) throw error;
    if(entry.tracker_receipt_path) await supabase.storage.from('crew-receipts').remove([entry.tracker_receipt_path]);
  },onSuccess:refresh,onError:e=>toast.error(e.message)});
  const editCost=useMutation({mutationFn:async({id,quantity,amount}: {id:string;quantity?:number;amount?:number})=>{
    if(!orgId) throw new Error('Crew project access required');
    const {error}=await supabase.from('actual_cost_entries').update(quantity !== undefined ? {tracker_quantity:quantity} : {lump_amount:amount}).eq('id',id).eq('organization_id',orgId);
    if(error) throw error;
  },onSuccess:()=>{refresh();toast.success('Entry updated');},onError:e=>toast.error(e.message)});
  return {orgId,workers:workers.data??[],entries:costs.data??[],orders:orders.data??[],loading:access.isLoading||workers.isLoading||costs.isLoading,error:access.error||workers.error||costs.error,saveWorker,saveCosts,deleteCost,editCost};
}