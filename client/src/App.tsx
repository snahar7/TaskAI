import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CollapsibleSidebar } from "@/components/collapsible-sidebar";
import CleanHome from "@/pages/clean-home";
import TodoPage from "@/pages/todo";
import GoalsPage from "@/pages/goals";
import Standup from "@/pages/standup";
import AssistPage from "@/pages/assist";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={CleanHome} />
      <Route path="/todo" component={TodoPage} />
      <Route path="/goals" component={GoalsPage} />
      <Route path="/standup" component={Standup} />
      <Route path="/assist" component={AssistPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen bg-gray-50 flex">
          {/* Collapsible Sidebar */}
          <CollapsibleSidebar />
          
          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Router />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
