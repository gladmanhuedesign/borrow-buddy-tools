
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Session, User } from '@supabase/supabase-js';
import { toast } from '@/hooks/use-toast';

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
    const initializeAuth = async () => {
      try {
        console.log("Initializing auth...");
        
        // Set up auth state listener FIRST
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, currentSession) => {
            console.log("Auth state changed:", event, currentSession ? "Session exists" : "No session");
            
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION') {
              if (currentSession) {
                await handleSessionUpdate(currentSession);
              }
            } else if (event === 'SIGNED_OUT') {
              console.log("User signed out, clearing state");
              setCurrentUser(null);
              setSession(null);
              setLoading(false);
            }
          }
        );

        // THEN get initial session
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error("Initial session error:", error);
          setLoading(false);
          return;
        }

        console.log("Initial session:", initialSession ? "Found" : "None");
        
        if (initialSession) {
          await handleSessionUpdate(initialSession);
        } else {
          setLoading(false);
        }

        return () => {
          console.log("Cleaning up auth subscription");
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Auth initialization error:', error);
        setLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const handleSessionUpdate = async (newSession: Session) => {
    try {
      console.log("Updating session for user:", newSession.user.id);
      setSession(newSession);
      
      // Fetch profile data with timeout
      const profilePromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', newSession.user.id)
        .single();

      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Profile fetch timeout')), 5000)
      );

      try {
        const { data: profile, error: profileError } = await Promise.race([
          profilePromise,
          timeoutPromise
        ]) as any;

        if (profileError) {
          console.error('Error fetching profile:', profileError);
          // Continue anyway with basic user data
          setCurrentUser({
            id: newSession.user.id,
            email: newSession.user.email || '',
            displayName: newSession.user.email?.split('@')[0] || 'Unknown'
          });
        } else if (profile) {
          setCurrentUser({
            id: newSession.user.id,
            email: newSession.user.email || '',
            displayName: profile.display_name
          });
        }
      } catch (profileError) {
        console.error('Profile fetch failed:', profileError);
        // Fallback to basic user data
        setCurrentUser({
          id: newSession.user.id,
          email: newSession.user.email || '',
          displayName: newSession.user.email?.split('@')[0] || 'Unknown'
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Session update error:', error);
      setLoading(false);
    }
  };

  // Register new user
  const register = async (email: string, password: string, displayName: string) => {
    try {
      console.log("Registering user:", email);
      
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

      console.log("Registration successful with immediate session");
    } catch (error: any) {
      console.error("Registration process error:", error);
      throw error;
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    try {
      console.log("Logging in user:", email);
      
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

      console.log("Login successful, session established");
      // Session update will be handled by onAuthStateChange
    } catch (error: any) {
      console.error("Login process error:", error);
      throw error;
    }
  };

  // Logout user
  const logout = async () => {
    try {
      console.log("Logging out user");
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        console.error("Logout error:", error);
        throw error;
      }
      
      console.log("Logout successful");
      // State clearing will be handled by onAuthStateChange
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
    isAuthenticated: !!currentUser && !!session
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
