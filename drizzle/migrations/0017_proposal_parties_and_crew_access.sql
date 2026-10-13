CREATE OR REPLACE FUNCTION public.proposal_parties(_project_id uuid, _org_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE issuer jsonb; recipients jsonb; owner_party jsonb; project_row public.projects%ROWTYPE;
BEGIN
 IF NOT public.can_see_project(_project_id) OR NOT EXISTS(SELECT 1 FROM public.user_org_roles WHERE user_id=auth.uid() AND organization_id=_org_id) THEN RAISE EXCEPTION 'Project access required'; END IF;
 SELECT * INTO project_row FROM public.projects WHERE id=_project_id;
 SELECT to_jsonb(o) INTO issuer FROM public.organizations o WHERE o.id=_org_id;
 SELECT coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) INTO recipients FROM public.organizations o WHERE o.id IN (SELECT DISTINCT c.to_org_id FROM public.project_contracts c WHERE c.project_id=_project_id AND c.from_org_id=_org_id AND c.status IS DISTINCT FROM 'rejected');
 IF jsonb_array_length(recipients)=0 THEN
 SELECT coalesce(jsonb_agg(to_jsonb(o)), '[]'::jsonb) INTO recipients FROM public.organizations o WHERE o.id IN (SELECT u.organization_id FROM public.project_relationships r JOIN public.project_participants d ON d.id=r.downstream_participant_id JOIN public.project_participants u ON u.id=r.upstream_participant_id WHERE r.project_id=_project_id AND d.organization_id=_org_id AND d.invite_status='ACCEPTED' AND u.invite_status='ACCEPTED');
 END IF;
 IF issuer->>'type'='GC' THEN
 SELECT p INTO owner_party FROM jsonb_array_elements(CASE WHEN jsonb_typeof(project_row.parties)='array' THEN project_row.parties ELSE '[]'::jsonb END) p WHERE lower(coalesce(p->>'role',p->>'type','')) IN ('owner','client','homeowner') LIMIT 1;
 recipients := '[]'::jsonb;
 END IF;
 RETURN jsonb_build_object('issuer',issuer,'recipients',recipients,'owner',owner_party,'owner_email',project_row.owner_approval_email,'site_address',project_row.address,'project_name',project_row.name);
END; $$;
REVOKE ALL ON FUNCTION public.proposal_parties(uuid,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.proposal_parties(uuid,uuid) TO authenticated, service_role;
DROP POLICY "Non-crew project participants can view proposals" ON public.co_proposals;
CREATE POLICY "Issuing company can view proposals" ON public.co_proposals FOR SELECT TO authenticated USING (public.can_see_project(project_id) AND EXISTS(SELECT 1 FROM public.user_org_roles u WHERE u.user_id=auth.uid() AND u.organization_id=org_id));
ALTER POLICY "Owning org can create proposals" ON public.co_proposals WITH CHECK (created_by_user_id=auth.uid() AND public.can_see_project(project_id) AND EXISTS(SELECT 1 FROM public.user_org_roles u WHERE u.user_id=auth.uid() AND u.organization_id=org_id));
ALTER POLICY "Owning org can update proposals" ON public.co_proposals USING (public.can_see_project(project_id) AND EXISTS(SELECT 1 FROM public.user_org_roles u WHERE u.user_id=auth.uid() AND u.organization_id=org_id)) WITH CHECK (public.can_see_project(project_id) AND EXISTS(SELECT 1 FROM public.user_org_roles u WHERE u.user_id=auth.uid() AND u.organization_id=org_id));
ALTER POLICY "Owning org can delete proposals" ON public.co_proposals USING (public.can_see_project(project_id) AND EXISTS(SELECT 1 FROM public.user_org_roles u WHERE u.user_id=auth.uid() AND u.organization_id=org_id));
DROP POLICY "Non-crew project participants can view proposal items" ON public.co_proposal_items;
CREATE POLICY "Issuing company can view proposal items" ON public.co_proposal_items FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.co_proposals p WHERE p.id=proposal_id));
DROP POLICY "Non-crew project participants can view proposal milestones" ON public.co_proposal_milestones;
CREATE POLICY "Issuing company can view proposal milestones" ON public.co_proposal_milestones FOR SELECT TO authenticated USING (EXISTS(SELECT 1 FROM public.co_proposals p WHERE p.id=proposal_id));