import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface PasswordProtectionProps {
  children: React.ReactNode;
}

interface AuthResponse {
  authenticated: boolean;
}

interface LoginResponse {
  success: boolean;
  message: string;
}

export default function PasswordProtection({ children }: PasswordProtectionProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  // Check authentication status on mount
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔒 PasswordProtection: Checking authentication status...');
      
      try {
        // First try localStorage (fallback for production)
        const localAuth = localStorage.getItem('taflo-stealth-auth');
        console.log('🔒 LocalStorage auth status:', localAuth);
        
        if (localAuth === 'authenticated') {
          console.log('✅ User authenticated via localStorage');
          setIsAuthenticated(true);
          setIsLoading(false);
          return;
        }

        // Try server-side check if available
        console.log('🔗 Trying server auth check...');
        const response = await fetch('/api/stealth/check');
        if (response.ok) {
          const data = await response.json();
          console.log('✅ Server auth response:', data);
          setIsAuthenticated(data.authenticated);
        } else {
          // Server not accessible, rely on localStorage
          console.log('❌ Server not accessible, defaulting to unauthenticated');
          setIsAuthenticated(false);
        }
      } catch (error) {
        // Server not accessible, rely on localStorage
        console.log('❌ Server auth failed:', error);
        setIsAuthenticated(false);
      }
      
      console.log('🔒 Auth check complete, showing password screen if needed');
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Check if user is authenticated via API (if server is available)
  const { data: auth } = useQuery<AuthResponse>({
    queryKey: ['/api/stealth/check'],
    retry: false,
    enabled: false, // We'll handle this manually
  });

  // Login mutation
  const loginMutation = useMutation<LoginResponse, Error, { password: string }>({
    mutationFn: async ({ password }) => {
      // Hardcoded password check for production fallback
      const EXPECTED_PASSWORD = 'taflo2025';
      
      if (password === EXPECTED_PASSWORD) {
        // Store in localStorage as fallback
        localStorage.setItem('taflo-stealth-auth', 'authenticated');
        return { success: true, message: 'Access granted' };
      }
      
      // Try server if available
      try {
        const response = await apiRequest('POST', '/api/stealth/login', { password });
        const data = await response.json();
        if (data.success) {
          localStorage.setItem('taflo-stealth-auth', 'authenticated');
        }
        return data;
      } catch (error) {
        // Server not available, password was wrong
        throw new Error('Invalid password. Please try again.');
      }
    },
    onSuccess: (data) => {
      if (data.success) {
        setIsAuthenticated(true);
        queryClient.invalidateQueries({ queryKey: ['/api/stealth/check'] });
        setError('');
        setPassword('');
      }
    },
    onError: (error) => {
      setError(error.message || 'Invalid password. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      loginMutation.mutate({ password });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };

  // If still loading, show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // If authenticated, show the main app
  if (isAuthenticated || auth?.authenticated) {
    return <>{children}</>;
  }

  // If not authenticated, show password form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900">
            <Lock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl font-bold">Taflo Access</CardTitle>
          <CardDescription>
            This is a private stealth project. Please enter the access password to continue.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter access password"
                  className="pr-10"
                  disabled={loginMutation.isPending}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending || !password.trim()}
            >
              {loginMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Verifying...
                </>
              ) : (
                'Access Taflo'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
            <p>AI-powered task management in stealth mode</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}