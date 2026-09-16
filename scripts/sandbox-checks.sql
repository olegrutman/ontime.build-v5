-- =====================================================================
-- Sandbox money-path checks
-- =====================================================================
-- Run this whole file as one read-only query. Every row is one invariant.
-- Anything that is not PASS means a regression was introduced.
--
-- Sandbox project : [SANDBOX] Willow Creek Estates — do not delete
--   project_id      3ce62f86-ec48-48f5-9be1-55f463b98b8e
--   GC_Test         96a802b8-72a4-42e5-aa00-b7c675a9bb62   gc@test.com
--   TC_Test (sub)   ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6   tc@test.com
--   FC_Test (crew)  6e563ffc-32f1-4f52-a8f9-95e274cad56f   fc@test.com
--   Supplier_Test   12b5d7de-1bd1-431d-9601-93ba3d56870b   supp@test.com
--
-- Money-path fixture: WO-SBX-0001 "Rebuild rear deck framing"
--   crew logs      10 h @ $40  -> crew bills the sub          $400
--   sub prices     10 h @ $75  -> sub bills the GC            $750
--   sub internal cost (private, crew time)                    $400
--   sub margin                                                $350
-- =====================================================================

WITH p AS (
  SELECT '3ce62f86-ec48-48f5-9be1-55f463b98b8e'::uuid AS project_id,
         '96a802b8-72a4-42e5-aa00-b7c675a9bb62'::uuid AS gc,
         'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6'::uuid AS sub,
         '6e563ffc-32f1-4f52-a8f9-95e274cad56f'::uuid AS crew,
         '12b5d7de-1bd1-431d-9601-93ba3d56870b'::uuid AS supplier
), wo AS (
  SELECT co.* FROM change_orders co, p
  WHERE co.project_id = p.project_id AND co.co_number = 'WO-SBX-0001'
), checks AS (

  -- 1. the sandbox project still exists and still holds all four company types
  SELECT 1 AS n, 'sandbox project present' AS check_name, '1' AS expected,
         count(*)::text AS actual
  FROM projects pr, p WHERE pr.id = p.project_id
    AND pr.name LIKE '[SANDBOX]%'

  UNION ALL
  SELECT 2, 'four company types on the project', 'GC,TC,FC,SUPPLIER',
         string_agg(DISTINCT o.type::text, ',' ORDER BY o.type::text)
  FROM project_participants pp
  JOIN organizations o ON o.id = pp.organization_id, p
  WHERE pp.project_id = p.project_id AND pp.invite_status = 'ACCEPTED'

  UNION ALL
  SELECT 3, 'contract chain accepted (crew->sub, sub->GC, supplier->GC)', '3',
         count(*)::text
  FROM project_contracts c, p
  WHERE c.project_id = p.project_id AND c.status = 'Accepted'
    AND (c.from_org_id, c.to_org_id) IN
        ((p.crew, p.sub), (p.sub, p.gc), (p.supplier, p.gc))

  -- 4-6. crew / sub amounts on the money-path work order
  UNION ALL
  SELECT 4, 'crew billable on WO-SBX-0001 excludes internal cost', '400.00',
         to_char(coalesce(sum(le.line_total), 0), 'FM999999990.00')
  FROM co_labor_entries le, wo, p
  WHERE le.co_id = wo.id AND le.org_id = p.crew
    AND coalesce(le.is_actual_cost, false) = false

  UNION ALL
  SELECT 5, 'sub billable upstream on WO-SBX-0001', '750.00',
         to_char(coalesce(sum(le.line_total), 0), 'FM999999990.00')
  FROM co_labor_entries le, wo, p
  WHERE le.co_id = wo.id AND le.org_id = p.sub
    AND coalesce(le.is_actual_cost, false) = false

  UNION ALL
  SELECT 6, 'sub private internal cost on WO-SBX-0001', '400.00',
         to_char(coalesce(sum(le.line_total), 0), 'FM999999990.00')
  FROM co_labor_entries le, wo, p
  WHERE le.co_id = wo.id AND le.org_id = p.sub
    AND coalesce(le.is_actual_cost, false) = true

  UNION ALL
  SELECT 7, 'frozen submitted price matches priced lines', '750.00',
         to_char(coalesce((SELECT tc_submitted_price FROM wo), -1), 'FM999999990.00')

  UNION ALL
  SELECT 8, 'crew-created work order keeps its origin', 'crew',
         CASE WHEN (SELECT originating_org_id FROM wo) = (SELECT crew FROM p)
              THEN 'crew' ELSE 'lost' END

  -- 9. contract roll-up matches the approved change orders behind it
  UNION ALL
  SELECT 9, 'contract approved-change-order totals match their change orders', '0 mismatch',
         count(*)::text || ' mismatch'
  FROM project_contracts c, p
  WHERE c.project_id = p.project_id
    AND round(coalesce(c.co_approved_sum, 0), 2) <> round(coalesce((
      SELECT sum(co.tc_submitted_price) FROM change_orders co
      WHERE co.project_id = c.project_id AND co.status = 'approved'
        AND co.org_id = c.from_org_id
    ), 0), 2)

  -- 10. schedule of values always totals exactly 100%
  UNION ALL
  SELECT 10, 'every schedule of values totals 100%', '0 off-total',
         count(*)::text || ' off-total'
  FROM project_sov s, p
  WHERE s.project_id = p.project_id
    AND round(coalesce((SELECT sum(i.percent_of_contract) FROM project_sov_items i
                        WHERE i.sov_id = s.id), 0), 2) NOT IN (0, 100.00)

  -- 11. nobody bills more than their contract plus approved change orders
  UNION ALL
  SELECT 11, 'no contract over-billed', '0 over-billed',
         count(*)::text || ' over-billed'
  FROM project_contracts c, p
  WHERE c.project_id = p.project_id
    AND coalesce((SELECT sum(i.total_amount) FROM invoices i
                  WHERE i.contract_id = c.id AND i.status <> 'DRAFT'), 0)
        > round(coalesce(c.contract_sum, 0) + coalesce(c.co_approved_sum, 0), 2) + 0.01

  -- 12. retainage stays configured on the crew contract
  UNION ALL
  SELECT 12, 'retainage set on the crew contract', '5.00',
         to_char(coalesce(max(c.retainage_percent), -1), 'FM999999990.00')
  FROM project_contracts c, p
  WHERE c.project_id = p.project_id AND c.from_org_id = p.crew AND c.to_org_id = p.sub

  -- 13. approved work orders never lose their origin company
  UNION ALL
  SELECT 13, 'approved change orders all keep an origin company', '0 missing',
         count(*)::text || ' missing'
  FROM change_orders co, p
  WHERE co.project_id = p.project_id AND co.status = 'approved'
    AND co.originating_org_id IS NULL

  -- 14. every non-draft invoice is attached to a contract
  UNION ALL
  SELECT 14, 'non-draft invoices attached to a contract', '0 orphan',
         count(*)::text || ' orphan'
  FROM invoices i, p
  WHERE i.project_id = p.project_id AND i.status <> 'DRAFT' AND i.contract_id IS NULL
)
SELECT n, check_name, expected, actual,
       CASE WHEN expected = actual THEN 'PASS' ELSE 'FAIL' END AS result
FROM checks
ORDER BY n;
