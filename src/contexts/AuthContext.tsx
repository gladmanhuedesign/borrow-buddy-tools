
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/components/ui/use-toast';

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loading: boolean;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<Session | null>(null);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        setLoading(true);
        // Get current session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Session error:", error);
          throw error;
        }
        
        if (session) {
          setSession(session);
          // Fetch profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single();

          if (profileError) {
            console.error('Error fetching profile:', profileError);
          } else if (profile) {
            setCurrentUser({
              id: session.user.id,
              email: session.user.email || '',
              displayName: profile.display_name
            });
          }
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, currentSession) => {
        setSession(currentSession);
        
        if (currentSession && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          // Use setTimeout to prevent possible deadlocks with Supabase auth state changes
          setTimeout(async () => {
            try {
              // Fetch profile when user signs in
              const { data: profile, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', currentSession.user.id)
                .single();
                
              if (profileError) {
                console.error('Profile fetch error:', profileError);
                return;
              }
                
              if (profile) {
                setCurrentUser({
                  id: currentSession.user.id,
                  email: currentSession.user.email || '',
                  displayName: profile.display_name
                });
              }
            } catch (error) {
              console.error('Auth state change error:', error);
            }
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          setCurrentUser(null);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Register new user
  const register = async (email: string, password: string, displayName: string) => {
    try {
      // Start registration process
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName
          }
        }
      });

      if (error) {
        console.error("Registration error:", error);
        throw error;
      }

      // Check for user and session
      if (!data.user) {
        throw new Error("Registration failed - no user returned");
      }

      // For email confirmation flows, we won't have a session yet
      if (!data.session) {
        toast({ 
          title: "Registration successful",
          description: "Please check your email for verification." 
        });
        return;
      }

      // If we have a session, user was auto-confirmed
      setSession(data.session);
      // Profile should be created automatically via DB trigger
    } catch (error: any) {
      console.error("Registration process error:", error);
      throw error;
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) {
        console.error("Login error:", error);
        throw error;
      }

      if (!data.user || !data.session) {
        throw new Error("Login failed - authentication rejected");
      }

      setSession(data.session);
    } catch (error: any) {
      console.error("Login process error:", error);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        throw error;
      }
      
      setCurrentUser(null);
      setSession(null);
    } catch (error: any) {
      console.error("Logout process error:", error);
      throw error;
    }
  };

  const value = {
    currentUser,
    loading,
    register,
    login,
    logout,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
