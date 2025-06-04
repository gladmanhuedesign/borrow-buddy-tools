
import { Outlet } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import MobileNavigation from "./MobileNavigation";
import TopHeader from "./TopHeader";

const Layout = () => {
  const { currentUser } = useAuth();

  return (
    <div className="min-h-screen">
      <TopHeader />
      <main className="container mx-auto pb-20 pt-6 px-4">
        <div className="animate-float">
          <Outlet />
        </div>
      </main>
      <MobileNavigation />
    </div>
  );
};

export default Layout;
