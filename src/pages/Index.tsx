
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Wrench, Share2, Users } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  return (
    <div className="flex flex-col min-h-screen">
      <header className="w-full py-6 px-4 glass-nav">
        <div className="container flex justify-between items-center">
          <div className="flex items-center gap-2 animate-float">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tool Share</span>
          </div>
          <div className="space-x-2">
            {!isAuthenticated ? (
              <>
                <Button variant="outline" onClick={() => navigate("/login")}>
                  Sign In
                </Button>
                <Button onClick={() => navigate("/register")}>
                  Sign Up
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate("/dashboard")}>
                Dashboard
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-clip-text text-transparent animate-float">
              Share Tools with Friends and Community
            </h1>
            <p className="text-xl mb-12 text-muted-foreground max-w-2xl mx-auto">
              Borrow tools when you need them, share tools when you don't. Join our community-focused platform for sustainable resource sharing.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" onClick={() => navigate("/register")} className="px-8 animate-glow">
                Get Started
              </Button>
              {isAuthenticated && (
                <Button 
                  size="lg" 
                  variant="outline" 
                  onClick={() => navigate("/dashboard")} 
                  className="px-8"
                >
                  Go to Dashboard
                </Button>
              )}
            </div>
          </div>
        </section>

        <section className="py-16 px-4">
          <div className="container mx-auto">
            <h2 className="text-3xl font-bold mb-12 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              How It Works
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center glass-card p-8 hover:scale-105 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-float">
                  <Wrench className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">List Your Tools</h3>
                <p className="text-muted-foreground">
                  Add tools you're willing to share with your community or friends
                </p>
              </div>
              <div className="text-center glass-card p-8 hover:scale-105 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-float" style={{ animationDelay: '1s' }}>
                  <Users className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Create Groups</h3>
                <p className="text-muted-foreground">
                  Form private groups with friends, neighbors, or colleagues
                </p>
              </div>
              <div className="text-center glass-card p-8 hover:scale-105 transition-all duration-300">
                <div className="bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm p-4 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 animate-float" style={{ animationDelay: '2s' }}>
                  <Share2 className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-2">Borrow and Share</h3>
                <p className="text-muted-foreground">
                  Request tools when you need them and approve requests from others
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-6 px-4 glass-nav mt-auto">
        <div className="container mx-auto text-center text-muted-foreground">
          <p>© 2025 Tool Share. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
