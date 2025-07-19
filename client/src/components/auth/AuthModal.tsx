import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { emailLoginSchema, emailSignupSchema, type EmailLogin, type EmailSignup } from '@shared/schema';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Chrome, Zap } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuthModal({ open, onOpenChange }: AuthModalProps) {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { login, signUp, signInWithGoogle } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  // Extract invite code from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const inviteCode = urlParams.get('invite');

  const loginForm = useForm<EmailLogin>({
    resolver: zodResolver(emailLoginSchema),
    defaultValues: { email: '', password: '' }
  });

  const signupForm = useForm<EmailSignup>({
    resolver: zodResolver(emailSignupSchema),
    defaultValues: { email: '', password: '', firstName: '', lastName: '' }
  });

  const handleLogin = async (data: EmailLogin) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      toast({ title: "Welcome back!", description: "You've been signed in successfully." });
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Sign in failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (data: EmailSignup) => {
    setLoading(true);
    try {
      await signUp(data.email, data.password, data.firstName, data.lastName, inviteCode);
      const joinMessage = inviteCode ? " You've been added to your team!" : " You're all set up.";
      toast({ title: "Account created!", description: `Welcome to Taflo!${joinMessage}` });
      onOpenChange(false);
      
      // Clear invite code from URL after successful signup
      if (inviteCode) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error: any) {
      toast({
        title: "Sign up failed",
        description: error.message || "Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle(inviteCode);
      const joinMessage = inviteCode ? " You've been added to your team!" : "";
      toast({ title: "Welcome!", description: `You've been signed in with Google.${joinMessage}` });
      onOpenChange(false);
      
      // Clear invite code from URL after successful signin
      if (inviteCode) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (error: any) {
      let errorMessage = "Please try again.";
      if (error.code === 'auth/unauthorized-domain') {
        errorMessage = "Domain not authorized. Please use email/password signup for now.";
      }
      toast({
        title: "Google sign-in failed",
        description: errorMessage,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDevLogin = async () => {
    setLoading(true);
    try {
      const response = await apiRequest('POST', '/api/auth/dev-login', { userId: 3 });
      if (response.ok) {
        const data = await response.json();
        toast({ title: "Development login successful", description: "You're now signed in as a test user." });
        onOpenChange(false);
        // Refresh page to trigger auth state update
        window.location.reload();
      } else {
        throw new Error('Development login failed');
      }
    } catch (error) {
      console.error('Dev login error:', error);
      toast({
        title: "Development login failed",
        description: "Please try regular sign-in.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'login' ? 'Sign in to Taflo' : 'Create your account'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'login' 
              ? 'Welcome back! Sign in to access your tasks and goals.'
              : 'Get started with Taflo to organize your tasks with AI assistance.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Google Sign In Button */}
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleSignIn}
            disabled={loading}
          >
            <Chrome className="w-4 h-4 mr-2" />
            Continue with Google
          </Button>

          {/* Development Login Button (only in development) */}
          {process.env.NODE_ENV === 'development' && (
            <Button
              variant="outline"
              className="w-full border-yellow-200 text-yellow-700 hover:bg-yellow-50"
              onClick={handleDevLogin}
              disabled={loading}
            >
              <Zap className="w-4 h-4 mr-2" />
              Quick Dev Login (Test User)
            </Button>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <Separator className="w-full" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          {/* Email/Password Form */}
          {mode === 'login' ? (
            <Form {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-3">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your password" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Signing in...' : 'Sign in'}
                </Button>
              </form>
            </Form>
          ) : (
            <Form {...signupForm}>
              <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={signupForm.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>First Name</FormLabel>
                        <FormControl>
                          <Input placeholder="First name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Last Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Last name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={signupForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter your email" type="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={signupForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input placeholder="Create a password (8+ characters)" type="password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating account...' : 'Create account'}
                </Button>
              </form>
            </Form>
          )}

          {/* Switch Mode */}
          <div className="text-center text-sm text-muted-foreground">
            {mode === 'login' ? (
              <>
                Don't have an account?{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => setMode('signup')}>
                  Sign up
                </Button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <Button variant="link" className="p-0 h-auto" onClick={() => setMode('login')}>
                  Sign in
                </Button>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}