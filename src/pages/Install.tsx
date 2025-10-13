import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Smartphone, CheckCircle } from "lucide-react";

const Install = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <Card>
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            {isInstalled ? (
              <CheckCircle className="h-8 w-8 text-primary" />
            ) : (
              <Smartphone className="h-8 w-8 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {isInstalled ? "App Installed!" : "Install Borrow Buddy"}
          </CardTitle>
          <CardDescription>
            {isInstalled 
              ? "You can now use Borrow Buddy as a native app on your device"
              : "Get the full app experience on your device"
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isInstalled && (
            <>
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    1
                  </div>
                  <div>
                    <h3 className="font-semibold">Works Offline</h3>
                    <p className="text-sm text-muted-foreground">
                      Access your tools even without internet connection
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    2
                  </div>
                  <div>
                    <h3 className="font-semibold">Quick Access</h3>
                    <p className="text-sm text-muted-foreground">
                      Launch directly from your home screen
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                    3
                  </div>
                  <div>
                    <h3 className="font-semibold">Native Experience</h3>
                    <p className="text-sm text-muted-foreground">
                      Feels like a native app on your device
                    </p>
                  </div>
                </div>
              </div>

              {isInstallable ? (
                <Button 
                  onClick={handleInstall} 
                  className="w-full" 
                  size="lg"
                >
                  <Download className="mr-2 h-5 w-5" />
                  Install App
                </Button>
              ) : (
                <div className="rounded-lg bg-muted p-4 text-sm">
                  <p className="font-semibold mb-2">How to install:</p>
                  <ul className="space-y-1 text-muted-foreground">
                    <li><strong>iPhone/iPad:</strong> Tap the Share button, then "Add to Home Screen"</li>
                    <li><strong>Android:</strong> Tap the menu button, then "Install app" or "Add to Home Screen"</li>
                    <li><strong>Desktop:</strong> Look for the install icon in your browser's address bar</li>
                  </ul>
                </div>
              )}
            </>
          )}

          {isInstalled && (
            <div className="rounded-lg bg-primary/10 p-4 text-center">
              <p className="text-sm text-muted-foreground">
                You're all set! The app is now installed on your device.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Install;
