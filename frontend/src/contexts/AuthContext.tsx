import React, { createContext, useContext, useEffect, useState } from 'react';
import api from '@/lib/api';

interface User {
  id: string;
  email: string;
  role: 'admin' | 'customer';
  profile?: any;
}

interface Session {
  access_token: string;
  refresh_token: string;
  expires_at: number;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isAdmin: boolean;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  // Load session from localStorage on mount
  useEffect(() => {
    const loadSession = async () => {
      try {
        const storedSession = localStorage.getItem('session');
        const storedUser = localStorage.getItem('user');

        if (storedSession && storedUser) {
          const sessionData = JSON.parse(storedSession);
          const userData = JSON.parse(storedUser);

          // Check if token is expired
          if (sessionData.expires_at && sessionData.expires_at * 1000 < Date.now()) {
            // Try to refresh token
            try {
              const refreshed = await api.refreshToken(sessionData.refresh_token);
              const newSession = {
                access_token: refreshed.session.access_token,
                refresh_token: refreshed.session.refresh_token,
                expires_at: refreshed.session.expires_at,
              };
              setSession(newSession);
              localStorage.setItem('session', JSON.stringify(newSession));
              
              // Get user info
              const me = await api.getMe(newSession.access_token);
              setUser(me.user);
              setIsAdmin(me.user.role === 'admin');
              localStorage.setItem('user', JSON.stringify(me.user));
            } catch (error) {
              // Refresh failed, clear storage
              localStorage.removeItem('session');
              localStorage.removeItem('user');
              setSession(null);
              setUser(null);
              setIsAdmin(false);
            }
          } else {
            setSession(sessionData);
            setUser(userData);
            setIsAdmin(userData.role === 'admin');

            // Verify session is still valid
            try {
              const me = await api.getMe(sessionData.access_token);
              setUser(me.user);
              setIsAdmin(me.user.role === 'admin');
              localStorage.setItem('user', JSON.stringify(me.user));
            } catch (error) {
              // Session invalid, clear storage
              localStorage.removeItem('session');
              localStorage.removeItem('user');
              setSession(null);
              setUser(null);
              setIsAdmin(false);
            }
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
        localStorage.removeItem('session');
        localStorage.removeItem('user');
      } finally {
        setIsLoading(false);
      }
    };

    loadSession();
  }, []);

  const signUp = async (email: string, password: string, fullName: string) => {
    try {
      await api.signup(email, password, fullName);
      // Auto-login after signup
      return await signIn(email, password);
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const response = await api.login(email, password);
      
      const sessionData: Session = {
        access_token: response.session.access_token,
        refresh_token: response.session.refresh_token,
        expires_at: response.session.expires_at,
      };

      setSession(sessionData);
      setUser(response.user);
      setIsAdmin(response.user.role === 'admin');

      // Store in localStorage
      localStorage.setItem('session', JSON.stringify(sessionData));
      localStorage.setItem('user', JSON.stringify(response.user));

      return { error: null };
    } catch (error: any) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    try {
      if (session?.access_token) {
        await api.logout(session.access_token);
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      setSession(null);
      setIsAdmin(false);
      localStorage.removeItem('session');
      localStorage.removeItem('user');
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      session,
      isLoading,
      isAdmin,
      signUp,
      signIn,
      signOut,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
