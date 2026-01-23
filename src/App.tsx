import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Landing from "./pages/Landing";
import Dashboard from "./pages/Dashboard";
import Auth from "./pages/Auth";
import JoinOrg from "./pages/JoinOrg";
import OrgSetup from "./pages/OrgSetup";
import CreateProjectNew from "./pages/CreateProjectNew";
import ProjectHome from "./pages/ProjectHome";
import EditProjectScope from "./pages/EditProjectScope";
import PartnerDirectory from "./pages/PartnerDirectory";
import AdminSuppliers from "./pages/AdminSuppliers";
import CatalogPage from "./pages/CatalogPage";
import SupplierEstimates from "./pages/SupplierEstimates";
import EstimateApprovals from "./pages/EstimateApprovals";
import MaterialOrders from "./pages/MaterialOrders";
import OrderApprovals from "./pages/OrderApprovals";
import PurchaseOrders from "./pages/PurchaseOrders";
import ChangeOrders from "./pages/ChangeOrders";
import WorkItems from "./pages/WorkItems";
import SOVDashboard from "./pages/SOVDashboard";
import { WorkItemPage } from "@/components/work-item";
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
            <Route path="/join-org" element={<JoinOrg />} />
            <Route path="/org-setup" element={<OrgSetup />} />
            <Route path="/create-project" element={<CreateProjectNew />} />
            <Route path="/project/:id" element={<ProjectHome />} />
            <Route path="/projects/:id/scope" element={<EditProjectScope />} />
            <Route path="/partners" element={<PartnerDirectory />} />
            <Route path="/admin/suppliers" element={<AdminSuppliers />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/estimates" element={<SupplierEstimates />} />
            <Route path="/approvals/estimates" element={<EstimateApprovals />} />
            <Route path="/orders" element={<MaterialOrders />} />
            <Route path="/approvals/orders" element={<OrderApprovals />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            <Route path="/change-orders" element={<ChangeOrders />} />
            <Route path="/work-items" element={<WorkItems />} />
            <Route path="/sov" element={<SOVDashboard />} />
            <Route path="/work-item/:id" element={<WorkItemPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
