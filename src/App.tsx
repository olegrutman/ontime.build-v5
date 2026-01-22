import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import JoinOrg from "./pages/JoinOrg";
import AdminSuppliers from "./pages/AdminSuppliers";
import CatalogPage from "./pages/CatalogPage";
import SupplierEstimates from "./pages/SupplierEstimates";
import EstimateApprovals from "./pages/EstimateApprovals";
import MaterialOrders from "./pages/MaterialOrders";
import OrderApprovals from "./pages/OrderApprovals";
import PurchaseOrders from "./pages/PurchaseOrders";
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
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/join-org" element={<JoinOrg />} />
            <Route path="/admin/suppliers" element={<AdminSuppliers />} />
            <Route path="/catalog" element={<CatalogPage />} />
            <Route path="/estimates" element={<SupplierEstimates />} />
            <Route path="/approvals/estimates" element={<EstimateApprovals />} />
            <Route path="/orders" element={<MaterialOrders />} />
            <Route path="/approvals/orders" element={<OrderApprovals />} />
            <Route path="/purchase-orders" element={<PurchaseOrders />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
