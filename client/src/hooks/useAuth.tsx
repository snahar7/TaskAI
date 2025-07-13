import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
import { auth } from '@/lib/firebase';
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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Display domain info for Firebase configuration
    displayDomainInfo();
    
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setFirebaseUser(firebaseUser);
      
      if (firebaseUser) {
        try {
          // Sync with backend to get/create user profile
          const providerId = firebaseUser.providerData[0]?.providerId || 'email';
          const provider = providerId === 'google.com' ? 'google' : 'email';
          
          // Check for invite code in URL or sessionStorage for new users
          const urlParams = new URLSearchParams(window.location.search);
          const inviteCode = urlParams.get('invite') || sessionStorage.getItem('pendingInviteCode');
          
          // Clear stored invite code after use
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
            // console.log('User sync successful:', userData.user);
            setUser(userData.user);
          } else {
            console.error('User sync failed:', response.status, response.statusText);
          }
        } catch (error) {
          console.error('Error syncing user:', error);
        }
      } else {
        setUser(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const { signInWithEmail } = await import('@/lib/firebase');
    await signInWithEmail(email, password);
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, inviteCode?: string | null) => {
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
    const { signInWithGoogle: firebaseGoogleSignIn } = await import('@/lib/firebase');
    
    // Store invite code in sessionStorage temporarily for the sync call
    if (inviteCode) {
      sessionStorage.setItem('pendingInviteCode', inviteCode);
    }
    
    await firebaseGoogleSignIn();
  };

  const logout = async () => {
    const { logout: firebaseLogout } = await import('@/lib/firebase');
    await firebaseLogout();
  };

  return (
    <AuthContext.Provider value={{
      user,
      firebaseUser,
      loading,
      login,
      signUp,
      signInWithGoogle,
      logout
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