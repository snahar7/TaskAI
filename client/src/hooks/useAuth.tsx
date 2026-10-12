import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth, firebaseConfigured, firebaseConfigError } from '@/lib/firebase';
import { User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';
import { displayDomainInfo } from '@/utils/domain';

interface AuthContextType {
  user: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, inviteCode?: string | null) => Promise<void>;
  signInWithGoogle: (inviteCode?: string | null) => Promise<void>;
  logout: () => Promise<void>;
  /** True when the server runs in DEMO_MODE (local Demo User, canned AI). */
  demoMode: boolean;
  /** Set when Firebase is required but not configured. */
  configError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [demoMode, setDemoMode] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribe: (() => void) | undefined;
    let cancelled = false;

    (async () => {
      // Ask the server which auth mode to use.
      let isDemo = false;
      try {
        const res = await fetch('/api/auth/config', { credentials: 'include' });
        if (res.ok) isDemo = !!(await res.json()).demoMode;
      } catch (error) {
        console.error('Could not load /api/auth/config:', error);
      }
      if (cancelled) return;

      if (isDemo) {
        setDemoMode(true);
        await startDemoSession();
        return;
      }
      if (!firebaseConfigured) {
        console.error(firebaseConfigError);
        setConfigError(firebaseConfigError);
        setLoading(false);
        return;
      }
      unsubscribe = startFirebaseAuth();
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, []);

  // Demo mode: reuse the server session, or sign in as the shared Demo User.
  const startDemoSession = async () => {
    try {
      const existing = await fetch('/api/auth/user', { credentials: 'include' });
      if (existing.ok) {
        setUser(await existing.json());
      } else {
        const res = await fetch('/api/auth/demo-login', { method: 'POST', credentials: 'include' });
        if (res.ok) setUser((await res.json()).user);
        else console.error('Demo login failed:', res.status);
      }
    } catch (error) {
      console.error('Demo login error:', error);
    } finally {
      setLoading(false);
    }
  };

  const startFirebaseAuth = () => {
    // Display domain info for Firebase configuration
    displayDomainInfo();
    
    // Check for redirect result on app initialization (for Replit environment)
    const checkRedirectResult = async () => {
      try {
        const { handleRedirectResult } = await import('@/lib/firebase');
        await handleRedirectResult();
      } catch (error) {
        console.error('Error handling redirect result:', error);
      }
    };
    
    checkRedirectResult();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔐 Firebase auth state changed:', firebaseUser ? `${firebaseUser.email} (${firebaseUser.uid})` : 'signed out');
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Clear any existing React Query cache when new user logs in
          const { queryClient } = await import('@/lib/queryClient');
          queryClient.clear();
          
          // Sync with backend to get/create user profile
          const providerId = firebaseUser.providerData[0]?.providerId || 'email';
          const provider = providerId === 'google.com' ? 'google' : 'email';
          
          // Check for invite code in URL or sessionStorage for new users
          const urlParams = new URLSearchParams(window.location.search);
          const inviteCode = urlParams.get('invite') || sessionStorage.getItem('pendingInviteCode');
          
          // Clear stored invite code after use (but keep other session data)
          if (sessionStorage.getItem('pendingInviteCode')) {
            sessionStorage.removeItem('pendingInviteCode');
          }
          
          const response = await apiRequest('POST', '/api/auth/sync', {
            firebaseId: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            profilePicture: firebaseUser.photoURL,
            provider,
            inviteCode
          });
          
          if (response.ok) {
            const userData = await response.json();
            console.log('🔐 Firebase user sync successful:', userData.user?.email, 'ID:', userData.user?.id);
            setUser(userData.user);
          } else {
            console.error('User sync failed:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      } else {
        // Firebase user signed out, but check if backend session still exists
        try {
          console.log('🔐 Firebase user signed out, checking backend session...');
          const response = await apiRequest('GET', '/api/auth/user');
          if (response.ok) {
            const userData = await response.json();
            console.log('🔐 Backend session still active for user:', userData.email);
            setUser(userData);
          } else {
            setUser(null);
            // Clear cache when user logs out
            const { queryClient } = await import('@/lib/queryClient');
            queryClient.clear();
          }
        } catch (error) {
          console.error('Error checking auth status:', error);
          setUser(null);
          // Clear cache on error
          const { queryClient } = await import('@/lib/queryClient');
          queryClient.clear();
        }
      }
      
      setLoading(false);
    });

    return unsubscribe;
  };

  const login = async (email: string, password: string) => {
    if (demoMode) return startDemoSession();
    const { signInWithEmail } = await import('@/lib/firebase');
    await signInWithEmail(email, password);
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, inviteCode?: string | null) => {
    if (demoMode) return startDemoSession();
    const { signUpWithEmail } = await import('@/lib/firebase');
    const firebaseUser = await signUpWithEmail(email, password);
    
    // Create user profile in backend
    await apiRequest('POST', '/api/auth/signup', {
      firebaseId: firebaseUser.uid,
      email,
      firstName,
      lastName,
      provider: 'email',
      inviteCode
    });
  };

  const signInWithGoogle = async (inviteCode?: string | null) => {
    if (demoMode) return startDemoSession();
    const { signInWithGoogle: firebaseGoogleSignIn } = await import('@/lib/firebase');
    
    // Store invite code in sessionStorage temporarily for the sync call
    if (inviteCode) {
      sessionStorage.setItem('pendingInviteCode', inviteCode);
    }
    
    const result = await firebaseGoogleSignIn();
    
    // If result is null, it means redirect was initiated (Replit environment)
    if (result === null) {
      console.log('🔐 Redirect initiated for Google sign-in');
      // The redirect will handle the rest automatically
    }
  };

  const logout = async () => {
    const { logout: firebaseLogout } = await import('@/lib/firebase');
    const { queryClient } = await import('@/lib/queryClient');
    
    try {
      // 1. Clear React Query cache first to prevent stale data
      queryClient.clear();
      
      // 2. Clear localStorage and sessionStorage (only auth-related data)
      localStorage.removeItem('firebaseUser');
      sessionStorage.removeItem('pendingInviteCode');
      
      // 3. Firebase logout (demo mode: end the server session)
      if (demoMode) {
        await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      } else {
        await firebaseLogout();
      }
      
      // 4. Clear user state
      setUser(null);
      setFirebaseUser(null);
      
      // 5. Additional cache invalidation
      queryClient.removeQueries();
      
      console.log('🔐 Firebase logout complete - all data cleared');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if Firebase logout fails
      setUser(null);
      setFirebaseUser(null);
      queryClient.clear();
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      login,
      signUp,
      signInWithGoogle,
      logout,
      demoMode,
      configError
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}