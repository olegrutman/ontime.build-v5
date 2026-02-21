
-- =============================================
-- FULL PLATFORM STRESS TEST DATA SEED (FIXED)
-- =============================================

-- Phase 1: Fix gc@test.com admin + create supplier
UPDATE user_org_roles 
SET is_admin = true 
WHERE user_id = 'ef6822a5-c7c0-4a0d-8ac6-3e8647d0452a' 
  AND organization_id = '96a802b8-72a4-42e5-aa00-b7c675a9bb62';

INSERT INTO suppliers (id, organization_id, supplier_code, name, contact_info)
VALUES ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', '12b5d7de-1bd1-431d-9601-93ba3d56870b', 'SUPP-TEST', 'Test Building Supply Co.', 'supp@test.com / 555-0100')
ON CONFLICT DO NOTHING;

INSERT INTO trusted_partners (organization_id, partner_org_id) VALUES
  ('96a802b8-72a4-42e5-aa00-b7c675a9bb62', 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6'),
  ('96a802b8-72a4-42e5-aa00-b7c675a9bb62', '6e563ffc-32f1-4f52-a8f9-95e274cad56f'),
  ('96a802b8-72a4-42e5-aa00-b7c675a9bb62', '12b5d7de-1bd1-431d-9601-93ba3d56870b'),
  ('ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6', '96a802b8-72a4-42e5-aa00-b7c675a9bb62'),
  ('ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6', '6e563ffc-32f1-4f52-a8f9-95e274cad56f'),
  ('ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6', '12b5d7de-1bd1-431d-9601-93ba3d56870b'),
  ('6e563ffc-32f1-4f52-a8f9-95e274cad56f', '96a802b8-72a4-42e5-aa00-b7c675a9bb62'),
  ('6e563ffc-32f1-4f52-a8f9-95e274cad56f', 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6'),
  ('12b5d7de-1bd1-431d-9601-93ba3d56870b', '96a802b8-72a4-42e5-aa00-b7c675a9bb62'),
  ('12b5d7de-1bd1-431d-9601-93ba3d56870b', 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6')
ON CONFLICT DO NOTHING;

DO $$
DECLARE
  gc_org_id UUID := '96a802b8-72a4-42e5-aa00-b7c675a9bb62';
  tc_org_id UUID := 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6';
  fc_org_id UUID := '6e563ffc-32f1-4f52-a8f9-95e274cad56f';
  supp_org_id UUID := '12b5d7de-1bd1-431d-9601-93ba3d56870b';
  gc_user UUID := 'ef6822a5-c7c0-4a0d-8ac6-3e8647d0452a';
  tc_user UUID := '5ee21ec7-775e-413b-9999-c941ed21a431';
  fc_user UUID := '038e7252-b863-439a-8e21-895e37ec731f';
  supp_user UUID := '2844b6d1-0a99-41ce-9aed-4eca7598e32a';
  supplier_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890';

  p1 UUID := gen_random_uuid(); p2 UUID := gen_random_uuid();
  p3 UUID := gen_random_uuid(); p4 UUID := gen_random_uuid();
  p5 UUID := gen_random_uuid(); p6 UUID := gen_random_uuid();
  p7 UUID := gen_random_uuid(); p8 UUID := gen_random_uuid();
  p9 UUID := gen_random_uuid(); p10 UUID := gen_random_uuid();

  pp_gc1 UUID; pp_tc1 UUID; pp_fc1 UUID; pp_supp1 UUID;
  pp_gc2 UUID; pp_tc2 UUID; pp_fc2 UUID; pp_supp2 UUID;
  pp_gc3 UUID; pp_tc3 UUID; pp_fc3 UUID;
  pp_gc4 UUID; pp_tc4 UUID; pp_fc4 UUID; pp_supp4 UUID;
  pp_gc5 UUID; pp_tc5 UUID; pp_fc5 UUID;
  pp_gc6 UUID; pp_tc6 UUID; pp_fc6 UUID; pp_supp6 UUID;
  pp_gc7 UUID; pp_tc7 UUID; pp_fc7 UUID;
  pp_gc8 UUID; pp_tc8 UUID; pp_fc8 UUID;
  pp_gc9 UUID; pp_tc9 UUID; pp_fc9 UUID; pp_supp9 UUID;
  pp_gc10 UUID; pp_tc10 UUID; pp_fc10 UUID;

  c1 UUID; c2 UUID; c3 UUID; c4 UUID; c5 UUID;
  c6 UUID; c7 UUID; c8 UUID; c9 UUID; c10 UUID;
  s1 UUID; s2 UUID; s3 UUID; s4 UUID; s5 UUID;
  s6 UUID; s7 UUID; s8 UUID; s9 UUID; s10 UUID;

  wo UUID;
  proj_ids UUID[];
  proj_id UUID;
  inv_id UUID;
  po_id UUID;
  sov_item_id UUID;
  po_counter INT := 1;
  i INT;
  j INT;

BEGIN
  proj_ids := ARRAY[p1, p2, p3, p4, p5, p6, p7, p8, p9, p10];

  -- ========== PROJECTS ==========
  INSERT INTO projects (id, organization_id, name, project_type, build_type, status, created_by, created_by_org_id, retainage_percent, address, city, state, zip) VALUES
    (p1, gc_org_id, 'TEST - Apartments Alpha', 'commercial', 'new_construction', 'active', gc_user, gc_org_id, 5, '{"street":"100 Alpha Blvd","city":"Austin","state":"TX","zip":"78701"}'::jsonb, 'Austin', 'TX', '78701'),
    (p2, gc_org_id, 'TEST - Apartments Beta', 'commercial', 'new_construction', 'active', gc_user, gc_org_id, 8, '{"street":"200 Beta Ave","city":"Dallas","state":"TX","zip":"75201"}'::jsonb, 'Dallas', 'TX', '75201'),
    (p3, gc_org_id, 'TEST - Apartments Gamma', 'commercial', 'renovation', 'setup', gc_user, gc_org_id, 5, '{"street":"300 Gamma Rd","city":"Houston","state":"TX","zip":"77001"}'::jsonb, 'Houston', 'TX', '77001'),
    (p4, gc_org_id, 'TEST - Townhomes Delta', 'residential', 'new_construction', 'active', gc_user, gc_org_id, 10, '{"street":"400 Delta Ln","city":"San Antonio","state":"TX","zip":"78201"}'::jsonb, 'San Antonio', 'TX', '78201'),
    (p5, gc_org_id, 'TEST - Townhomes Epsilon', 'residential', 'addition', 'setup', gc_user, gc_org_id, 5, '{"street":"500 Epsilon Dr","city":"Austin","state":"TX","zip":"78702"}'::jsonb, 'Austin', 'TX', '78702'),
    (p6, gc_org_id, 'TEST - SFR Zeta', 'residential', 'new_construction', 'active', gc_user, gc_org_id, 10, '{"street":"600 Zeta Way","city":"Fort Worth","state":"TX","zip":"76101"}'::jsonb, 'Fort Worth', 'TX', '76101'),
    (p7, gc_org_id, 'TEST - SFR Eta', 'residential', 'renovation', 'active', gc_user, gc_org_id, 5, '{"street":"700 Eta St","city":"Plano","state":"TX","zip":"75023"}'::jsonb, 'Plano', 'TX', '75023'),
    (p8, gc_org_id, 'TEST - SFR Theta', 'residential', 'new_construction', 'setup', gc_user, gc_org_id, 8, '{"street":"800 Theta Ct","city":"Frisco","state":"TX","zip":"75034"}'::jsonb, 'Frisco', 'TX', '75034'),
    (p9, gc_org_id, 'TEST - Custom Home Iota', 'residential', 'new_construction', 'active', gc_user, gc_org_id, 5, '{"street":"900 Iota Pl","city":"Lakeway","state":"TX","zip":"78734"}'::jsonb, 'Lakeway', 'TX', '78734'),
    (p10, gc_org_id, 'TEST - Custom Home Kappa', 'residential', 'addition', 'setup', gc_user, gc_org_id, 10, '{"street":"1000 Kappa Blvd","city":"Cedar Park","state":"TX","zip":"78613"}'::jsonb, 'Cedar Park', 'TX', '78613');

  -- ========== PARTICIPANTS ==========
  -- P1: active, GC mat, supplier
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p1, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_gc1;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p1, tc_org_id, 'TC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_tc1;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p1, fc_org_id, 'FC', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_fc1;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p1, supp_org_id, 'SUPPLIER', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_supp1;

  -- P2: active, TC mat, supplier
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p2, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'TC') RETURNING id INTO pp_gc2;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p2, tc_org_id, 'TC', gc_user, 'ACCEPTED', now(), 'TC') RETURNING id INTO pp_tc2;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p2, fc_org_id, 'FC', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_fc2;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p2, supp_org_id, 'SUPPLIER', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_supp2;

  -- P3: setup, TC pending, GC mat
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p3, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_gc3;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, material_responsibility) VALUES (p3, tc_org_id, 'TC', gc_user, 'INVITED', 'GC') RETURNING id INTO pp_tc3;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p3, fc_org_id, 'FC', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_fc3;

  -- P4: active, TC mat, supplier
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p4, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'TC') RETURNING id INTO pp_gc4;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p4, tc_org_id, 'TC', gc_user, 'ACCEPTED', now(), 'TC') RETURNING id INTO pp_tc4;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p4, fc_org_id, 'FC', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_fc4;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p4, supp_org_id, 'SUPPLIER', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_supp4;

  -- P5: setup, FC pending, GC mat
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p5, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_gc5;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p5, tc_org_id, 'TC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_tc5;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status) VALUES (p5, fc_org_id, 'FC', gc_user, 'INVITED') RETURNING id INTO pp_fc5;

  -- P6: active, TC mat, supplier
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p6, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'TC') RETURNING id INTO pp_gc6;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p6, tc_org_id, 'TC', gc_user, 'ACCEPTED', now(), 'TC') RETURNING id INTO pp_tc6;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p6, fc_org_id, 'FC', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_fc6;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p6, supp_org_id, 'SUPPLIER', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_supp6;

  -- P7: active, GC mat, no supplier
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p7, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_gc7;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p7, tc_org_id, 'TC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_tc7;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p7, fc_org_id, 'FC', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_fc7;

  -- P8: setup, all pending except GC, TC mat
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p8, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'TC') RETURNING id INTO pp_gc8;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, material_responsibility) VALUES (p8, tc_org_id, 'TC', gc_user, 'INVITED', 'TC') RETURNING id INTO pp_tc8;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status) VALUES (p8, fc_org_id, 'FC', gc_user, 'INVITED') RETURNING id INTO pp_fc8;

  -- P9: active, GC mat, supplier
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p9, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_gc9;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p9, tc_org_id, 'TC', gc_user, 'ACCEPTED', now(), 'GC') RETURNING id INTO pp_tc9;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p9, fc_org_id, 'FC', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_fc9;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p9, supp_org_id, 'SUPPLIER', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_supp9;

  -- P10: setup, TC pending, TC mat
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at, material_responsibility) VALUES (p10, gc_org_id, 'GC', gc_user, 'ACCEPTED', now(), 'TC') RETURNING id INTO pp_gc10;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, material_responsibility) VALUES (p10, tc_org_id, 'TC', gc_user, 'INVITED', 'TC') RETURNING id INTO pp_tc10;
  INSERT INTO project_participants (project_id, organization_id, role, invited_by, invite_status, accepted_at) VALUES (p10, fc_org_id, 'FC', gc_user, 'ACCEPTED', now()) RETURNING id INTO pp_fc10;

  -- ========== PROJECT TEAM ==========
  INSERT INTO project_team (project_id, org_id, user_id, role, status, accepted_at, invited_by_user_id) VALUES
    (p1, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p1, tc_org_id, tc_user, 'Trade Contractor', 'Accepted', now(), gc_user),
    (p1, fc_org_id, fc_user, 'Field Crew', 'Accepted', now(), gc_user),
    (p1, supp_org_id, supp_user, 'Supplier', 'Accepted', now(), gc_user),
    (p2, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p2, tc_org_id, tc_user, 'Trade Contractor', 'Accepted', now(), gc_user),
    (p2, fc_org_id, fc_user, 'Field Crew', 'Accepted', now(), gc_user),
    (p2, supp_org_id, supp_user, 'Supplier', 'Accepted', now(), gc_user),
    (p3, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p3, tc_org_id, NULL, 'Trade Contractor', 'Invited', NULL, gc_user),
    (p3, fc_org_id, fc_user, 'Field Crew', 'Accepted', now(), gc_user),
    (p4, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p4, tc_org_id, tc_user, 'Trade Contractor', 'Accepted', now(), gc_user),
    (p4, fc_org_id, fc_user, 'Field Crew', 'Accepted', now(), gc_user),
    (p4, supp_org_id, supp_user, 'Supplier', 'Accepted', now(), gc_user),
    (p5, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p5, tc_org_id, tc_user, 'Trade Contractor', 'Accepted', now(), gc_user),
    (p5, fc_org_id, NULL, 'Field Crew', 'Invited', NULL, gc_user),
    (p6, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p6, tc_org_id, tc_user, 'Trade Contractor', 'Accepted', now(), gc_user),
    (p6, fc_org_id, fc_user, 'Field Crew', 'Accepted', now(), gc_user),
    (p6, supp_org_id, supp_user, 'Supplier', 'Accepted', now(), gc_user),
    (p7, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p7, tc_org_id, tc_user, 'Trade Contractor', 'Accepted', now(), gc_user),
    (p7, fc_org_id, fc_user, 'Field Crew', 'Accepted', now(), gc_user),
    (p8, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p8, tc_org_id, NULL, 'Trade Contractor', 'Invited', NULL, gc_user),
    (p8, fc_org_id, NULL, 'Field Crew', 'Invited', NULL, gc_user),
    (p9, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p9, tc_org_id, tc_user, 'Trade Contractor', 'Accepted', now(), gc_user),
    (p9, fc_org_id, fc_user, 'Field Crew', 'Accepted', now(), gc_user),
    (p9, supp_org_id, supp_user, 'Supplier', 'Accepted', now(), gc_user),
    (p10, gc_org_id, gc_user, 'General Contractor', 'Accepted', now(), gc_user),
    (p10, tc_org_id, NULL, 'Trade Contractor', 'Invited', NULL, gc_user),
    (p10, fc_org_id, fc_user, 'Field Crew', 'Accepted', now(), gc_user);

  -- ========== RELATIONSHIPS ==========
  INSERT INTO project_relationships (project_id, upstream_participant_id, downstream_participant_id, relationship_type, material_responsibility) VALUES
    (p1, pp_gc1, pp_tc1, 'GC_TC', 'GC'), (p2, pp_gc2, pp_tc2, 'GC_TC', 'TC'),
    (p4, pp_gc4, pp_tc4, 'GC_TC', 'TC'), (p6, pp_gc6, pp_tc6, 'GC_TC', 'TC'),
    (p7, pp_gc7, pp_tc7, 'GC_TC', 'GC'), (p9, pp_gc9, pp_tc9, 'GC_TC', 'GC');
  INSERT INTO project_relationships (project_id, upstream_participant_id, downstream_participant_id, relationship_type) VALUES
    (p1, pp_tc1, pp_fc1, 'TC_FC'), (p2, pp_tc2, pp_fc2, 'TC_FC'),
    (p4, pp_tc4, pp_fc4, 'TC_FC'), (p6, pp_tc6, pp_fc6, 'TC_FC'),
    (p7, pp_tc7, pp_fc7, 'TC_FC'), (p9, pp_tc9, pp_fc9, 'TC_FC');

  -- ========== CONTRACTS ==========
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p1, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 250000, 5, 'Active', 'GC', gc_user) RETURNING id INTO c1;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p2, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 450000, 8, 'Active', 'TC', gc_user) RETURNING id INTO c2;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p3, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 500000, 5, 'Invited', 'GC', gc_user) RETURNING id INTO c3;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p4, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 120000, 10, 'Active', 'TC', gc_user) RETURNING id INTO c4;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p5, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 180000, 5, 'Active', 'GC', gc_user) RETURNING id INTO c5;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p6, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 85000, 10, 'Active', 'TC', gc_user) RETURNING id INTO c6;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p7, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 65000, 5, 'Active', 'GC', gc_user) RETURNING id INTO c7;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p8, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 75000, 8, 'Invited', 'TC', gc_user) RETURNING id INTO c8;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p9, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 350000, 5, 'Active', 'GC', gc_user) RETURNING id INTO c9;
  INSERT INTO project_contracts (id, project_id, from_org_id, to_org_id, from_role, to_role, trade, contract_sum, retainage_percent, status, material_responsibility, created_by_user_id) VALUES
    (gen_random_uuid(), p10, tc_org_id, gc_org_id, 'Trade Contractor', 'General Contractor', 'Framing', 55000, 10, 'Invited', 'TC', gc_user) RETURNING id INTO c10;

  -- ========== SOVs ==========
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p1, c1, 'Framing SOV - Alpha') RETURNING id INTO s1;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p2, c2, 'Framing SOV - Beta') RETURNING id INTO s2;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p3, c3, 'Framing SOV - Gamma') RETURNING id INTO s3;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p4, c4, 'Framing SOV - Delta') RETURNING id INTO s4;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p5, c5, 'Framing SOV - Epsilon') RETURNING id INTO s5;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p6, c6, 'Framing SOV - Zeta') RETURNING id INTO s6;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p7, c7, 'Framing SOV - Eta') RETURNING id INTO s7;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p8, c8, 'Framing SOV - Theta') RETURNING id INTO s8;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p9, c9, 'Framing SOV - Iota') RETURNING id INTO s9;
  INSERT INTO project_sov (id, project_id, contract_id, sov_name) VALUES (gen_random_uuid(), p10, c10, 'Framing SOV - Kappa') RETURNING id INTO s10;

  -- ========== SOV ITEMS ==========
  INSERT INTO project_sov_items (sov_id, project_id, sort_order, item_name, source, default_enabled, percent_of_contract, value_amount, scheduled_value) VALUES
    (s1, p1, 0, 'Floor Framing - Bldgs 1-5', 'user', true, 30, 75000, 75000),
    (s1, p1, 1, 'Wall Framing - Bldgs 1-5', 'user', true, 35, 87500, 87500),
    (s1, p1, 2, 'Roof Framing - Bldgs 1-5', 'user', true, 25, 62500, 62500),
    (s1, p1, 3, 'Sheathing & Hardware', 'user', true, 10, 25000, 25000),
    (s2, p2, 0, 'Foundation Layout', 'user', true, 10, 45000, 45000),
    (s2, p2, 1, 'Floor Framing - All Bldgs', 'user', true, 25, 112500, 112500),
    (s2, p2, 2, 'Wall Framing - All Bldgs', 'user', true, 30, 135000, 135000),
    (s2, p2, 3, 'Roof Framing - All Bldgs', 'user', true, 25, 112500, 112500),
    (s2, p2, 4, 'Punch List & Completion', 'user', true, 10, 45000, 45000),
    (s3, p3, 0, 'Demo & Prep', 'user', true, 15, 75000, 75000),
    (s3, p3, 1, 'Structural Reinforcement', 'user', true, 30, 150000, 150000),
    (s3, p3, 2, 'Re-framing Interior', 'user', true, 30, 150000, 150000),
    (s3, p3, 3, 'Exterior Envelope', 'user', true, 25, 125000, 125000),
    (s4, p4, 0, 'Floor Framing - Units 1-6', 'user', true, 30, 36000, 36000),
    (s4, p4, 1, 'Wall Framing - Units 1-6', 'user', true, 40, 48000, 48000),
    (s4, p4, 2, 'Roof Trusses & Sheathing', 'user', true, 30, 36000, 36000),
    (s5, p5, 0, 'Addition Foundation', 'user', true, 25, 45000, 45000),
    (s5, p5, 1, 'Addition Walls', 'user', true, 35, 63000, 63000),
    (s5, p5, 2, 'Roof Tie-in', 'user', true, 25, 45000, 45000),
    (s5, p5, 3, 'Interior Partitions', 'user', true, 15, 27000, 27000),
    (s6, p6, 0, 'Floor Framing', 'user', true, 30, 25500, 25500),
    (s6, p6, 1, 'Wall Framing', 'user', true, 40, 34000, 34000),
    (s6, p6, 2, 'Roof Framing', 'user', true, 30, 25500, 25500),
    (s7, p7, 0, 'Demo Existing', 'user', true, 20, 13000, 13000),
    (s7, p7, 1, 'New Wall Framing', 'user', true, 40, 26000, 26000),
    (s7, p7, 2, 'Roof Repairs', 'user', true, 40, 26000, 26000),
    (s8, p8, 0, 'Floor Framing', 'user', true, 30, 22500, 22500),
    (s8, p8, 1, 'Wall Framing', 'user', true, 40, 30000, 30000),
    (s8, p8, 2, 'Roof Framing', 'user', true, 30, 22500, 22500),
    (s9, p9, 0, 'Foundation & Floor', 'user', true, 25, 87500, 87500),
    (s9, p9, 1, 'Walls - Main Level', 'user', true, 25, 87500, 87500),
    (s9, p9, 2, 'Walls - Upper Level', 'user', true, 20, 70000, 70000),
    (s9, p9, 3, 'Roof System', 'user', true, 20, 70000, 70000),
    (s9, p9, 4, 'Specialty Details', 'user', true, 10, 35000, 35000),
    (s10, p10, 0, 'Addition Floor', 'user', true, 35, 19250, 19250),
    (s10, p10, 1, 'Addition Walls', 'user', true, 35, 19250, 19250),
    (s10, p10, 2, 'Roof Tie-in', 'user', true, 30, 16500, 16500);

  -- ========== WORK ORDERS (50 total) ==========
  FOR i IN 0..9 LOOP
    proj_id := proj_ids[i+1];

    -- WO1: Fixed, Draft
    wo := gen_random_uuid();
    INSERT INTO change_order_projects (id, project_id, title, description, pricing_mode, status, work_type, created_by, created_by_role, location_data, requires_materials, material_cost_responsibility)
    VALUES (wo, proj_id, 'WO-' || (i*5+1) || ' Floor Framing A', 'Frame floor joists section A', 'fixed', 'draft', 'framing', gc_user, 'GC_PM', '{"inside_outside":"inside","level":"Level 1","room_area":"Section A"}'::jsonb, true, 'TC');
    INSERT INTO change_order_participants (change_order_id, organization_id, role, is_active) VALUES (wo, tc_org_id, 'TC', true), (wo, fc_org_id, 'FC', true);
    INSERT INTO change_order_tc_labor (change_order_id, hours, hourly_rate, labor_total, pricing_type, description, entered_by) VALUES (wo, 40, 65, 2600, 'hourly', 'Floor framing labor', tc_user);
    INSERT INTO change_order_materials (change_order_id, description, quantity, uom, unit_cost, final_price) VALUES (wo, '2x10x16 Floor Joists', 120, 'EA', 18.50, 2220), (wo, '3/4" T&G Plywood', 40, 'SHT', 45, 1800);

    -- WO2: Fixed, Ready for Approval
    wo := gen_random_uuid();
    INSERT INTO change_order_projects (id, project_id, title, description, pricing_mode, status, work_type, created_by, created_by_role, location_data, requires_materials, material_cost_responsibility)
    VALUES (wo, proj_id, 'WO-' || (i*5+2) || ' Wall Framing Ext', 'Frame exterior walls', 'fixed', 'ready_for_approval', 'framing', tc_user, 'TC_PM', '{"inside_outside":"outside","level":"Level 1","exterior_feature":"North Wall"}'::jsonb, true, 'TC');
    INSERT INTO change_order_participants (change_order_id, organization_id, role, is_active) VALUES (wo, tc_org_id, 'TC', true), (wo, fc_org_id, 'FC', true);
    INSERT INTO change_order_tc_labor (change_order_id, hours, hourly_rate, labor_total, pricing_type, description, entered_by) VALUES (wo, 60, 65, 3900, 'hourly', 'Ext wall framing', tc_user);
    INSERT INTO change_order_materials (change_order_id, description, quantity, uom, unit_cost, final_price) VALUES (wo, '2x6x8 Wall Studs', 200, 'EA', 8.50, 1700), (wo, '1/2" OSB Sheathing', 50, 'SHT', 32, 1600);

    -- WO3: Fixed, approve for active projects (trigger fires -> contracted)
    wo := gen_random_uuid();
    INSERT INTO change_order_projects (id, project_id, title, description, pricing_mode, status, work_type, created_by, created_by_role, location_data, final_price, labor_total, material_total)
    VALUES (wo, proj_id, 'WO-' || (i*5+3) || ' Roof Truss Install', 'Install roof trusses', 'fixed', 'draft', 'framing', gc_user, 'GC_PM', '{"inside_outside":"outside","level":"Roof","exterior_feature":"Roof"}'::jsonb, 8500, 5200, 3300);
    INSERT INTO change_order_participants (change_order_id, organization_id, role, is_active) VALUES (wo, tc_org_id, 'TC', true), (wo, fc_org_id, 'FC', true);
    INSERT INTO change_order_tc_labor (change_order_id, hours, hourly_rate, labor_total, pricing_type, description, entered_by) VALUES (wo, 80, 65, 5200, 'hourly', 'Roof truss install', tc_user);
    INSERT INTO change_order_materials (change_order_id, description, quantity, uom, unit_cost, final_price) VALUES (wo, 'Pre-fab Roof Trusses', 15, 'EA', 220, 3300);
    IF i IN (0,1,3,5,6,8) THEN
      UPDATE change_order_projects SET status = 'approved' WHERE id = wo;
    END IF;

    -- WO4: T&M, Draft
    wo := gen_random_uuid();
    INSERT INTO change_order_projects (id, project_id, title, description, pricing_mode, status, work_type, created_by, created_by_role, location_data)
    VALUES (wo, proj_id, 'WO-' || (i*5+4) || ' Blocking & Backing', 'Install blocking per plan', 'tm', 'draft', 'framing', tc_user, 'TC_PM', '{"inside_outside":"inside","level":"Level 2","room_area":"All Rooms"}'::jsonb);
    INSERT INTO change_order_participants (change_order_id, organization_id, role, is_active) VALUES (wo, tc_org_id, 'TC', true), (wo, fc_org_id, 'FC', true);

    -- WO5: T&M, Rejected
    wo := gen_random_uuid();
    INSERT INTO change_order_projects (id, project_id, title, description, pricing_mode, status, work_type, created_by, created_by_role, location_data, rejection_notes)
    VALUES (wo, proj_id, 'WO-' || (i*5+5) || ' Extra Shear Wall', 'Add shear wall per engineer', 'tm', 'rejected', 'framing', tc_user, 'TC_PM', '{"inside_outside":"inside","level":"Level 1","room_area":"Garage"}'::jsonb, 'Not approved - need revised scope');
    INSERT INTO change_order_participants (change_order_id, organization_id, role, is_active) VALUES (wo, tc_org_id, 'TC', true), (wo, fc_org_id, 'FC', true);
  END LOOP;

  -- ========== INVOICES ==========
  -- P1: 2 invoices (c1, s1, ret 5%)
  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by)
  VALUES (inv_id, p1, c1, s1, 'TEST-INV-0001', '2026-01-01', '2026-01-31', 'SUBMITTED', 75000, 3750, 71250, tc_user, now(), tc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s1 ORDER BY sort_order LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Floor Framing - Bldgs 1-5', 75000, 0, 75000, 75000, 5, 3750, 0);

  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by)
  VALUES (inv_id, p1, c1, s1, 'TEST-INV-0002', '2026-02-01', '2026-02-28', 'DRAFT', 43750, 2187.50, 41562.50, tc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s1 ORDER BY sort_order OFFSET 1 LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Wall Framing - Bldgs 1-5 (50%)', 87500, 0, 43750, 43750, 5, 2187.50, 0);

  -- P2: 3 invoices (c2, s2, ret 8%)
  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by, approved_at, approved_by)
  VALUES (inv_id, p2, c2, s2, 'TEST-INV-0003', '2026-01-01', '2026-01-31', 'APPROVED', 45000, 3600, 41400, tc_user, now()-interval '10 days', tc_user, now()-interval '5 days', gc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s2 ORDER BY sort_order LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Foundation Layout', 45000, 0, 45000, 45000, 8, 3600, 0);

  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by)
  VALUES (inv_id, p2, c2, s2, 'TEST-INV-0004', '2026-02-01', '2026-02-28', 'SUBMITTED', 112500, 9000, 103500, tc_user, now(), tc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s2 ORDER BY sort_order OFFSET 1 LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Floor Framing - All Bldgs', 112500, 0, 112500, 112500, 8, 9000, 0);

  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by, rejected_at, rejected_by, rejection_reason)
  VALUES (inv_id, p2, c2, s2, 'TEST-INV-0005', '2026-02-01', '2026-02-28', 'REJECTED', 135000, 10800, 124200, tc_user, now()-interval '3 days', tc_user, now()-interval '1 day', gc_user, 'Billed exceeds work completed');
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s2 ORDER BY sort_order OFFSET 2 LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Wall Framing - All Bldgs', 135000, 0, 135000, 135000, 8, 10800, 0);

  -- P4: 2 invoices (c4, s4, ret 10%)
  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by, approved_at, approved_by)
  VALUES (inv_id, p4, c4, s4, 'TEST-INV-0006', '2026-01-01', '2026-01-31', 'APPROVED', 36000, 3600, 32400, tc_user, now()-interval '15 days', tc_user, now()-interval '10 days', gc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s4 ORDER BY sort_order LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Floor Framing - Units 1-6', 36000, 0, 36000, 36000, 10, 3600, 0);

  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by)
  VALUES (inv_id, p4, c4, s4, 'TEST-INV-0007', '2026-02-01', '2026-02-28', 'DRAFT', 24000, 2400, 21600, tc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s4 ORDER BY sort_order OFFSET 1 LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Wall Framing - Units 1-6 (50%)', 48000, 0, 24000, 24000, 10, 2400, 0);

  -- P6: 1 invoice (c6, s6, ret 10%)
  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by)
  VALUES (inv_id, p6, c6, s6, 'TEST-INV-0008', '2026-01-01', '2026-01-31', 'DRAFT', 25500, 2550, 22950, tc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s6 ORDER BY sort_order LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Floor Framing', 25500, 0, 25500, 25500, 10, 2550, 0);

  -- P7: 2 invoices (c7, s7, ret 5%)
  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by, approved_at, approved_by)
  VALUES (inv_id, p7, c7, s7, 'TEST-INV-0009', '2026-01-01', '2026-01-31', 'APPROVED', 13000, 650, 12350, tc_user, now()-interval '20 days', tc_user, now()-interval '15 days', gc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s7 ORDER BY sort_order LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Demo Existing', 13000, 0, 13000, 13000, 5, 650, 0);

  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by)
  VALUES (inv_id, p7, c7, s7, 'TEST-INV-0010', '2026-02-01', '2026-02-28', 'SUBMITTED', 26000, 1300, 24700, tc_user, now(), tc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s7 ORDER BY sort_order OFFSET 1 LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'New Wall Framing', 26000, 0, 26000, 26000, 5, 1300, 0);

  -- P9: 3 invoices (c9, s9, ret 5%)
  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by, approved_at, approved_by)
  VALUES (inv_id, p9, c9, s9, 'TEST-INV-0011', '2026-01-01', '2026-01-31', 'APPROVED', 87500, 4375, 83125, tc_user, now()-interval '25 days', tc_user, now()-interval '20 days', gc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s9 ORDER BY sort_order LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Foundation & Floor', 87500, 0, 87500, 87500, 5, 4375, 0);

  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by, submitted_at, submitted_by)
  VALUES (inv_id, p9, c9, s9, 'TEST-INV-0012', '2026-02-01', '2026-02-28', 'SUBMITTED', 87500, 4375, 83125, tc_user, now(), tc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s9 ORDER BY sort_order OFFSET 1 LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Walls - Main Level', 87500, 0, 87500, 87500, 5, 4375, 0);

  inv_id := gen_random_uuid();
  INSERT INTO invoices (id, project_id, contract_id, sov_id, invoice_number, billing_period_start, billing_period_end, status, subtotal, retainage_amount, total_amount, created_by)
  VALUES (inv_id, p9, c9, s9, 'TEST-INV-0013', '2026-03-01', '2026-03-31', 'DRAFT', 35000, 1750, 33250, tc_user);
  SELECT id INTO sov_item_id FROM project_sov_items WHERE sov_id = s9 ORDER BY sort_order OFFSET 2 LIMIT 1;
  INSERT INTO invoice_line_items (invoice_id, sov_item_id, description, scheduled_value, previous_billed, current_billed, total_billed, retainage_percent, retainage_amount, sort_order)
  VALUES (inv_id, sov_item_id, 'Walls - Upper Level (50%)', 70000, 0, 35000, 35000, 5, 1750, 0);

  -- ========== PURCHASE ORDERS ==========
  -- TC-responsible: P2, P4, P6
  FOR j IN 1..3 LOOP
    po_id := gen_random_uuid();
    INSERT INTO purchase_orders (id, organization_id, project_id, supplier_id, po_number, po_name, status, created_by_org_id, pricing_owner_org_id, submitted_at, submitted_by, priced_at, priced_by, ordered_at)
    VALUES (po_id, tc_org_id, p2, supplier_id, 'TEST-PO-' || LPAD(po_counter::text, 4, '0'),
      CASE j WHEN 1 THEN 'Lumber Pack - Beta' WHEN 2 THEN 'Hardware - Beta' ELSE 'Sheathing - Beta' END,
      CASE j WHEN 1 THEN 'SUBMITTED'::po_status WHEN 2 THEN 'PRICED'::po_status ELSE 'ORDERED'::po_status END,
      tc_org_id, tc_org_id,
      CASE WHEN j >= 1 THEN now()-interval '5 days' ELSE NULL END, CASE WHEN j >= 1 THEN tc_user ELSE NULL END,
      CASE WHEN j >= 2 THEN now()-interval '3 days' ELSE NULL END, CASE WHEN j >= 2 THEN supp_user ELSE NULL END,
      CASE WHEN j >= 3 THEN now()-interval '1 day' ELSE NULL END);
    INSERT INTO po_line_items (po_id, line_number, description, quantity, uom, unit_price, line_total) VALUES
      (po_id, 1, '2x6x8 Studs', 500, 'EA', CASE WHEN j >= 2 THEN 8.50 ELSE NULL END, CASE WHEN j >= 2 THEN 4250 ELSE NULL END),
      (po_id, 2, '2x10x16 Joists', 200, 'EA', CASE WHEN j >= 2 THEN 18.50 ELSE NULL END, CASE WHEN j >= 2 THEN 3700 ELSE NULL END);
    po_counter := po_counter + 1;
  END LOOP;

  FOR j IN 1..3 LOOP
    po_id := gen_random_uuid();
    INSERT INTO purchase_orders (id, organization_id, project_id, supplier_id, po_number, po_name, status, created_by_org_id, pricing_owner_org_id)
    VALUES (po_id, tc_org_id, p4, supplier_id, 'TEST-PO-' || LPAD(po_counter::text, 4, '0'),
      CASE j WHEN 1 THEN 'Lumber - Delta' WHEN 2 THEN 'Trusses - Delta' ELSE 'Fasteners - Delta' END,
      CASE j WHEN 1 THEN 'ACTIVE'::po_status WHEN 2 THEN 'SUBMITTED'::po_status ELSE 'DELIVERED'::po_status END,
      tc_org_id, tc_org_id);
    INSERT INTO po_line_items (po_id, line_number, description, quantity, uom, unit_price, line_total) VALUES
      (po_id, 1, '2x4x8 Studs', 300, 'EA', CASE WHEN j = 3 THEN 5.50 ELSE NULL END, CASE WHEN j = 3 THEN 1650 ELSE NULL END);
    po_counter := po_counter + 1;
  END LOOP;

  FOR j IN 1..3 LOOP
    po_id := gen_random_uuid();
    INSERT INTO purchase_orders (id, organization_id, project_id, supplier_id, po_number, po_name, status, created_by_org_id, pricing_owner_org_id, priced_at, priced_by, delivered_at)
    VALUES (po_id, tc_org_id, p6, supplier_id, 'TEST-PO-' || LPAD(po_counter::text, 4, '0'),
      CASE j WHEN 1 THEN 'Lumber - Zeta' WHEN 2 THEN 'Windows - Zeta' ELSE 'Roofing - Zeta' END,
      CASE j WHEN 1 THEN 'PRICED'::po_status WHEN 2 THEN 'ORDERED'::po_status ELSE 'DELIVERED'::po_status END,
      tc_org_id, tc_org_id, now()-interval '7 days', supp_user, CASE WHEN j = 3 THEN now() ELSE NULL END);
    INSERT INTO po_line_items (po_id, line_number, description, quantity, uom, unit_price, line_total) VALUES
      (po_id, 1, '2x6x12 Lumber', 80, 'EA', 12.50, 1000), (po_id, 2, 'Nails & Fasteners', 10, 'BOX', 45, 450);
    po_counter := po_counter + 1;
  END LOOP;

  -- GC-responsible: P1, P7, P9
  FOR j IN 1..2 LOOP
    po_id := gen_random_uuid();
    INSERT INTO purchase_orders (id, organization_id, project_id, supplier_id, po_number, po_name, status, created_by_org_id, pricing_owner_org_id)
    VALUES (po_id, gc_org_id, p1, supplier_id, 'TEST-PO-' || LPAD(po_counter::text, 4, '0'),
      CASE j WHEN 1 THEN 'Concrete - Alpha' ELSE 'Steel - Alpha' END,
      CASE j WHEN 1 THEN 'ACTIVE'::po_status ELSE 'SUBMITTED'::po_status END, gc_org_id, gc_org_id);
    INSERT INTO po_line_items (po_id, line_number, description, quantity, uom) VALUES (po_id, 1, CASE j WHEN 1 THEN 'Ready Mix Concrete' ELSE 'Rebar #4' END, CASE j WHEN 1 THEN 50 ELSE 200 END, CASE j WHEN 1 THEN 'CY' ELSE 'EA' END);
    po_counter := po_counter + 1;
  END LOOP;

  FOR j IN 1..2 LOOP
    po_id := gen_random_uuid();
    INSERT INTO purchase_orders (id, organization_id, project_id, supplier_id, po_number, po_name, status, created_by_org_id, pricing_owner_org_id, priced_at, priced_by)
    VALUES (po_id, gc_org_id, p7, supplier_id, 'TEST-PO-' || LPAD(po_counter::text, 4, '0'),
      CASE j WHEN 1 THEN 'Demo Materials - Eta' ELSE 'New Lumber - Eta' END,
      CASE j WHEN 1 THEN 'PRICED'::po_status ELSE 'ORDERED'::po_status END, gc_org_id, gc_org_id, now()-interval '5 days', supp_user);
    INSERT INTO po_line_items (po_id, line_number, description, quantity, uom, unit_price, line_total) VALUES
      (po_id, 1, CASE j WHEN 1 THEN 'Dumpster Rental' ELSE '2x6x10 Studs' END, CASE j WHEN 1 THEN 2 ELSE 150 END, 'EA', CASE j WHEN 1 THEN 450 ELSE 9.50 END, CASE j WHEN 1 THEN 900 ELSE 1425 END);
    po_counter := po_counter + 1;
  END LOOP;

  FOR j IN 1..2 LOOP
    po_id := gen_random_uuid();
    INSERT INTO purchase_orders (id, organization_id, project_id, supplier_id, po_number, po_name, status, created_by_org_id, pricing_owner_org_id)
    VALUES (po_id, gc_org_id, p9, supplier_id, 'TEST-PO-' || LPAD(po_counter::text, 4, '0'),
      CASE j WHEN 1 THEN 'Custom Trusses - Iota' ELSE 'Specialty Lumber - Iota' END,
      CASE j WHEN 1 THEN 'SUBMITTED'::po_status ELSE 'ACTIVE'::po_status END, gc_org_id, gc_org_id);
    INSERT INTO po_line_items (po_id, line_number, description, quantity, uom) VALUES
      (po_id, 1, CASE j WHEN 1 THEN 'Custom Scissor Trusses' ELSE 'LVL Beams' END, CASE j WHEN 1 THEN 12 ELSE 8 END, 'EA');
    po_counter := po_counter + 1;
  END LOOP;

  -- ========== RFIs (30 total) ==========
  FOR i IN 0..9 LOOP
    proj_id := proj_ids[i+1];
    -- RFI 1: OPEN
    INSERT INTO project_rfis (project_id, rfi_number, subject, question, status, priority, submitted_by_org_id, submitted_by_user_id, assigned_to_org_id, due_date) VALUES
      (proj_id, i*3+1, 'Beam Size Clarification', 'Plans show LVL at grid 4 but detail shows steel. Clarify.', 'OPEN',
       CASE WHEN i%4=0 THEN 'HIGH' WHEN i%4=1 THEN 'URGENT' WHEN i%4=2 THEN 'MEDIUM' ELSE 'LOW' END,
       tc_org_id, tc_user, gc_org_id, CURRENT_DATE + 7);
    -- RFI 2: ANSWERED
    INSERT INTO project_rfis (project_id, rfi_number, subject, question, answer, status, priority, submitted_by_org_id, submitted_by_user_id, assigned_to_org_id, answered_by_user_id, answered_at) VALUES
      (proj_id, i*3+2, 'Shear Wall Nailing', 'What nailing schedule for shear walls?', '8d nails at 4" o.c. edges, 12" o.c. field per S-3.', 'ANSWERED',
       'MEDIUM', gc_org_id, gc_user, tc_org_id, tc_user, now()-interval '3 days');
    -- RFI 3: CLOSED or OPEN
    IF i%3=0 THEN
      INSERT INTO project_rfis (project_id, rfi_number, subject, question, answer, status, priority, submitted_by_org_id, submitted_by_user_id, assigned_to_org_id, answered_by_user_id, answered_at) VALUES
        (proj_id, i*3+3, 'Floor Joist Spacing', 'Can we use 19.2" spacing?', 'No - 16" o.c. required per calcs.', 'CLOSED',
         'HIGH', tc_org_id, tc_user, gc_org_id, gc_user, now()-interval '10 days');
    ELSE
      INSERT INTO project_rfis (project_id, rfi_number, subject, question, status, priority, submitted_by_org_id, submitted_by_user_id, assigned_to_org_id, due_date) VALUES
        (proj_id, i*3+3, 'Window Header Size', 'Plans show 4x12 header for 3ft opening. Confirm.', 'OPEN',
         'LOW', tc_org_id, tc_user, gc_org_id, CURRENT_DATE + 14);
    END IF;
  END LOOP;

END $$;
