

# Add Equipment Dropdown Menu with Predefined Equipment List

## Overview

Currently, when adding equipment to a work order, users must manually type in the equipment description. This plan adds a predefined list of common construction equipment with a dropdown selector, making it faster and more consistent to add equipment entries.

---

## Predefined Equipment List

Based on common construction equipment needs, we'll add these categories:

### Heavy Equipment / Machinery
- Forklift
- Scissor Lift
- Boom Lift / JLG
- Crane (Mobile)
- Crane (Tower)
- Excavator
- Skid Steer / Bobcat
- Backhoe

### Power Tools / Equipment
- Concrete Mixer
- Concrete Saw
- Generator
- Compressor
- Welder
- Pressure Washer

### Scaffolding & Access
- Scaffolding (per section)
- Ladder (Extension)
- Baker Scaffold

### Transportation
- Dump Truck
- Flatbed Trailer
- Delivery Truck

### Specialty Equipment
- Dumpster / Roll-off Container
- Portable Toilet
- Temporary Fencing
- Temporary Heating / HVAC
- Water Pump

---

## UI Changes

### File: `src/components/change-order-detail/EquipmentPanel.tsx`

**Current Flow:**
1. Click "Add Equipment"
2. Type description manually
3. Select pricing type (flat/daily)
4. Enter pricing
5. Submit

**New Flow:**
1. Click "Add Equipment"
2. **Select from dropdown** OR type custom description
3. Select pricing type (flat/daily)
4. Enter pricing
5. Submit

### Implementation Details

1. **Add equipment options constant** at the top of the file:
```typescript
const EQUIPMENT_OPTIONS = [
  { category: 'Heavy Equipment', items: [
    'Forklift',
    'Scissor Lift',
    'Boom Lift / JLG',
    'Crane (Mobile)',
    'Crane (Tower)',
    'Excavator',
    'Skid Steer / Bobcat',
    'Backhoe',
  ]},
  { category: 'Power Tools', items: [
    'Concrete Mixer',
    'Concrete Saw',
    'Generator',
    'Compressor',
    'Welder',
    'Pressure Washer',
  ]},
  { category: 'Scaffolding & Access', items: [
    'Scaffolding (per section)',
    'Ladder (Extension)',
    'Baker Scaffold',
  ]},
  { category: 'Transportation', items: [
    'Dump Truck',
    'Flatbed Trailer',
    'Delivery Truck',
  ]},
  { category: 'Specialty', items: [
    'Dumpster / Roll-off Container',
    'Portable Toilet',
    'Temporary Fencing',
    'Temporary Heating / HVAC',
    'Water Pump',
  ]},
];
```

2. **Replace the text input with a Select dropdown** that includes:
   - Grouped options by category using `SelectGroup` and `SelectLabel`
   - An "Other (Custom)" option at the end
   - When "Other" is selected, show a text input for custom description

3. **Add state for custom description mode:**
```typescript
const [useCustomDescription, setUseCustomDescription] = useState(false);
```

4. **Update the form section:**
```tsx
<div>
  <Label>Equipment Type *</Label>
  <Select
    value={useCustomDescription ? 'custom' : description}
    onValueChange={(value) => {
      if (value === 'custom') {
        setUseCustomDescription(true);
        setDescription('');
      } else {
        setUseCustomDescription(false);
        setDescription(value);
      }
    }}
  >
    <SelectTrigger className="bg-background">
      <SelectValue placeholder="Select equipment..." />
    </SelectTrigger>
    <SelectContent className="bg-popover z-50 max-h-80">
      {EQUIPMENT_OPTIONS.map((group) => (
        <SelectGroup key={group.category}>
          <SelectLabel>{group.category}</SelectLabel>
          {group.items.map((item) => (
            <SelectItem key={item} value={item}>
              {item}
            </SelectItem>
          ))}
        </SelectGroup>
      ))}
      <SelectSeparator />
      <SelectItem value="custom">Other (Custom)</SelectItem>
    </SelectContent>
  </Select>
</div>

{useCustomDescription && (
  <div>
    <Label htmlFor="equip-custom">Custom Description *</Label>
    <Input
      id="equip-custom"
      placeholder="Enter equipment description..."
      value={description}
      onChange={(e) => setDescription(e.target.value)}
    />
  </div>
)}
```

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/change-order-detail/EquipmentPanel.tsx` | Add equipment options constant, import Select components, replace text input with dropdown, add custom description fallback |

---

## Technical Notes

1. **Select Component Styling**: The `SelectContent` must have `bg-popover` and `z-50` classes to ensure proper background and layering per project guidelines.

2. **Form Reset**: When canceling or submitting, reset both `description` and `useCustomDescription` states.

3. **Validation**: The submit button should remain disabled if:
   - No equipment selected (or empty custom description)
   - Pricing not properly filled out

---

## Visual Result

```
┌─────────────────────────────────────────────────────┐
│ Add Equipment                                       │
├─────────────────────────────────────────────────────┤
│ Equipment Type *                                    │
│ ┌─────────────────────────────────────────────────┐ │
│ │ ▾ Select equipment...                           │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ ┌─ Dropdown Open ─────────────────────────────────┐ │
│ │ HEAVY EQUIPMENT                                 │ │
│ │   Forklift                                      │ │
│ │   Scissor Lift                                  │ │
│ │   Boom Lift / JLG                               │ │
│ │   Crane (Mobile)                                │ │
│ │   ...                                           │ │
│ │ POWER TOOLS                                     │ │
│ │   Concrete Mixer                                │ │
│ │   Generator                                     │ │
│ │   ...                                           │ │
│ │ ─────────────────────────────────────────────── │ │
│ │   Other (Custom)                                │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│ Pricing Type                                        │
│   (○) Flat Rate    (●) Daily Rate                   │
│                                                     │
│ Daily Rate *          Days *                        │
│ ┌───────────────┐     ┌───────────────┐             │
│ │ 150.00        │     │ 3             │             │
│ └───────────────┘     └───────────────┘             │
│                                                     │
│ Notes                                               │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Optional notes...                               │ │
│ └─────────────────────────────────────────────────┘ │
│                                                     │
│              [Cancel]    [Add Equipment]            │
└─────────────────────────────────────────────────────┘
```

---

## Benefits

1. **Faster Entry**: Users can quickly select from common equipment types
2. **Consistency**: Standardized equipment names across all work orders
3. **Flexibility**: Custom option still available for unique equipment needs
4. **Organized**: Equipment grouped by category for easy browsing

