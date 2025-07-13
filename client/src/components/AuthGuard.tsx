import { ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckSquare, Users, Zap, Target, Shield } from 'lucide-react';
import { AuthModal } from '@/components/auth/AuthModal';
import { useState } from 'react';

interface AuthGuardProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AuthGuard({ children, fallback }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-slate-200 rounded w-1/3"></div>
          <div className="h-4 bg-slate-200 rounded w-2/3"></div>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return fallback || (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center space-x-3 mb-6">
            <div className="w-12 h-12 bg-primary rounded-xl flex items-center justify-center">
              <CheckSquare className="text-white" size={24} />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Taflo</h1>
          </div>
          <p className="text-lg text-slate-600 mb-8">
            AI-powered task management that breaks down complex goals into actionable steps
          </p>
          <Button 
            onClick={() => setAuthModalOpen(true)}
            className="bg-primary hover:bg-primary/90 text-white px-8 py-3 text-lg"
          >
            Get Started - Sign Up Free
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-primary" />
                AI-Powered Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Transform complex goals into clear, actionable tasks with intelligent AI assistance
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Team Collaboration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Assign tasks, track progress, and collaborate seamlessly with your team
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-primary" />
                Smart Timeline
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-slate-600">
                Automatic scheduling and timeline generation based on your goals and deadlines
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="bg-slate-50 rounded-lg p-8 text-center">
          <Shield className="w-16 h-16 text-primary mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Sign in to access your tasks</h2>
          <p className="text-slate-600 mb-6">
            Create an account to start breaking down your goals and managing your tasks
          </p>
          <Button 
            onClick={() => setAuthModalOpen(true)}
            variant="outline"
            className="border-primary text-primary hover:bg-primary hover:text-white"
          >
            Sign In / Sign Up
          </Button>
        </div>

        <AuthModal open={authModalOpen} onOpenChange={setAuthModalOpen} />
      </div>
    );
  }

  return <>{children}</>;
}