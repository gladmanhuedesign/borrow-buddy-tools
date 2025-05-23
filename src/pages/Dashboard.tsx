
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, Users, PlusCircle, Clock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  // Fetch tools count
  const { data: toolsCount = 0 } = useQuery({
    queryKey: ['toolsCount', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      const { count, error } = await supabase
        .from('tools')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', currentUser.id);
      
      if (error) {
        console.error('Error fetching tools count:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!currentUser
  });

  // Fetch groups count
  const { data: groupsCount = 0 } = useQuery({
    queryKey: ['groupsCount', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      const { count, error } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      
      if (error) {
        console.error('Error fetching groups count:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!currentUser
  });

  // Fetch active requests count
  const { data: requestsCount = 0 } = useQuery({
    queryKey: ['requestsCount', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      const { count, error } = await supabase
        .from('tool_requests')
        .select('id', { count: 'exact', head: true })
        .or(`requester_id.eq.${currentUser.id},tool.owner_id.eq.${currentUser.id}`)
        .in('status', ['pending', 'approved']);
      
      if (error) {
        console.error('Error fetching requests count:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!currentUser
  });

  const stats = [
    { 
      title: "My Tools", 
      value: toolsCount, 
      icon: <Hammer className="h-5 w-5" />,
      action: () => navigate("/tools"),
      actionText: "View Tools"
    },
    { 
      title: "My Groups", 
      value: groupsCount, 
      icon: <Users className="h-5 w-5" />,
      action: () => navigate("/groups"),
      actionText: "View Groups" 
    },
    { 
      title: "Active Requests", 
      value: requestsCount, 
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
