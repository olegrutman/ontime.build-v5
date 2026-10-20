import { describe,it,expect } from 'vitest';
import { crewPay, spendingTotals,csvCell } from '@/lib/crewTracker';
describe('Crew Tracker pay and spending',()=>{
  it('pays hourly employees hours times hourly wage',()=>expect(crewPay(25,8)).toBe(200));
  it('pays a full day at the daily rate',()=>expect(crewPay(180,1)).toBe(180));
  it('pays a half day at half the daily rate',()=>expect(crewPay(180,0.5)).toBe(90));
  it('keeps cents in wage calculations',()=>expect(crewPay(22.35,7.5)).toBe(167.63));
  it('rejects negative and nonfinite pay',()=>{expect(crewPay(-10,8)).toBe(0);expect(crewPay(25,NaN)).toBe(0);});
  it('counts labor and nails once each',()=>expect(spendingTotals([{total_amount:200,tracker_category:'labor'},{total_amount:186,tracker_category:'Nails & fasteners'}])).toEqual({labor:200,expenses:186,total:386}));
  it('protects spreadsheet exports from formulas',()=>expect(csvCell('=1+1')).toBe('"\'=1+1"'));
});