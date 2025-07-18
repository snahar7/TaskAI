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
        console.log('🔐 Native auth check successful:', userData?.email, 'ID:', userData?.id);
        setUser(userData);
      } else {
        setUser(null);
        // Clear cache if auth check fails
        const { queryClient } = await import('@/lib/queryClient');
        queryClient.clear();
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
      // Clear cache on auth error
      const { queryClient } = await import('@/lib/queryClient');
      queryClient.clear();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    // Clear cache before login to prevent cross-user contamination
    const { queryClient } = await import('@/lib/queryClient');
    queryClient.clear();
    
    const response = await apiRequest('POST', '/api/auth/email-login', { email, password });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Login failed');
    }
    
    const data = await response.json();
    console.log('🔐 Native login successful:', data.user?.email, 'ID:', data.user?.id);
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
    const { queryClient } = await import('@/lib/queryClient');
    
    try {
      // 1. Clear React Query cache first to prevent stale data
      queryClient.clear();
      
      // 2. Clear localStorage and sessionStorage  
      localStorage.clear();
      sessionStorage.clear();
      
      // 3. Backend logout API call
      const response = await apiRequest('POST', '/api/auth/logout');
      
      // 4. Clear user state regardless of API response
      setUser(null);
      
      // 5. Additional cache invalidation
      queryClient.removeQueries();
      
      if (!response.ok) {
        console.warn('Backend logout failed, but local state cleared');
      }
      
      console.log('🔐 Native logout complete - all data cleared');
    } catch (error) {
      console.error('Logout error:', error);
      // Still clear local state even if API fails
      setUser(null);
      queryClient.clear();
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