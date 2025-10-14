
import { Link, useLocation } from "react-router-dom";
import { Home, Hammer, UsersRound, InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { useNotifications } from "@/hooks/useNotifications";

const MobileNavigation = () => {
  const location = useLocation();
  const { currentUser } = useAuth();
  const [invitationCount, setInvitationCount] = useState(0);
  const { unreadCount } = useNotifications();
  
  useEffect(() => {
    if (!currentUser?.email) return;

    // Fetch pending invitations count
    const fetchInvitationCount = async () => {
      const { count, error } = await supabase
        .from('group_invites')
        .select('*', { count: 'exact', head: true })
        .eq('email', currentUser.email);
      
      if (error) {
        console.error('Error fetching invitation count:', error);
        return;
      }
      
      setInvitationCount(count || 0);
    };

    fetchInvitationCount();
    
    // Set up subscription to monitor changes to invitations
    const channel = supabase
      .channel('invitation-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'group_invites' }, 
        () => {
          fetchInvitationCount();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.email]);
  
  const navItems = [
    {
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      href: "/dashboard",
      notification: unreadCount > 0 ? (
        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
          {unreadCount > 99 ? '99+' : unreadCount}
        </Badge>
      ) : null
    },
    {
      label: "Tools",
      icon: <Hammer className="h-5 w-5" />,
      href: "/tools"
    },
    {
      label: "Groups",
      icon: <UsersRound className="h-5 w-5" />,
      href: "/groups",
      notification: invitationCount > 0 ? (
        <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-[10px]">
          {invitationCount}
        </Badge>
      ) : null
    },
    {
      label: "Requests",
      icon: <InboxIcon className="h-5 w-5" />,
      href: "/requests"
    }
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 z-40 w-full border-t bg-background md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-4">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={cn(
              "flex flex-col items-center justify-center py-2",
              location.pathname === item.href
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <span className="relative">
              {item.icon}
              {item.notification}
            </span>
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavigation;
