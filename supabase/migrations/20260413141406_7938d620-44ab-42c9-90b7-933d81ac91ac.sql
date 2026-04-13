
-- Fix Bug 3: FC-created COs have wrong org_id (should be FC_Test, not TC_Test)
-- Fix Bug 4: Duplicate CO numbers (both are CO-002)

-- CO 532da6cd: FC-created, approved, currently org_id = TC_Test
UPDATE public.change_orders
SET org_id = '6e563ffc-32f1-4f52-a8f9-95e274cad56f',
    assigned_to_org_id = 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6',
    co_number = 'CO-MAI-FC-TC-0001'
WHERE id = '532da6cd-25e3-46e7-8706-edfb65c261c4';

-- CO d50f80af: FC-created, approved, currently org_id = TC_Test
UPDATE public.change_orders
SET org_id = '6e563ffc-32f1-4f52-a8f9-95e274cad56f',
    assigned_to_org_id = 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6',
    co_number = 'CO-MAI-FC-TC-0002'
WHERE id = 'd50f80af-fbf3-4d10-be07-ff6988727fe9';
