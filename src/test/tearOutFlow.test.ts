import { describe, it, expect } from 'vitest';
import { getIntentFlow, resolveComponent } from '@/lib/intentFlows';
import type { FlowContext } from '@/types/scopeQA';

function ctxFor(zone: FlowContext['zone'], locationTag = ''): FlowContext {
  return {
    buildingType: 'apartments_mf',
    framingMethod: null,
    constructionType: null,
    stories: null,
    hasSharedWalls: false,
    locationTag,
    zone,
    reason: 'demolition',
    workType: 'demolition',
    projectName: 'Test',
  };
}

describe('TEAR_OUT_FLOW zone awareness', () => {
  const flow = getIntentFlow('tear_out', 'apartments_mf');
  const firstQ = flow.questions[0];

  it('shows roof components on roof zone, not interior cabinets', () => {
    const ctx = ctxFor('roof', 'Exterior · Roof system · Roof');
    const answers = firstQ.answersFor!(ctx);
    const ids = answers.map((a) => a.id);
    expect(ids).toContain('roof_sheath');
    expect(ids).toContain('rafter_truss');
    expect(ids).not.toContain('cabinet');
    expect(ids).not.toContain('flooring');
    const text = firstQ.textFor!(ctx);
    expect(text).toMatch(/roof component/i);
  });

  it('shows exterior wall components (siding/WRB) on exterior_wall zone', () => {
    const ctx = ctxFor('exterior_wall', 'Exterior · North elevation · Wall sheathing');
    const ids = firstQ.answersFor!(ctx).map((a) => a.id);
    expect(ids).toContain('siding');
    expect(ids).toContain('wrb');
    expect(ids).toContain('wall_sheath');
    expect(ids).not.toContain('cabinet');
  });

  it('keeps the legacy interior list for interior zones', () => {
    const ctx = ctxFor('interior_wall', 'Interior · L1 · Kitchen');
    const ids = firstQ.answersFor!(ctx).map((a) => a.id);
    expect(ids).toContain('cabinet');
    expect(ids).toContain('flooring');
    expect(ids).toContain('wall_partition');
  });

  it('shows site list for foundation/basement zones', () => {
    const ctx = ctxFor('foundation', 'Exterior · Foundation · Footing');
    const ids = firstQ.answersFor!(ctx).map((a) => a.id);
    expect(ids).toContain('slab');
    expect(ids).toContain('footing');
    expect(ids).not.toContain('cabinet');
  });

  it('summarize uses zone-appropriate label', () => {
    const ctx = ctxFor('roof', 'Exterior · Roof system · Roof');
    const sentence = flow.summarize(ctx, {
      what: 'roof_sheath',
      extent: 'medium',
      disposal: 'gc_dump',
      protection: 'none',
    });
    expect(sentence).toMatch(/roof sheathing/i);
    expect(sentence).not.toMatch(/cabinet/i);
  });
});

describe('resolveComponent — tear_out intent biasing', () => {
  it('routes Roof sheathing to tear_out flow when intent is tear_out', () => {
    const r = resolveComponent('Exterior · Roof system · Roof sheathing', 'tear_out');
    expect(r).not.toBeNull();
    expect(r!.expectedIntent).toBe('tear_out');
    expect(r!.flowQuestionId).toBe('what');
    expect(r!.answerId).toBe('roof_sheath');
  });

  it('still routes Roof sheathing to envelope_work by default', () => {
    const r = resolveComponent('Exterior · Roof system · Roof sheathing');
    expect(r).not.toBeNull();
    expect(r!.expectedIntent).toBe('envelope_work');
    expect(r!.flowQuestionId).toBe('layer');
    expect(r!.answerId).toBe('roof_sheath');
  });

  it('routes WRB to tear_out wrb when intent is tear_out', () => {
    const r = resolveComponent('Exterior · North elevation · WRB', 'tear_out');
    expect(r!.expectedIntent).toBe('tear_out');
    expect(r!.answerId).toBe('wrb');
  });
});
