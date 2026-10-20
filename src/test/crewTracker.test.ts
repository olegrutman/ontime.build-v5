import { describe,it,expect } from 'vitest';
import { crewPay, spendingTotals,csvCell, crewBudgetComparison, EMPTY_CREW_BUDGET, withCrewSpending } from '@/lib/crewTracker';
import { buildProjectLedger } from '@/lib/kpiLedger';
describe('Crew Tracker pay and spending',()=>{
  it('pays hourly employees hours times hourly wage',()=>expect(crewPay(25,8)).toBe(200));
  it('pays a full day at the daily rate',()=>expect(crewPay(180,1)).toBe(180));
  it('pays a half day at half the daily rate',()=>expect(crewPay(180,0.5)).toBe(90));
  it('keeps cents in wage calculations',()=>expect(crewPay(22.35,7.5)).toBe(167.63));
  it('rejects negative and nonfinite pay',()=>{expect(crewPay(-10,8)).toBe(0);expect(crewPay(25,NaN)).toBe(0);});
  it('counts labor and nails once each',()=>expect(spendingTotals([{total_amount:200,tracker_category:'labor'},{total_amount:186,tracker_category:'Nails & fasteners'}])).toEqual({labor:200,expenses:186,total:386}));
  it('protects spreadsheet exports from formulas',()=>expect(csvCell('=1+1')).toBe('"\'=1+1"'));
  it('includes labor, materials and tools in the total budget',()=>{
    expect(crewBudgetComparison([], {labor:1000,materials:200,tools_equipment:150,other:50}).totalBudget).toBe(1400);
  });
  it('maps employee pay, nails, materials and equipment to their budget groups',()=>{
    const result=crewBudgetComparison([{total_amount:200,tracker_category:'labor'},{total_amount:186,tracker_category:'Nails & fasteners'},{total_amount:14,tracker_category:'Materials'},{total_amount:40,tracker_category:'Tools & blades'},{total_amount:60,tracker_category:'Equipment rental'},{total_amount:25,tracker_category:'Fuel'}],EMPTY_CREW_BUDGET);
    expect(result.actual).toEqual({labor:200,materials:200,tools_equipment:100,other:25});
    expect(result.totalActual).toBe(525);
  });
  it('tracks overspending without adding budget to actual costs',()=>{
    const result=crewBudgetComparison([{total_amount:200,tracker_category:'labor'}],{...EMPTY_CREW_BUDGET,labor:180});
    expect(result.remaining).toBe(-20);
    expect(result.forecast).toBe(200);
    expect(result.totalActual).toBe(200);
  });
  it('includes spending once in overview cost and uses budget only for forecast',()=>{
    const ledger=buildProjectLedger({role:'Crew',myOrgIds:['crew'],contracts:[],approvedCORevenue:1000,approvedCOCost:0,pendingCORevenue:0,pendingCOCost:0,materialCommitment:0,materialsAreMine:false,billed:800,collected:0,retainageHeld:0,receivablesPendingAmount:0,receivablesPendingCount:0,payablesApproved:0,payablesPaid:0,payablesPendingAmount:0,payablesPendingCount:0,actualCostToDate:0});
    const result=withCrewSpending(ledger,386,600);
    expect(result.revisedCost.value).toBe(600);
    expect(result.earnedCost.value).toBe(386);
    expect(result.marginToDate.value).toBe(414);
    expect(result.forecastMargin.value).toBe(400);
  });
});