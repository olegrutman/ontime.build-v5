import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { type DemoRole, type DemoWorkOrder, type DemoInvoice, type DemoPurchaseOrder, type DemoRFI, type DemoSOVItem, type DemoAttentionItem, type DemoContract, type DemoPOLineItem, type DemoInvoiceLineItem, type DemoWorkOrderDetail, DEMO_WORK_ORDERS, DEMO_PURCHASE_ORDERS, DEMO_INVOICES, DEMO_RFIS, DEMO_SOV_ITEMS, DEMO_ATTENTION_ITEMS, DEMO_CONTRACTS, DEMO_PO_LINE_ITEMS, DEMO_INVOICE_LINE_ITEMS, DEMO_WORK_ORDER_DETAILS } from '@/data/demoData';

// ── Mutable demo data store ──
export interface DemoDataStore {
  workOrders: DemoWorkOrder[];
  purchaseOrders: DemoPurchaseOrder[];
  invoices: DemoInvoice[];
  rfis: DemoRFI[];
  sovItems: DemoSOVItem[];
  attentionItems: DemoAttentionItem[];
  contracts: DemoContract[];
  poLineItems: DemoPOLineItem[];
  invoiceLineItems: DemoInvoiceLineItem[];
  workOrderDetails: DemoWorkOrderDetail[];
}

function createInitialStore(): DemoDataStore {
  return {
    workOrders: structuredClone(DEMO_WORK_ORDERS),
    purchaseOrders: structuredClone(DEMO_PURCHASE_ORDERS),
    invoices: structuredClone(DEMO_INVOICES),
    rfis: structuredClone(DEMO_RFIS),
    sovItems: structuredClone(DEMO_SOV_ITEMS),
    attentionItems: structuredClone(DEMO_ATTENTION_ITEMS),
    contracts: structuredClone(DEMO_CONTRACTS),
    poLineItems: structuredClone(DEMO_PO_LINE_ITEMS),
    invoiceLineItems: structuredClone(DEMO_INVOICE_LINE_ITEMS),
    workOrderDetails: structuredClone(DEMO_WORK_ORDER_DETAILS),
  };
}

interface DemoState {
  isDemoMode: boolean;
  demoRole: DemoRole | null;
  demoProjectId: string | null;
}

interface DemoContextValue extends DemoState {
  store: DemoDataStore;
  enterDemo: (role: DemoRole, projectId: string) => void;
  exitDemo: () => void;
  resetStore: () => void;
  // ── Actions ──
  addWorkOrder: (wo: DemoWorkOrder, detail?: DemoWorkOrderDetail) => void;
  updateWorkOrderStatus: (id: string, status: string, pricing?: { final_price: number; labor_total: number; material_total: number }) => void;
  updateInvoiceStatus: (id: string, status: string) => void;
  addInvoice: (inv: DemoInvoice, lineItems?: DemoInvoiceLineItem[]) => void;
  updatePOStatus: (id: string, status: string) => void;
  addRFI: (rfi: DemoRFI) => void;
  updateRFIStatus: (id: string, status: 'open' | 'answered' | 'closed') => void;
}

const DemoContext = createContext<DemoContextValue | undefined>(undefined);

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>({
    isDemoMode: false,
    demoRole: null,
    demoProjectId: null,
  });
  const [store, setStore] = useState<DemoDataStore>(createInitialStore);

  const enterDemo = useCallback((role: DemoRole, projectId: string) => {
    setState({ isDemoMode: true, demoRole: role, demoProjectId: projectId });
    setStore(createInitialStore());
  }, []);

  const exitDemo = useCallback(() => {
    setState({ isDemoMode: false, demoRole: null, demoProjectId: null });
  }, []);

  const resetStore = useCallback(() => {
    setStore(createInitialStore());
  }, []);

  // ── Work Orders ──
  const addWorkOrder = useCallback((wo: DemoWorkOrder, detail?: DemoWorkOrderDetail) => {
    setStore(prev => ({
      ...prev,
      workOrders: [wo, ...prev.workOrders],
      workOrderDetails: detail ? [detail, ...prev.workOrderDetails] : prev.workOrderDetails,
    }));
  }, []);

  const updateWorkOrderStatus = useCallback((id: string, status: string, pricing?: { final_price: number; labor_total: number; material_total: number }) => {
    setStore(prev => ({
      ...prev,
      workOrders: prev.workOrders.map(wo =>
        wo.id === id ? { ...wo, status, ...(pricing || {}) } : wo
      ),
    }));
  }, []);

  // ── Invoices ──
  const updateInvoiceStatus = useCallback((id: string, status: string) => {
    setStore(prev => ({
      ...prev,
      invoices: prev.invoices.map(inv =>
        inv.id === id ? { ...inv, status } : inv
      ),
    }));
  }, []);

  const addInvoice = useCallback((inv: DemoInvoice, lineItems?: DemoInvoiceLineItem[]) => {
    setStore(prev => ({
      ...prev,
      invoices: [inv, ...prev.invoices],
      invoiceLineItems: lineItems ? [...lineItems, ...prev.invoiceLineItems] : prev.invoiceLineItems,
    }));
  }, []);

  // ── Purchase Orders ──
  const updatePOStatus = useCallback((id: string, status: string) => {
    setStore(prev => ({
      ...prev,
      purchaseOrders: prev.purchaseOrders.map(po =>
        po.id === id ? { ...po, status } : po
      ),
    }));
  }, []);

  // ── RFIs ──
  const addRFI = useCallback((rfi: DemoRFI) => {
    setStore(prev => ({
      ...prev,
      rfis: [rfi, ...prev.rfis],
    }));
  }, []);

  const updateRFIStatus = useCallback((id: string, status: 'open' | 'answered' | 'closed') => {
    setStore(prev => ({
      ...prev,
      rfis: prev.rfis.map(r =>
        r.id === id ? { ...r, status, answered_at: status === 'answered' ? new Date().toISOString() : r.answered_at } : r
      ),
    }));
  }, []);

  return (
    <DemoContext.Provider value={{
      ...state,
      store,
      enterDemo,
      exitDemo,
      resetStore,
      addWorkOrder,
      updateWorkOrderStatus,
      updateInvoiceStatus,
      addInvoice,
      updatePOStatus,
      addRFI,
      updateRFIStatus,
    }}>
      {children}
    </DemoContext.Provider>
  );
}

export function useDemo() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}
