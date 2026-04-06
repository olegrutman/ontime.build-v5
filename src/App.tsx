import { lazy, Suspense, type ReactNode, Component, type ErrorInfo } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { DemoProvider } from "@/contexts/DemoContext";
import { Skeleton } from "@/components/ui/skeleton";
import { useDemo } from "@/contexts/DemoContext";
import { DemoBanner } from "@/components/demo";
import { SashaBubble } from "@/components/sasha";
import { BoltGuide } from "@/components/bolt";
import { RequirePlatformRole } from "@/components/platform/RequirePlatformRole";
import { ImpersonationBanner } from "@/components/platform/ImpersonationBanner";
import { Button } from "@/components/ui/button";

// 1. QueryClient with sensible defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

// 5. Lazy-loaded page components
const Landing = lazy(() => import("./pages/Landing"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Demo = lazy(() => import("./pages/Demo"));
const Auth = lazy(() => import("./pages/Auth"));
const Signup = lazy(() => import("./pages/Signup"));
const VerifyEmail = lazy(() => import("./pages/VerifyEmail"));
const AuthCallback = lazy(() => import("./pages/AuthCallback"));
const CreateProjectNew = lazy(() => import("./pages/CreateProjectNew"));
const ProjectHome = lazy(() => import("./pages/ProjectHome"));
const EditProjectScope = lazy(() => import("./pages/EditProjectScope"));
const EditProject = lazy(() => import("./pages/EditProject"));
const PartnerDirectory = lazy(() => import("./pages/PartnerDirectory"));
const OrgTeam = lazy(() => import("./pages/OrgTeam"));

const CatalogPage = lazy(() => import("./pages/CatalogPage"));
const SupplierEstimates = lazy(() => import("./pages/SupplierEstimates"));
const MaterialOrders = lazy(() => import("./pages/MaterialOrders"));
const PurchaseOrders = lazy(() => import("./pages/PurchaseOrders"));
const Reminders = lazy(() => import("./pages/Reminders"));
const SupplierInventory = lazy(() => import("./pages/SupplierInventory"));
const SupplierProjectEstimates = lazy(() => import("./pages/SupplierProjectEstimates"));
const RFIs = lazy(() => import("./pages/RFIs"));
const Profile = lazy(() => import("./pages/Profile"));
const Settings = lazy(() => import("./pages/Settings"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Install = lazy(() => import("./pages/Install"));
const CODetailPage = lazy(() => import("./pages/CODetail"));
// Legacy wizards — routes redirect to setup flow, lazy imports removed
const ProjectSOVPage = lazy(() => import("./pages/ProjectSOVPage"));
const ContractScopeWizard = lazy(() => import("./pages/ContractScopeWizard"));
const DemoV2Dashboard = lazy(() => import("./pages/DemoV2Dashboard"));
const DemoV2ProjectOverview = lazy(() => import("./pages/DemoV2ProjectOverview"));

// Platform Admin pages
const PlatformDashboard = lazy(() => import("./pages/platform/PlatformDashboard"));
const PlatformOrgs = lazy(() => import("./pages/platform/PlatformOrgs"));
const PlatformOrgDetail = lazy(() => import("./pages/platform/PlatformOrgDetail"));
const PlatformUsers = lazy(() => import("./pages/platform/PlatformUsers"));
const PlatformUserDetail = lazy(() => import("./pages/platform/PlatformUserDetail"));
const PlatformProjects = lazy(() => import("./pages/platform/PlatformProjects"));
const PlatformProjectDetail = lazy(() => import("./pages/platform/PlatformProjectDetail"));
const PlatformLogs = lazy(() => import("./pages/platform/PlatformLogs"));
const PlatformPlans = lazy(() => import("./pages/platform/PlatformPlans"));
const PlatformSetup = lazy(() => import("./pages/platform/PlatformSetup"));
const PlatformRoles = lazy(() => import("./pages/platform/PlatformRoles"));
const PlatformKPIs = lazy(() => import("./pages/platform/PlatformKPIs"));
const PlatformGCDashboard = lazy(() => import("./pages/platform/PlatformGCDashboard"));


// 4. Route protection wrapper
function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  if (!user) return <Navigate to="/auth" replace />;
  return <>{children}</>;
}

// 6. Error Boundary
interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<
  { children: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Application error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 p-6 text-center">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground max-w-md">
            An unexpected error occurred. Please try refreshing the page.
          </p>
          <Button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
          >
            Refresh Page
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Suspense fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Skeleton className="h-8 w-32" />
    </div>
  );
}

function AuthenticatedSashaBubble() {
  const { user } = useAuth();
  const { isDemoMode } = useDemo();
  if (!user && !isDemoMode) return null;
  return <SashaBubble />;
}

function AppRoutes() {
  const { isDemoMode } = useDemo();

  return (
    <div className="flex flex-col min-h-screen">
      <ImpersonationBanner />
      <DemoBanner />
      <ErrorBoundary>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            {/* Public routes */}
            <Route path="/" element={<Landing />} />
            <Route path="/demo" element={<Demo />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/verify-email" element={<VerifyEmail />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/install" element={<Install />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
            <Route path="/create-project" element={<RequireAuth><CreateProjectNew /></RequireAuth>} />
            <Route path="/project/:id/edit" element={<RequireAuth><EditProject /></RequireAuth>} />
            <Route path="/project/:id/contracts" element={<RequireAuth><Navigate to="../setup" replace /></RequireAuth>} />
            <Route path="/project/:id/change-orders/:coId" element={<RequireAuth><CODetailPage /></RequireAuth>} />
            {/* Legacy wizard routes — redirect to unified setup flow */}
            <Route path="/project/:id/details-wizard" element={<RequireAuth><Navigate to="../setup" replace /></RequireAuth>} />
            <Route path="/project/:id/scope-wizard" element={<RequireAuth><Navigate to="../setup" replace /></RequireAuth>} />
            <Route path="/project/:id/contract/:contractId/scope" element={<RequireAuth><ContractScopeWizard /></RequireAuth>} />
            <Route path="/projects/:id/scope" element={<RequireAuth><EditProjectScope /></RequireAuth>} />
            <Route path="/project/:id" element={<RequireAuth><ProjectHome /></RequireAuth>} />
            <Route path="/project/:id/:section" element={<RequireAuth><ProjectHome /></RequireAuth>} />
            <Route path="/partners" element={<RequireAuth><PartnerDirectory /></RequireAuth>} />
            
            <Route path="/org/team" element={<RequireAuth><OrgTeam /></RequireAuth>} />
            <Route path="/catalog" element={<RequireAuth><CatalogPage /></RequireAuth>} />
            <Route path="/estimates" element={<RequireAuth><SupplierEstimates /></RequireAuth>} />
            <Route path="/orders" element={<RequireAuth><MaterialOrders /></RequireAuth>} />
            <Route path="/purchase-orders" element={<RequireAuth><PurchaseOrders /></RequireAuth>} />
            <Route path="/reminders" element={<RequireAuth><Reminders /></RequireAuth>} />
            
            <Route path="/supplier/inventory" element={<RequireAuth><SupplierInventory /></RequireAuth>} />
            <Route path="/supplier/estimates" element={<RequireAuth><SupplierProjectEstimates /></RequireAuth>} />
            <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
            <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
            <Route path="/rfis" element={<RequireAuth><RFIs /></RequireAuth>} />

            {/* Platform Admin routes */}
            <Route path="/platform" element={<RequirePlatformRole><PlatformDashboard /></RequirePlatformRole>} />
            <Route path="/platform/orgs" element={<RequirePlatformRole><PlatformOrgs /></RequirePlatformRole>} />
            <Route path="/platform/orgs/:orgId" element={<RequirePlatformRole><PlatformOrgDetail /></RequirePlatformRole>} />
            <Route path="/platform/users" element={<RequirePlatformRole><PlatformUsers /></RequirePlatformRole>} />
            <Route path="/platform/users/:userId" element={<RequirePlatformRole><PlatformUserDetail /></RequirePlatformRole>} />
            <Route path="/platform/projects" element={<RequirePlatformRole><PlatformProjects /></RequirePlatformRole>} />
            <Route path="/platform/projects/:projectId" element={<RequirePlatformRole><PlatformProjectDetail /></RequirePlatformRole>} />
            <Route path="/platform/logs" element={<RequirePlatformRole><PlatformLogs /></RequirePlatformRole>} />
            <Route path="/platform/plans" element={<RequirePlatformRole><PlatformPlans /></RequirePlatformRole>} />
            <Route path="/platform/rules" element={<RequirePlatformRole><PlatformRoles /></RequirePlatformRole>} />
            <Route path="/platform/kpis" element={<RequirePlatformRole><PlatformKPIs /></RequirePlatformRole>} />
            <Route path="/platform/setup" element={<RequirePlatformRole><PlatformSetup /></RequirePlatformRole>} />

            {/* Demo V2 — standalone prototype */}
            <Route path="/demo-v2" element={<DemoV2Dashboard />} />
            <Route path="/demo-v2/project/:id" element={<DemoV2ProjectOverview />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </ErrorBoundary>
      <AuthenticatedSashaBubble />
      {!isDemoMode && <BoltGuide />}
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <DemoProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </DemoProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
