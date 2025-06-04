
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Wrench, Share2, Users, ArrowRight, CheckCircle } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    "Share tools with trusted groups",
    "Track borrowing history",
    "Flexible date scheduling",
    "Real-time notifications"
  ];

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="w-full py-4 saas-nav">
        <div className="saas-container">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wrench className="h-4 w-4" />
              </div>
              <span className="text-xl font-semibold">Tool Share</span>
            </div>
            <div className="flex items-center gap-3">
              {!isAuthenticated ? (
                <>
                  <Button variant="ghost" onClick={() => navigate("/login")}>
                    Sign In
                  </Button>
                  <Button onClick={() => navigate("/register")}>
                    Get Started
                  </Button>
                </>
              ) : (
                <Button onClick={() => navigate("/dashboard")}>
                  Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="saas-section">
          <div className="saas-container">
            <div className="max-w-4xl mx-auto text-center">
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
                Share Tools with 
                <span className="saas-gradient-text"> Your Community</span>
              </h1>
              <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto leading-relaxed">
                Borrow tools when you need them, share tools when you don't. Join our community-focused platform for sustainable resource sharing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" onClick={() => navigate("/register")} className="text-base px-8 py-6">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {isAuthenticated && (
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => navigate("/dashboard")} 
                    className="text-base px-8 py-6"
                  >
                    Go to Dashboard
                  </Button>
                )}
              </div>
              
              {/* Feature list */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {features.map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-primary flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="saas-section bg-muted/30">
          <div className="saas-container">
            <div className="max-w-3xl mx-auto text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">
                How Tool Share Works
              </h2>
              <p className="text-lg text-muted-foreground">
                Simple, secure, and social tool sharing in three easy steps
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="saas-feature-card text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4">
                  <Wrench className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">List Your Tools</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Add tools you're willing to share with your community, set availability, and manage requests easily.
                </p>
              </div>
              <div className="saas-feature-card text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Join Groups</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Create or join private groups with friends, neighbors, or colleagues for trusted sharing.
                </p>
              </div>
              <div className="saas-feature-card text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary mx-auto mb-4">
                  <Share2 className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-semibold mb-3">Borrow & Lend</h3>
                <p className="text-muted-foreground leading-relaxed">
                  Request tools when you need them and approve requests from trusted group members.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full py-8 saas-nav">
        <div className="saas-container">
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2025 Tool Share. Built for community sharing.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
