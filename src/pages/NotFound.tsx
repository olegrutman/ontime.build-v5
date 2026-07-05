import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, LayoutDashboard, LifeBuoy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const homePath = user ? "/dashboard" : "/";

  const homePath = user ? "/dashboard" : "/";

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-lg text-center">
        <div className="font-heading text-[6rem] leading-none font-black tracking-tight text-primary/20 mb-2">
          404
        </div>
        <h1 className="font-heading text-2xl md:text-3xl font-bold uppercase tracking-tight text-foreground mb-3">
          This page isn't here
        </h1>
        <p className="text-muted-foreground mb-2">
          The link may be broken, or the page may have moved.
        </p>
        <p className="text-xs text-muted-foreground/70 font-mono break-all mb-8">
          {location.pathname}
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <Button variant="outline" onClick={() => navigate(-1)} className="w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go back
          </Button>
          <Button asChild className="w-full sm:w-auto">
            <Link to={homePath}>
              {user ? <LayoutDashboard className="w-4 h-4 mr-2" /> : <Home className="w-4 h-4 mr-2" />}
              {user ? "Open Dashboard" : "Back to Ontime.Build"}
            </Link>
          </Button>
        </div>

        <div className="border-t border-border pt-6 text-sm">
          <div className="flex items-center justify-center gap-2 text-muted-foreground">
            <LifeBuoy className="w-4 h-4" />
            <span>Need help?</span>
            <a href="mailto:support@ontime.build" className="text-primary hover:underline">
              support@ontime.build
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
