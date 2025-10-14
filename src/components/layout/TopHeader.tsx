import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { 
  Wrench, 
  Menu,
  User,
  Settings,
  HelpCircle,
  LogOut
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NotificationDropdown } from "@/components/notifications/NotificationDropdown";
import { SearchInput } from "@/components/search/SearchInput";

const TopHeader = () => {
  const { currentUser, logout, isAuthenticated } = useAuth();

  // Non-logged in header
  if (!isAuthenticated) {
    return (
      <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)]">
        <div className="w-full flex py-3.5 items-center justify-between sm:px-4 gap-1 sm:gap-2">
          <Link to="/" className="flex items-center gap-1.5 sm:gap-2 font-bold flex-shrink-0 text-sm sm:text-base">
            <Wrench className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="whitespace-nowrap">Borrow Buddy</span>
          </Link>
          
          <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" className="h-8 px-1.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap" asChild>
              <Link to="/login">Sign In</Link>
            </Button>
            <Button size="sm" className="h-8 px-1.5 sm:px-3 text-xs sm:text-sm whitespace-nowrap" asChild>
              <Link to="/register">Sign Up</Link>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // Logged in header
  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur pt-[env(safe-area-inset-top)]">
      <div className="w-full flex py-3.5 items-center justify-between sm:px-4">
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="flex items-center gap-2 font-bold">
            <Wrench className="h-5 w-5" />
            <span>Borrow Buddy</span>
          </Link>
          
          <nav className="hidden md:flex items-center gap-4">
            <Button variant="ghost" asChild>
              <Link to="/dashboard">Dashboard</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/tools">My Tools</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/groups">Groups</Link>
            </Button>
            <Button variant="ghost" asChild>
              <Link to="/requests">Requests</Link>
            </Button>
          </nav>
        </div>
        
        <div className="hidden md:flex items-center gap-4 flex-1 justify-center max-w-md">
          <SearchInput />
        </div>
        
        <div className="hidden md:flex items-center gap-2">
          <NotificationDropdown />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <User className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUser?.displayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help" className="flex items-center">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        
        {/* Mobile header actions */}
        <div className="flex md:hidden items-center gap-2">
          <NotificationDropdown />
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-background">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUser?.displayName}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser?.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/help" className="flex items-center">
                  <HelpCircle className="mr-2 h-4 w-4" />
                  <span>Help</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default TopHeader;
