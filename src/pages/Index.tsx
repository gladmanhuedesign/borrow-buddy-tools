
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wrench, Share2, Users, ArrowRight, CheckCircle, Zap, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const features = [
    {
      icon: <Wrench className="w-8 h-8 text-primary" />,
      title: "List Your Tools",
      description: "Add tools you're willing to share with your community or friends"
    },
    {
      icon: <Users className="w-8 h-8 text-primary" />,
      title: "Create Groups",
      description: "Form private groups with friends, neighbors, or colleagues"
    },
    {
      icon: <Share2 className="w-8 h-8 text-primary" />,
      title: "Borrow and Share",
      description: "Request tools when you need them and approve requests from others"
    }
  ];

  const benefits = [
    "Save money on tool purchases",
    "Build stronger community connections",
    "Reduce environmental impact",
    "Access tools when you need them"
  ];

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50">
      <header className="w-full py-4 px-4 bg-background/95 border-b backdrop-blur">
        <div className="saas-container flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">Tool Share</span>
          </div>
          <div className="space-x-3">
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
                Go to Dashboard
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="saas-section">
          <div className="saas-container mx-auto max-w-6xl text-center">
            <div className="animate-fade-in-up">
              <h1 className="text-4xl md:text-6xl font-bold mb-6 saas-gradient-text">
                Share Tools with Your Community
              </h1>
              <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                Borrow tools when you need them, share tools when you don't. Join our community-focused platform for sustainable resource sharing.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
                <Button size="lg" onClick={() => navigate("/register")} className="px-8 py-6 text-base">
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                {isAuthenticated && (
                  <Button 
                    size="lg" 
                    variant="outline" 
                    onClick={() => navigate("/dashboard")} 
                    className="px-8 py-6 text-base"
                  >
                    Go to Dashboard
                  </Button>
                )}
              </div>

              {/* Benefits */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-4xl mx-auto">
                {benefits.map((benefit, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <span>{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="saas-section bg-background/50">
          <div className="saas-container">
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                How It Works
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Getting started with Tool Share is simple and straightforward
              </p>
            </div>
            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {features.map((feature, index) => (
                <Card key={index} className="saas-feature-card text-center">
                  <CardHeader>
                    <div className="bg-primary/10 p-4 rounded-2xl w-16 h-16 flex items-center justify-center mx-auto mb-4">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-xl">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="saas-section">
          <div className="saas-container text-center">
            <Card className="max-w-4xl mx-auto p-8 bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
              <CardContent className="space-y-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-3xl md:text-4xl font-bold">
                  Ready to Start Sharing?
                </h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                  Join thousands of users who are already saving money and building stronger communities through tool sharing.
                </p>
                <Button size="lg" onClick={() => navigate("/register")} className="px-8 py-6 text-base">
                  Get Started Today
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </main>

      <footer className="w-full py-8 px-4 border-t bg-background">
        <div className="saas-container mx-auto text-center text-muted-foreground">
          <p>© 2025 Tool Share. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
