import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { EMPTY_CREW_BUDGET, type CrewBudget } from '@/lib/crewTracker';

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
  const tasks = useQuery({queryKey:['crew-job-tasks',orgId,projectId],enabled:!!orgId,queryFn:async()=>{
    if(!orgId) return [];
    const {data,error}=await supabase.from('crew_job_tasks').select('*').eq('organization_id',orgId).eq('project_id',projectId).order('created_at');
    if(error) throw error; return data;
  }});
  const budget = useQuery({ queryKey: ['crew-budget',orgId,projectId], enabled: !!orgId, queryFn: async () => {
    if(!orgId) return null;
    const {data,error} = await supabase.from('crew_project_budgets').select('*').eq('organization_id',orgId).eq('project_id',projectId).maybeSingle();
    if(error) throw error;
    return data;
  }});
  const saveBudget = useMutation({mutationFn:async(values:CrewBudget & {worker_labor?:number;hired_labor?:number})=>{
    if(!orgId) throw new Error('Crew project access required');
    if(Object.values(values).some(v=>!Number.isFinite(v)||v<0)) throw new Error('Budget amounts must be zero or greater');
    const {error}=await supabase.from('crew_project_budgets').upsert({...values,organization_id:orgId,project_id:projectId},{onConflict:'project_id,organization_id'});
    if(error) throw error;
  },onSuccess:()=>{client.invalidateQueries({queryKey:['crew-budget']});toast.success('Budget saved');},onError:e=>toast.error(e.message)});
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
    client.invalidateQueries({queryKey:['crew-job-tasks']});
    client.invalidateQueries({queryKey:['crew-spending']});
    client.invalidateQueries({queryKey:['actual-costs']});
    client.invalidateQueries({queryKey:['actual-costs-project-total']});
  };
  const saveTask=useMutation({mutationFn:async(task:{crew_name:string;task_name:string;pay_basis:string;quantity:number;rate:number})=>{
    if(!orgId) throw new Error('Crew project access required');
    const {error}=await supabase.from('crew_job_tasks').insert({...task,project_id:projectId,organization_id:orgId});
    if(error) throw error;
  },onSuccess:()=>{refresh();toast.success('Crew task added');},onError:e=>toast.error(e.message)});
  const deleteTask=useMutation({mutationFn:async(taskId:string)=>{
    if(!orgId) throw new Error('Crew project access required');
    const {error}=await supabase.from('crew_job_tasks').delete().eq('id',taskId).eq('organization_id',orgId);
    if(error) throw error;
  },onSuccess:()=>{refresh();toast.success('Crew task removed');},onError:e=>toast.error(e.message)});
  const saveDraw=useMutation({mutationFn:async(draw:{taskId:string;percent:number;amount:number;date:string;requestId:string})=>{
    const {error}=await supabase.rpc('record_crew_job_draw_once',{p_task_id:draw.taskId,p_percent:draw.percent,p_amount:draw.amount,p_date:draw.date,p_request_id:draw.requestId});
    if(error) throw error;
  },onSuccess:()=>{refresh();toast.success('Progress and payment saved');},onError:e=>toast.error(e.message)});
  const saveWorker = useMutation({mutationFn: async (worker: {name:string;pay_basis:string;rate:number;id?:string;active?:boolean}) => {
    if(!orgId) throw new Error('Crew project access required');
    const {id,...fields}=worker;
    const result=id ? await supabase.from('crew_workers').update(fields).eq('id',id).eq('organization_id',orgId) : await supabase.from('crew_workers').insert({...fields,organization_id:orgId});
    if(result.error) throw result.error;
  },onSuccess:()=>client.invalidateQueries({queryKey:['crew-workers']}),onError:e=>toast.error(e.message)});
  const saveCosts = useMutation({mutationFn:async(entries: Omit<TablesInsert<'actual_cost_entries'>,'organization_id'|'entered_by'|'tracker_job_task_id'|'tracker_draw_request_id'>[])=>{
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
  return {orgId,projectId,tasks:tasks.data??[],saveTask,deleteTask,saveDraw,workers:workers.data??[],entries:costs.data??[],orders:orders.data??[],budget:budget.data??EMPTY_CREW_BUDGET,hasBudget:!!budget.data,saveBudget,loading:access.isLoading||workers.isLoading||costs.isLoading||budget.isLoading||tasks.isLoading,error:access.error||workers.error||costs.error||budget.error||tasks.error,saveWorker,saveCosts,deleteCost,editCost};
}