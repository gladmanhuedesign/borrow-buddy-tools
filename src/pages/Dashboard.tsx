
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, Users, PlusCircle, Clock } from "lucide-react";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Mock data for dashboard stats
  const stats = [
    { 
      title: "My Tools", 
      value: 0, 
      icon: <Hammer className="h-5 w-5" />,
      action: () => navigate("/tools"),
      actionText: "View Tools"
    },
    { 
      title: "My Groups", 
      value: 0, 
      icon: <Users className="h-5 w-5" />,
      action: () => navigate("/groups"),
      actionText: "View Groups" 
    },
    { 
      title: "Active Requests", 
      value: 0, 
      icon: <Clock className="h-5 w-5" />,
      action: () => navigate("/requests"),
      actionText: "View Requests" 
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Welcome, {currentUser?.displayName}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your tools and groups
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={stat.action}
              >
                {stat.actionText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <div className="flex flex-col space-y-4">
        <h2 className="text-xl font-bold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Button 
            onClick={() => navigate("/tools/add")}
            className="h-auto py-4 text-left flex items-center justify-start space-x-4"
          >
            <PlusCircle className="h-5 w-5" /> 
            <div>
              <div className="font-semibold">Add a Tool</div>
              <div className="text-xs text-muted">Share your tools with your groups</div>
            </div>
          </Button>
          
          <Button 
            onClick={() => navigate("/groups/create")}
            variant="outline"
            className="h-auto py-4 text-left flex items-center justify-start space-x-4"
          >
            <Users className="h-5 w-5" /> 
            <div>
              <div className="font-semibold">Create a Group</div>
              <div className="text-xs text-muted">Start sharing with friends or colleagues</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
