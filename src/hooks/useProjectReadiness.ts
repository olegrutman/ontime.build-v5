import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ReadinessItem {
  key: string;
  label: string;
  complete: boolean;
  informational?: boolean;
}

export interface ProjectReadiness {
  percent: number;
  checklist: ReadinessItem[];
  loading: boolean;
  recalculate: () => void;
  creatorOrgType: 'GC' | 'TC' | null;
  isActive: boolean;
  firstContractId: string | null;
}

export function useProjectReadiness(projectId: string | undefined): ProjectReadiness {
  const [checklist, setChecklist] = useState<ReadinessItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatorOrgType, setCreatorOrgType] = useState<'GC' | 'TC' | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [firstContractId, setFirstContractId] = useState<string | null>(null);
  const activatingRef = useRef(false);

  const calculate = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);

    try {
      // Parallel queries
      const [
        projectRes,
        contractsRes,
        sovRes,
        participantsRes,
        estimatesRes,
        designatedSupplierRes,
      ] = await Promise.all([
        supabase.from('projects').select('status, created_by_org_id, organization_id').eq('id', projectId).single(),
        supabase.from('project_contracts').select('id, contract_sum, material_responsibility, from_org_id, to_org_id, from_role, to_role, status').eq('project_id', projectId),
        supabase.from('project_sov').select('id, contract_id, is_locked').eq('project_id', projectId),
        supabase.from('project_participants').select('id, role, invite_status, no_estimate_confirmed, organization_id, organizations:organization_id(name, type)').eq('project_id', projectId),
        supabase.from('supplier_estimates').select('id, supplier_org_id, status').eq('project_id', projectId),
        supabase.from('project_designated_suppliers').select('id, status').eq('project_id', projectId).limit(1),
      ]);

      const project = projectRes.data;
      if (!project) { setLoading(false); return; }

      const projectStatus = project.status;
      setIsActive(projectStatus === 'active');

      const contracts = contractsRes.data || [];
      const sovs = sovRes.data || [];
      const participants = participantsRes.data || [];
      const estimates = estimatesRes.data || [];

      setFirstContractId(contracts.length > 0 ? contracts[0].id : null);

      // Determine creator org type
      const creatorOrgId = project.created_by_org_id || project.organization_id;
      let detectedCreatorType: 'GC' | 'TC' | null = null;

      // Check participants to find creator org type
      const creatorParticipant = participants.find((p: any) => p.organization_id === creatorOrgId);
      if (creatorParticipant) {
        const orgType = (creatorParticipant as any).organizations?.type;
        if (orgType === 'GC' || orgType === 'TC') {
          detectedCreatorType = orgType;
        }
      }

      // Fallback: check role field
      if (!detectedCreatorType) {
        if (creatorParticipant?.role === 'GC') detectedCreatorType = 'GC';
        else if (creatorParticipant?.role === 'TC') detectedCreatorType = 'TC';
      }

      // Fallback: if no participant match, check org directly
      if (!detectedCreatorType && creatorOrgId) {
        const { data: orgData } = await supabase
          .from('organizations')
          .select('type')
          .eq('id', creatorOrgId)
          .single();
        if (orgData?.type === 'GC' || orgData?.type === 'TC') {
          detectedCreatorType = orgData.type;
        }
      }

      setCreatorOrgType(detectedCreatorType);

      // Helper: find contracts by role
      const gcContract = contracts.find(c => c.to_role === 'General Contractor' || c.from_role === 'General Contractor');
      const fcContract = contracts.find(c => c.to_role === 'Field Crew' || c.from_role === 'Field Crew');

      // Helper: check SOV exists for a contract
      const hasSovForContract = (contractId: string) => sovs.some(s => s.contract_id === contractId);

      // Helper: check participant acceptance by role
      const getParticipantsByRole = (role: string) => participants.filter(p => p.role === role);
      const isRoleAccepted = (role: string) => {
        const parts = getParticipantsByRole(role);
        return parts.length > 0 && parts.every(p => p.invite_status === 'ACCEPTED');
      };
      const getRolePendingNames = (role: string) => {
        return getParticipantsByRole(role)
          .filter(p => p.invite_status !== 'ACCEPTED')
          .map(p => (p as any).organizations?.name || 'Unknown')
          .filter(Boolean);
      };

      // Check supplier status
      const supplierParticipants = getParticipantsByRole('SUPPLIER');
      const designatedSuppliers = designatedSupplierRes.data || [];
      const hasDesignatedSupplier = designatedSuppliers.some((ds: any) => ds.status === 'active');
      const hasRealSupplier = supplierParticipants.length > 0;
      const hasSupplier = hasRealSupplier || hasDesignatedSupplier;
      const supplierAccepted = hasRealSupplier
        ? supplierParticipants.every(p => p.invite_status === 'ACCEPTED')
        : hasDesignatedSupplier; // designated suppliers are directly assigned
      const supplierPendingNames = getRolePendingNames('SUPPLIER');

      // Check supplier estimate status (only relevant for real supplier participants)
      const supplierHasEstimate = hasRealSupplier && supplierParticipants.some(sp => {
        const hasUploadedEstimate = estimates.some(e => (e as any).supplier_org_id === sp.organization_id);
        const confirmedNoEstimate = (sp as any).no_estimate_confirmed === true;
        return hasUploadedEstimate || confirmedNoEstimate;
      });

      // Material responsibility
      const hasMaterialResp = contracts.some(c => c.material_responsibility != null && c.material_responsibility !== '');
      const materialResp = contracts.find(c => c.material_responsibility)?.material_responsibility;

      // FC invited?
      const fcParticipants = getParticipantsByRole('FC');
      const fcInvited = fcParticipants.length > 0;
      const fcAccepted = isRoleAccepted('FC');
      const fcPendingNames = getRolePendingNames('FC');

      // GC accepted?
      const gcAccepted = isRoleAccepted('GC');
      const gcPendingNames = getRolePendingNames('GC');

      // TC accepted?
      const tcAccepted = isRoleAccepted('TC');
      const tcPendingNames = getRolePendingNames('TC');

      // Build checklist based on creator type
      const items: ReadinessItem[] = [];

      if (detectedCreatorType === 'TC') {
        // TC-Created Project Checklist — items only shown if the role exists in the project
        const gcParticipants = getParticipantsByRole('GC');
        const hasGCRole = gcParticipants.length > 0 || !!gcContract;
        const hasFCRole = fcParticipants.length > 0 || !!fcContract;

        if (gcContract) {
          const hasGCContractSum = gcContract.contract_sum != null && gcContract.contract_sum > 0;
          items.push({ key: 'gc_contract_sum', label: 'Contract sum with GC entered', complete: hasGCContractSum });
          items.push({ key: 'gc_sov', label: 'SOV for GC contract created', complete: hasSovForContract(gcContract.id) });
        }

        if (fcContract) {
          const hasFCContractSum = fcContract.contract_sum != null && fcContract.contract_sum > 0;
          items.push({ key: 'fc_contract_sum', label: 'Contract sum with FC entered', complete: hasFCContractSum });
          items.push({ key: 'fc_sov', label: 'SOV for FC contract created', complete: hasSovForContract(fcContract.id) });
        }

        items.push({ key: 'material_resp', label: 'Material responsibility selected', complete: hasMaterialResp });

        if (materialResp === 'TC' || !hasMaterialResp) {
          items.push({ key: 'supplier', label: hasSupplier ? 'Supplier assigned' : 'Supplier not yet assigned', complete: hasSupplier });
        }

        if (hasGCRole) {
          items.push({
            key: 'gc_accepted',
            label: gcAccepted ? 'GC accepted' : `Awaiting GC${gcPendingNames.length > 0 ? ': ' + gcPendingNames.join(', ') : ''}`,
            complete: gcAccepted,
          });
        }

        if (hasFCRole) {
          items.push({
            key: 'fc_accepted',
            label: fcAccepted ? 'FC accepted' : `Awaiting FC${fcPendingNames.length > 0 ? ': ' + fcPendingNames.join(', ') : ''}`,
            complete: fcAccepted,
          });
        }

        if (hasSupplier) {
          items.push({
            key: 'supplier_accepted',
            label: supplierAccepted ? 'Supplier accepted' : `Awaiting Supplier${supplierPendingNames.length > 0 ? ': ' + supplierPendingNames.join(', ') : ''}`,
            complete: supplierAccepted,
          });
        }

        if (hasRealSupplier) {
          items.push({
            key: 'supplier_estimate',
            label: supplierHasEstimate ? 'Supplier estimate uploaded' : 'Awaiting supplier estimate',
            complete: supplierHasEstimate,
          });
        }
      } else {
        // GC-Created Project Checklist — items only shown if the role exists
        const tcParticipants = getParticipantsByRole('TC');
        const hasTCRole = tcParticipants.length > 0 || contracts.some(c => c.from_role === 'Trade Contractor' || c.to_role === 'Trade Contractor');

        if (hasTCRole) {
          const hasTCContractSum = contracts.some(c => 
            (c.from_role === 'Trade Contractor' || c.to_role === 'Trade Contractor') &&
            c.contract_sum != null && c.contract_sum > 0
          );
          items.push({ key: 'tc_contract_sum', label: 'Contract sum with TC entered', complete: hasTCContractSum });

          items.push({
            key: 'tc_accepted',
            label: tcAccepted ? 'TC accepted' : `Awaiting TC${tcPendingNames.length > 0 ? ': ' + tcPendingNames.join(', ') : ''}`,
            complete: tcAccepted,
          });
        }

        const hasSov = sovs.length > 0;
        items.push({ key: 'sov', label: 'Schedule of Values created', complete: hasSov });

        items.push({ key: 'material_resp', label: 'Material responsibility selected', complete: hasMaterialResp });

        if (hasMaterialResp) {
          items.push({ key: 'supplier', label: hasSupplier ? 'Supplier assigned' : 'Supplier not yet assigned', complete: hasSupplier });
        }

        if (hasSupplier) {
          items.push({
            key: 'supplier_accepted',
            label: supplierAccepted ? 'Supplier accepted' : `Awaiting Supplier${supplierPendingNames.length > 0 ? ': ' + supplierPendingNames.join(', ') : ''}`,
            complete: supplierAccepted,
          });
        }

        if (hasRealSupplier) {
          items.push({
            key: 'supplier_estimate',
            label: supplierHasEstimate ? 'Supplier estimate uploaded' : 'Awaiting supplier estimate',
            complete: supplierHasEstimate,
          });
        }

        if (fcInvited) {
          items.push({
            key: 'fc_accepted',
            label: fcAccepted ? 'FC accepted' : `Awaiting FC${fcPendingNames.length > 0 ? ': ' + fcPendingNames.join(', ') : ''}`,
            complete: fcAccepted,
          });
        }
      }

      setChecklist(items);

      // Auto-activation: if all items complete and project is in setup status
      const allComplete = items.length > 0 && items.every(i => i.complete);
      if (allComplete && projectStatus === 'setup' && !activatingRef.current) {
        activatingRef.current = true;
        const { error } = await supabase
          .from('projects')
          .update({ status: 'active' })
          .eq('id', projectId);
        
        if (!error) {
          setIsActive(true);
          toast.success('Project is now active!');
        } else {
          console.error('Failed to auto-activate project:', error);
        }
        activatingRef.current = false;
      }
    } catch (err) {
      console.error('Error calculating readiness:', err);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => { calculate(); }, [calculate]);

  const blocking = checklist.filter(i => !i.informational);
  const completedCount = blocking.filter(i => i.complete).length;
  const percent = blocking.length > 0 ? Math.round((completedCount / blocking.length) * 100) : 0;

  return { percent, checklist, loading, recalculate: calculate, creatorOrgType, isActive, firstContractId };
}
