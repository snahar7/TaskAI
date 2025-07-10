import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ModernSidebar } from "@/components/modern-sidebar";
import { ModernMobileNav } from "@/components/modern-mobile-nav";
import Home from "@/pages/home-simple";
import Database from "@/pages/database-optimized";
import Dashboard from "@/pages/dashboard";
import Timeline from "@/pages/timeline";
import Standup from "@/pages/standup";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/database" component={Database} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/timeline" component={Timeline} />
      <Route path="/standup" component={Standup} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-background">
          {/* Mobile Navigation */}
          <ModernMobileNav />
          
          {/* Desktop Layout */}
          <div className="sidebar-layout">
            {/* Desktop Sidebar */}
            <ModernSidebar className="hidden lg:flex" />
            
            {/* Main Content */}
            <main className="sidebar-content bg-muted/30 pb-16 lg:pb-0">
              <div className="h-full overflow-auto">
                <Router />
              </div>
            </main>
          </div>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
