import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROLE_LONG_NAMES } from '@/hooks/useRoleLabels';
import { ORG_TYPE_LABELS } from '@/types/organization';

/**
 * Guard rail: the two-letter internal codes (GC / TC / FC) must never appear as
 * user-visible text. Company names come from `useRoleLabels`; when there is no
 * project context the spelled-out generic names are used instead.
 */
const SRC = join(process.cwd(), 'src');

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) {
      if (entry === 'integrations' || entry === 'test') continue;
      walk(p, out);
    } else if (/\.(ts|tsx)$/.test(entry) && !/\.test\.tsx?$/.test(entry)) {
      out.push(p);
    }
  }
  return out;
}

/** JSX text nodes that are exactly a bare role code, e.g. <Badge>TC</Badge>. */
const BARE_JSX_TEXT = /(?<![-\w])>\s*(GC|TC|FC)\s*</g;
/** Visible label assignments, e.g. label: 'FC Pricing' or title: "GC Review". */
const BARE_LABEL = /\b(?:label|title|name|placeholder|subtitle|heading|desc|description)\s*:\s*(['"])(?:[^'"]*\b)?(GC|TC|FC)\b[^'"]*\1/g;

describe('role terminology', () => {
  it('uses spelled-out generic role names', () => {
    expect(ROLE_LONG_NAMES).toEqual({
      GC: 'General Contractor',
      TC: 'Subcontractor',
      FC: 'Crew',
    });
    expect(ORG_TYPE_LABELS.TC).toBe('Subcontractor');
    expect(ORG_TYPE_LABELS.FC).toBe('Crew');
  });

  it('never renders a bare GC/TC/FC code as visible text', () => {
    const offenders: string[] = [];
    for (const file of walk(SRC)) {
      const source = readFileSync(file, 'utf8');
      for (const re of [BARE_JSX_TEXT, BARE_LABEL]) {
        re.lastIndex = 0;
        let m: RegExpExecArray | null;
        while ((m = re.exec(source))) {
          offenders.push(`${file.replace(SRC, 'src')}: ${m[0].trim()}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
