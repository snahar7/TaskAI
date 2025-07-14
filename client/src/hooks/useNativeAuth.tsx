import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

interface NativeAuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, firstName: string, lastName: string, inviteCode?: string | null) => Promise<void>;
  logout: () => Promise<void>;
}

const NativeAuthContext = createContext<NativeAuthContextType | undefined>(undefined);

export function NativeAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await apiRequest('GET', '/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await apiRequest('POST', '/api/auth/email-login', { email, password });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }
    
    const data = await response.json();
    setUser(data.user);
  };

  const signUp = async (email: string, password: string, firstName: string, lastName: string, inviteCode?: string | null) => {
    const response = await apiRequest('POST', '/api/auth/email-signup', {
      email,
      password,
      firstName,
      lastName,
      inviteCode
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Signup failed');
    }
    
    const data = await response.json();
    setUser(data.user);
  };

  const logout = async () => {
    const response = await apiRequest('POST', '/api/auth/logout');
    
    if (response.ok) {
      setUser(null);
    } else {
      throw new Error('Logout failed');
    }
  };

  return (
    <NativeAuthContext.Provider value={{
      user,
      loading,
      login,
      signUp,
      logout
    }}>
      {children}
    </NativeAuthContext.Provider>
  );
}

export function useNativeAuth() {
  const context = useContext(NativeAuthContext);
  if (context === undefined) {
    throw new Error('useNativeAuth must be used within a NativeAuthProvider');
  }
  return context;
}