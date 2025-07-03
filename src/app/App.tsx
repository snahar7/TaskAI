import React from 'react';
import { Router, Route, Switch } from 'wouter';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';

// Feature components
import HomePage from '@/features/goals/pages/HomePage';
import DatabasePage from '@/features/goals/pages/DatabasePage';
import TasksPage from '@/features/tasks/pages/TasksPage';
import NotFoundPage from '@/components/NotFoundPage';

// Providers
import { queryClient } from '@/lib/queryClient';

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Router>
          <div className="min-h-screen bg-background">
            <Switch>
              <Route path="/" component={HomePage} />
              <Route path="/database" component={DatabasePage} />
              <Route path="/tasks" component={TasksPage} />
              <Route component={NotFoundPage} />
            </Switch>
          </div>
        </Router>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}