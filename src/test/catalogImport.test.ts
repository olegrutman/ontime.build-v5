import { describe, it, expect } from 'vitest';
import { parseCatalogImport } from '@/lib/catalogImport';

describe('catalog import', () => {
  it('reads BOM files with alternate headers and escaped quotes', () => {
    const csv = '\uFEFFsku,original_category,original_description,supplier_confirmed_price,price_confidence\r\n' +
      'OTB-1,DECKING,"1/2X11""X12\' DECK",,MEDIUM\r\n';
    const { rows, missingColumns } = parseCatalogImport(csv);
    expect(missingColumns).toEqual([]);
    expect(rows[0].supplier_sku).toBe('OTB-1');
    expect(rows[0].description).toBe('1/2X11"X12\' DECK');
    expect(rows[0].category).toBe('Decking');
    expect(rows[0].list_price).toBeNull();
    expect(rows[0].review.price_confidence).toBe('MEDIUM');
  });

  it('imports numeric prices per price unit', () => {
    const { rows } = parseCatalogImport('sku,description,uom,list_price,price_uom\nA,Stud,each,$4.85,CS\n');
    expect(rows[0].list_price).toBe(4.85);
    expect(rows[0].uom_default).toBe('EA');
    expect(rows[0].price_uom).toBe('CS');
  });

  it('flags non-numeric prices instead of saving them', () => {
    const { rows } = parseCatalogImport('sku,description,list_price\nA,Stud,call\n');
    expect(rows[0].list_price).toBeNull();
    expect(rows[0].invalid_price).toBe('call');
  });
});
