import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import CreateProjectNew from "./pages/CreateProjectNew";
import ProjectHome from "./pages/ProjectHome";
import EditProjectScope from "./pages/EditProjectScope";
import EditProject from "./pages/EditProject";
import PartnerDirectory from "./pages/PartnerDirectory";
import AdminSuppliers from "./pages/AdminSuppliers";
import CatalogPage from "./pages/CatalogPage";
import InventoryPage from "./pages/InventoryPage";
import SupplierEstimates from "./pages/SupplierEstimates";
import EstimateApprovals from "./pages/EstimateApprovals";
import MaterialOrders from "./pages/MaterialOrders";
import OrderApprovals from "./pages/OrderApprovals";
import PurchaseOrders from "./pages/PurchaseOrders";
import ChangeOrders from "./pages/ChangeOrders";
import SupplierInventory from "./pages/SupplierInventory";
import SupplierProjectEstimates from "./pages/SupplierProjectEstimates";

import { WorkItemPage } from "@/components/work-item";
import { ChangeOrderDetailPage } from "@/components/change-order-detail";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/create-project" element={<CreateProjectNew />} />
            <Route path="/project/:id" element={<ProjectHome />} />
            <Route path="/project/:id/edit" element={<EditProject />} />
            <Route path="/projects/:id/scope" element={<EditProjectScope />} />
            <Route path="/partners" element={<PartnerDirectory />} />
            <Route path="/admin/suppliers" element={<AdminSuppliers />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/estimates" element={<SupplierEstimates />} />
            <Route path="/approvals/estimates" element={<EstimateApprovals />} />
            <Route path="/orders" element={<MaterialOrders />} />
            <Route path="/approvals/orders" element={<OrderApprovals />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/change-orders" element={<ChangeOrders />} />
            <Route path="/change-order/:id" element={<ChangeOrderDetailPage />} />
            <Route path="/work-item/:id" element={<WorkItemPage />} />
            <Route path="/supplier/inventory" element={<SupplierInventory />} />
            <Route path="/supplier/estimates" element={<SupplierProjectEstimates />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
