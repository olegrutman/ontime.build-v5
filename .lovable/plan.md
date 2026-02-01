
# Plan: Add Fascia, Soffit, and Decorative Elements to Scope Step

## Overview
Add missing Fascia & Soffit options and Exterior Decorative Elements sections to the Scope & Details step in the project setup wizard. The decorative elements section will include a text field to specify custom items.

---

## Current State

The `ScopeDetails` type in `src/types/projectWizard.ts` already includes these fields:
- `fasciaIncluded?: boolean`
- `soffitIncluded?: boolean`  
- `fasciaSoffitMaterial?: string`
- `fasciaSoffitMaterialOther?: string`
- `decorativeIncluded?: boolean`
- `decorativeItems?: string[]`
- `decorativeItemOther?: string`

However, the UI in `ScopeStep.tsx` does not render these options - they are missing from the form.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/project-wizard-new/ScopeStep.tsx` | Add Fascia & Soffit card and Decorative Elements card |

---

## UI Changes

### New Card: Fascia & Soffit
Location: After the Siding card, before Optional Scope Items

```
+----------------------------------------------------------+
|  Fascia & Soffit                                         |
+----------------------------------------------------------+
|  Fascia Included?                              [toggle]  |
|  Soffit Included?                              [toggle]  |
|                                                          |
|  (When either enabled):                                  |
|  Material: [Wood / Fiber Cement / Metal / Vinyl / Other] |
|  (If Other): [Specify other material____________]        |
+----------------------------------------------------------+
```

### New Card: Decorative Elements
Location: After Fascia & Soffit card

```
+----------------------------------------------------------+
|  Decorative Elements                                     |
+----------------------------------------------------------+
|  Decorative Elements Included?                 [toggle]  |
|                                                          |
|  (When enabled):                                         |
|  Select items (multi-select):                            |
|  [ ] Corbels                                             |
|  [ ] Columns                                             |
|  [ ] Decorative Beams                                    |
|  [ ] Brackets                                            |
|  [ ] Faux Trusses                                        |
|  [ ] Other                                               |
|                                                          |
|  (If Other selected):                                    |
|  [Specify other decorative items___________]             |
+----------------------------------------------------------+
```

---

## Implementation Details

### 1. Add Fascia & Soffit Card (after Siding card, ~line 466)

```tsx
{/* Fascia & Soffit */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Fascia & Soffit</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Fascia Included?</Label>
      <Switch
        checked={scope.fasciaIncluded || false}
        onCheckedChange={(checked) => update({ fasciaIncluded: checked })}
      />
    </div>
    <div className="flex items-center justify-between">
      <Label>Soffit Included?</Label>
      <Switch
        checked={scope.soffitIncluded || false}
        onCheckedChange={(checked) => update({ soffitIncluded: checked })}
      />
    </div>
    {(scope.fasciaIncluded || scope.soffitIncluded) && (
      <div className="space-y-2">
        <Label>Material</Label>
        <Select
          value={scope.fasciaSoffitMaterial || ''}
          onValueChange={(v) => update({ fasciaSoffitMaterial: v })}
        >
          <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
          <SelectContent>
            {FASCIA_SOFFIT_MATERIALS.map(material => (
              <SelectItem key={material} value={material}>{material}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {scope.fasciaSoffitMaterial === 'Other' && (
          <Input
            placeholder="Specify other material"
            value={scope.fasciaSoffitMaterialOther || ''}
            onChange={(e) => update({ fasciaSoffitMaterialOther: e.target.value })}
          />
        )}
      </div>
    )}
  </CardContent>
</Card>
```

### 2. Add Decorative Elements Card (after Fascia & Soffit)

```tsx
{/* Decorative Elements */}
<Card>
  <CardHeader className="pb-3">
    <CardTitle className="text-base">Decorative Elements</CardTitle>
  </CardHeader>
  <CardContent className="space-y-4">
    <div className="flex items-center justify-between">
      <Label>Decorative Elements Included?</Label>
      <Switch
        checked={scope.decorativeIncluded || false}
        onCheckedChange={(checked) => update({ decorativeIncluded: checked })}
      />
    </div>
    {scope.decorativeIncluded && (
      <div className="space-y-2">
        <Label>Select items (check all that apply)</Label>
        <div className="grid grid-cols-2 gap-2">
          {DECORATIVE_ITEMS.map(item => (
            <div key={item} className="flex items-center space-x-2">
              <Checkbox
                id={`decorative-${item}`}
                checked={(scope.decorativeItems || []).includes(item)}
                onCheckedChange={() => toggleArrayItem('decorativeItems', item)}
              />
              <label htmlFor={`decorative-${item}`} className="text-sm">{item}</label>
            </div>
          ))}
        </div>
        {(scope.decorativeItems || []).includes('Other') && (
          <Input
            placeholder="Specify other decorative items"
            value={scope.decorativeItemOther || ''}
            onChange={(e) => update({ decorativeItemOther: e.target.value })}
          />
        )}
      </div>
    )}
  </CardContent>
</Card>
```

---

## Summary of Changes

1. **Fascia & Soffit Card**
   - Toggle for Fascia Included
   - Toggle for Soffit Included
   - Material dropdown (shows when either is enabled)
   - Custom material text field (shows when "Other" is selected)

2. **Decorative Elements Card**
   - Toggle for Decorative Elements Included
   - Multi-select checkboxes for: Corbels, Columns, Decorative Beams, Brackets, Faux Trusses, Other
   - Custom specification text field (shows when "Other" is checked)

---

## Testing Checklist

1. Navigate to /create-project and proceed to Scope & Details step
2. Verify Fascia & Soffit card appears after Siding
3. Toggle Fascia on - verify material dropdown appears
4. Toggle Soffit on - material dropdown should still be visible
5. Select "Other" material - verify text input appears
6. Verify Decorative Elements card appears
7. Toggle Decorative Elements on - verify checkboxes appear
8. Check multiple items - verify they're saved correctly
9. Check "Other" - verify specification text field appears
10. Complete wizard to Review step - verify scope summary shows these new options
