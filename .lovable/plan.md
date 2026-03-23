

# Reorganize Scope Sections Using Real-World Construction Logic

## Database Migration — Move items between sections, rename sections, rename items

### 1. Rename "Floor Systems" → "Exterior Framing"
- Update section label and slug
- Rename items: "1st floor framing" → "1st floor walls", "2nd floor framing" → "2nd floor walls", etc.

### 2. Move "Exterior sheathing" from "Sheathing & WRB" → "Exterior Framing"
- Item `2e2f78a1` ("Exterior sheathing") moves to section `db75d502` (Exterior Framing)
- Also move "Integral insulation sheathing" (`17e2f447`) since it's wall sheathing

### 3. Rename "Sheathing & WRB" → "WRB"
- Remaining items: House wrap/WRB, opening treatments, drip caps, sill pans, base of wall transitions, patio transitions, penetration sealing — all WRB work
- Update section label and slug

### 4. Move "Fascia and sub-fascia" from Roof → "Siding & Exterior Trim"
- Item `725f521e` moves to section `7f18ff2d`

### 5. Move backout items to "Hardware & Backout"
- "Shim and shave exterior walls" (`9ee823fa`) from Siding → Backout
- "Shim bottom plates" (`5f9ec2da`) from Siding → Backout  
- "Stud replacement after MEP punch" (`779ef220`) from Siding → Backout (note: similar item already exists in Backout as "Stud replacement after MEP pulls" — may merge)
- "TV mounts" (`018c426c`) from Interior Framing → Backout

### 6. Rename "Hardware & Backout" → "Backout"
- Clean up the label

## SQL Migration Summary

```sql
-- 1. Rename Floor Systems → Exterior Framing
UPDATE scope_sections SET label = 'Exterior Framing', slug = 'exterior_framing' WHERE id = 'db75d502-754a-457e-83b7-5ef17403a194';

-- Rename framing items to "walls"
UPDATE scope_items SET label = '1st floor walls' WHERE id = 'f8e3e622-2892-497b-b754-2ceb65c231cf';
UPDATE scope_items SET label = '2nd floor walls' WHERE id = '071a7b39-636c-4368-93c2-bdd28e0b7e64';
UPDATE scope_items SET label = '3rd floor walls' WHERE id = '6cc1b6f2-91d2-4dff-8b29-b7d0f6a3dd09';
UPDATE scope_items SET label = '4th floor walls' WHERE id = '78351c15-6c76-48de-a27f-3ca0117f6737';

-- 2. Move exterior sheathing items to Exterior Framing
UPDATE scope_items SET section_id = 'db75d502-754a-457e-83b7-5ef17403a194', display_order = 12 WHERE id = '2e2f78a1-c84e-4c2d-92e9-3434360ca791';
UPDATE scope_items SET section_id = 'db75d502-754a-457e-83b7-5ef17403a194', display_order = 13 WHERE id = '17e2f447-58c2-48b7-ac42-cf85dd03a83d';

-- 3. Rename Sheathing & WRB → WRB
UPDATE scope_sections SET label = 'WRB', slug = 'wrb' WHERE id = '77de21ed-d4f3-4dc4-83a3-72f84184e7e3';

-- 4. Move fascia/sub-fascia from Roof → Siding & Exterior Trim
UPDATE scope_items SET section_id = '7f18ff2d-4471-472a-b94b-c81e3dc7409a', display_order = 13 WHERE id = '725f521e-8952-4e57-9df4-57d57997079f';

-- 5. Move backout items to Hardware & Backout section
UPDATE scope_items SET section_id = (SELECT id FROM scope_sections WHERE slug = 'hardware_backout'), display_order = 7 WHERE id = '9ee823fa-fed1-4ea9-98bc-b52177c6ce91'; -- shim and shave
UPDATE scope_items SET section_id = (SELECT id FROM scope_sections WHERE slug = 'hardware_backout'), display_order = 8 WHERE id = '5f9ec2da-95ac-452f-b101-9510d8cba403'; -- shim bottom plates
UPDATE scope_items SET section_id = (SELECT id FROM scope_sections WHERE slug = 'hardware_backout'), display_order = 9 WHERE id = '779ef220-4df1-4722-ae03-321562a0a9d4'; -- stud replacement (dupe — merge with existing)
UPDATE scope_items SET section_id = (SELECT id FROM scope_sections WHERE slug = 'hardware_backout'), display_order = 10 WHERE id = '018c426c-6ab7-4ef4-bda7-18e4d4e3af02'; -- TV mounts → blocking

-- 6. Rename Hardware & Backout → Backout
UPDATE scope_sections SET label = 'Backout', slug = 'backout' WHERE slug = 'hardware_backout';
```

### Code changes

| File | Change |
|------|--------|
| `src/types/projectProfile.ts` | Update any slug references from `floor_systems` → `exterior_framing`, `sheathing_wrb` → `wrb`, `hardware_backout` → `backout` |
| `src/pages/ProjectScopeWizard.tsx` | No changes needed — sections are loaded dynamically from DB |
| `src/components/project/ProjectScopeSection.tsx` | No changes needed — reads from DB |

