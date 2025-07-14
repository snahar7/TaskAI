import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/navigation";
import { AuthProvider } from "@/hooks/useAuth";
import { NativeAuthProvider } from "@/hooks/useNativeAuth";

import Home from "@/pages/home-simple";
import Database from "@/pages/database-optimized";
import Dashboard from "@/pages/dashboard";
import TaskDetail from "@/pages/task-detail";
import GoalDetail from "@/pages/goal-detail";
import ProjectDetail from "@/pages/project-detail";
import { ProfilePage } from "@/pages/profile";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/database" component={Database} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/task/:taskId" component={TaskDetail} />
      <Route path="/goal/:goalId" component={GoalDetail} />
      <Route path="/goal/:goalId/project/:projectId" component={ProjectDetail} />
      <Route path="/goal/:goalId/project/:projectId/task/:taskId" component={TaskDetail} />
      <Route path="/profile" component={ProfilePage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NativeAuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-slate-50 pb-16 md:pb-0">
              <Navigation />
              <Router />
            </div>
            <Toaster />
          </TooltipProvider>
        </NativeAuthProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
