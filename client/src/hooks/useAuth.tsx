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
  signUp: (email: string, password: string, firstName: string, lastName: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
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
          const response = await apiRequest('/api/auth/sync', {
            method: 'POST',
            body: JSON.stringify({
              firebaseId: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName,
              profilePicture: firebaseUser.photoURL,
              provider: firebaseUser.providerData[0]?.providerId || 'email'
            })
          });
          
          if (response.ok) {
            const userData = await response.json();
            setUser(userData.user);
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

  const signUp = async (email: string, password: string, firstName: string, lastName: string) => {
    const { signUpWithEmail } = await import('@/lib/firebase');
    const firebaseUser = await signUpWithEmail(email, password);
    
    // Create user profile in backend
    await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({
        firebaseId: firebaseUser.uid,
        email,
        firstName,
        lastName,
        provider: 'email'
      })
    });
  };

  const signInWithGoogle = async () => {
    const { signInWithGoogle: firebaseGoogleSignIn } = await import('@/lib/firebase');
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