import { describe, expect, it } from 'vitest';
import { resolveZoneFromLocationTag } from '@/lib/resolveZone';

describe('resolveZoneFromLocationTag', () => {
  it('returns null for empty input', () => {
    expect(resolveZoneFromLocationTag(null)).toBeNull();
    expect(resolveZoneFromLocationTag('')).toBeNull();
  });

  it('resolves structural members regardless of where they sit', () => {
    expect(resolveZoneFromLocationTag('Interior · L2 · Master Bath · Floor joists')).toBe('structural');
    expect(resolveZoneFromLocationTag('Interior · L1 · Kitchen · LVL header')).toBe('structural');
  });

  it('resolves exterior wall by default for Exterior tags', () => {
    expect(resolveZoneFromLocationTag('Exterior · North elevation')).toBe('exterior_wall');
    expect(resolveZoneFromLocationTag('Exterior · Side wall')).toBe('exterior_wall');
  });

  it('resolves exterior + roof keywords to roof', () => {
    expect(resolveZoneFromLocationTag('Exterior · Roof · Valley')).toBe('roof');
    expect(resolveZoneFromLocationTag('Exterior · Eave detail')).toBe('roof');
  });

  it('exterior + roof beats structural keywords (regression)', () => {
    // Before fix: "truss" matched structural first and discarded roof context.
    expect(resolveZoneFromLocationTag('Exterior · Roof system · Roof trusses · East elevation')).toBe('roof');
    expect(resolveZoneFromLocationTag('Exterior · Roof · Rafter')).toBe('roof');
  });

  it('resolves exterior + deck keywords to deck', () => {
    expect(resolveZoneFromLocationTag('Exterior · Rear deck')).toBe('deck');
    expect(resolveZoneFromLocationTag('Exterior · Pergola')).toBe('deck');
  });

  it('resolves exterior openings to envelope_opening', () => {
    expect(resolveZoneFromLocationTag('Exterior · Window opening · North')).toBe('envelope_opening');
    expect(resolveZoneFromLocationTag('Exterior · Skylight')).toBe('envelope_opening');
  });

  it('resolves attic and basement', () => {
    expect(resolveZoneFromLocationTag('Interior · Attic · Insulation')).toBe('roof');
    expect(resolveZoneFromLocationTag('Interior · Basement · West wall')).toBe('basement');
    expect(resolveZoneFromLocationTag('Interior · Crawl space')).toBe('basement');
  });

  it('resolves stairs', () => {
    expect(resolveZoneFromLocationTag('Interior · L1 · Stair landing')).toBe('stairs');
    expect(resolveZoneFromLocationTag('Interior · Stairwell · Handrail')).toBe('stairs');
  });

  it('resolves interior floors and ceilings', () => {
    expect(resolveZoneFromLocationTag('Interior · L1 · Living · Floor')).toBe('interior_floor');
    expect(resolveZoneFromLocationTag('Interior · L1 · Living · Ceiling')).toBe('interior_ceiling');
  });

  it('resolves component-first interior tags (new picker order)', () => {
    // Component appears before area in the new VisualLocationPicker output
    expect(resolveZoneFromLocationTag('Interior · L1 · Floor / Floor joists')).toBe('structural');
    expect(resolveZoneFromLocationTag('Interior · L1 · Floor / Floor sheathing')).toBe('interior_floor');
    expect(resolveZoneFromLocationTag('Interior · L2 · Wall / Demising wall')).toBe('interior_wall');
    expect(resolveZoneFromLocationTag('Interior · L1 · Ceiling / Ceiling drywall · Kitchen')).toBe('interior_ceiling');
  });

  it('falls back to interior_wall', () => {
    expect(resolveZoneFromLocationTag('Interior · L1 · Living')).toBe('interior_wall');
    expect(resolveZoneFromLocationTag('Interior · Hallway')).toBe('interior_wall');
  });
});
