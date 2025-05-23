
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { toast } from '@/components/ui/use-toast';

interface User {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
}

interface AuthContextType {
  currentUser: User | null;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Check if user is logged in on initial load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        // This will be replaced with actual Supabase auth check
        const storedUser = localStorage.getItem('toolShareUser');
        if (storedUser) {
          setCurrentUser(JSON.parse(storedUser));
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Register new user
  const register = async (email: string, password: string, displayName: string) => {
    setLoading(true);
    try {
      // This will be replaced with actual Supabase auth
      // Mock registration for now
      const newUser = {
        id: `user_${Date.now()}`,
        email,
        displayName,
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('toolShareUser', JSON.stringify(newUser));
      setCurrentUser(newUser);
      toast({ 
        title: "Registration successful",
        description: "Welcome to Tool Share!" 
      });
    } catch (error: any) {
      toast({ 
        title: "Registration failed", 
        description: error.message || "An error occurred during registration",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Login user
  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      // This will be replaced with actual Supabase auth
      // Mock login for now
      const user = {
        id: `user_${Date.now()}`,
        email,
        displayName: email.split('@')[0],
        createdAt: new Date().toISOString()
      };
      
      localStorage.setItem('toolShareUser', JSON.stringify(user));
      setCurrentUser(user);
      toast({ 
        title: "Login successful",
        description: "Welcome back!" 
      });
    } catch (error: any) {
      toast({ 
        title: "Login failed", 
        description: error.message || "Invalid email or password",
        variant: "destructive"
      });
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout user
  const logout = async () => {
    try {
      // This will be replaced with actual Supabase auth logout
      localStorage.removeItem('toolShareUser');
      setCurrentUser(null);
      toast({ title: "Logged out successfully" });
    } catch (error: any) {
      toast({ 
        title: "Logout failed", 
        description: error.message || "An error occurred during logout",
        variant: "destructive"
      });
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
