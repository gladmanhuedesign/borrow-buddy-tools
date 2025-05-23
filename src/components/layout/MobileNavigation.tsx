
import { Link, useLocation } from "react-router-dom";
import { Home, Hammer, UsersRound, InboxIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const MobileNavigation = () => {
  const location = useLocation();
  
  const navItems = [
    {
      label: "Home",
      icon: <Home className="h-5 w-5" />,
      href: "/dashboard"
    },
    {
      label: "Tools",
      icon: <Hammer className="h-5 w-5" />,
      href: "/tools"
    },
    {
      label: "Groups",
      icon: <UsersRound className="h-5 w-5" />,
      href: "/groups"
    },
    {
      label: "Requests",
      icon: <InboxIcon className="h-5 w-5" />,
      href: "/requests"
    }
  ];
  
  return (
    <nav className="fixed bottom-0 left-0 z-40 w-full border-t bg-background md:hidden">
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
            {item.icon}
            <span className="text-xs">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default MobileNavigation;
