
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { useUserPreferences } from "@/hooks/useUserPreferences";
import { 
  Settings as SettingsIcon, 
  Bell, 
  Shield, 
  Palette,
  LogOut,
  Trash2,
  Loader2
} from "lucide-react";

const Settings = () => {
  const { logout } = useAuth();
  const { preferences, isLoading, updatePreferences, isUpdating } = useUserPreferences();

  const handleNotificationChange = (field: string, value: boolean) => {
    updatePreferences({ [field]: value });
  };

  const handleDeleteAccount = () => {
    toast({
      title: "Feature not available",
      description: "Account deletion is not currently available. Please contact support.",
      variant: "destructive",
    });
  };

  if (isLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-8">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="ml-2">Loading preferences...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-2xl mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Manage your application preferences and account settings.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
            <CardDescription>
              Choose what notifications you want to receive.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="email-notifications">Email Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive notifications via email
                </p>
              </div>
              <Switch
                id="email-notifications"
                checked={preferences?.email_notifications ?? true}
                onCheckedChange={(checked) => handleNotificationChange('email_notifications', checked)}
                disabled={isUpdating}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="push-notifications">Push Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Receive push notifications in the app
                </p>
              </div>
              <Switch
                id="push-notifications"
                checked={preferences?.push_notifications ?? true}
                onCheckedChange={(checked) => handleNotificationChange('push_notifications', checked)}
                disabled={isUpdating}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="tool-request-notifications">Tool Request Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about tool requests and updates
                </p>
              </div>
              <Switch
                id="tool-request-notifications"
                checked={preferences?.tool_request_notifications ?? true}
                onCheckedChange={(checked) => handleNotificationChange('tool_request_notifications', checked)}
                disabled={isUpdating}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="group-invite-notifications">Group Invite Notifications</Label>
                <p className="text-sm text-muted-foreground">
                  Get notified about group invitations
                </p>
              </div>
              <Switch
                id="group-invite-notifications"
                checked={preferences?.group_invite_notifications ?? true}
                onCheckedChange={(checked) => handleNotificationChange('group_invite_notifications', checked)}
                disabled={isUpdating}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Appearance
            </CardTitle>
            <CardDescription>
              Customize how the app looks and feels.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Theme customization options coming soon.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Privacy & Security
            </CardTitle>
            <CardDescription>
              Manage your privacy and security preferences.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" onClick={logout} className="w-full">
              <LogOut className="mr-2 h-4 w-4" />
              Sign Out
            </Button>
            
            <Separator />
            
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-destructive">Danger Zone</h4>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                className="w-full"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Account
              </Button>
              <p className="text-xs text-muted-foreground">
                This action cannot be undone. All your data will be permanently deleted.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;
