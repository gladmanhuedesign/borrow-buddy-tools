
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format, isPast } from "date-fns";
import { useNavigate } from "react-router-dom";
import { toolPowerSourceLabels } from "@/config/toolCategories";
import { Zap } from "lucide-react";

const getStatusColor = (status: string, isOverdue: boolean) => {
  if (isOverdue) return "bg-red-100 text-red-800 border-red-200";
  switch (status) {
    case "approved": return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "picked_up": return "bg-green-100 text-green-800 border-green-200";
    case "return_pending": return "bg-blue-100 text-blue-800 border-blue-200";
    default: return "bg-gray-100 text-gray-800 border-gray-200";
  }
};

const getAvatarColor = (name: string) => {
  const colors = [
    "bg-red-500", "bg-blue-500", "bg-green-500", "bg-yellow-500", 
    "bg-purple-500", "bg-pink-500", "bg-indigo-500", "bg-orange-500"
  ];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export const ActiveBorrowingList = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: borrowedTools = [], refetch } = useQuery({
    queryKey: ['activeBorrowing', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const { data, error } = await supabase
        .from('tool_requests')
        .select(`
          id,
          status,
          start_date,
          end_date,
          picked_up_at,
          tools (
            id,
            name,
            description,
            image_url,
            brand,
            power_source,
            profiles (
              display_name
            )
          )
        `)
        .eq('requester_id', currentUser.id)
        .in('status', ['approved', 'picked_up', 'return_pending', 'overdue']);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser
  });

  const handleConfirmPickup = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase
        .from('tool_requests')
        .update({ 
          status: 'picked_up',
          picked_up_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: "Pickup confirmed",
        description: "You have confirmed picking up the tool.",
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleInitiateReturn = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase
        .from('tool_requests')
        .update({ status: 'return_pending' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: "Return initiated",
        description: "You have initiated the return process. Waiting for owner confirmation.",
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (borrowedTools.length === 0) {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle>Active Borrowing</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You're not currently borrowing any tools.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle>Active Borrowing ({borrowedTools.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {borrowedTools.map((request) => {
          const isOverdue = isPast(new Date(request.end_date));
          const tool = request.tools;
          
          return (
            <div 
              key={request.id} 
              onClick={() => navigate(`/tools/${tool.id}`)}
              className="p-4 border rounded-lg hover:bg-accent/50 transition-colors duration-200 cursor-pointer"
            >
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={tool.image_url || ''} alt={tool.name} />
                    <AvatarFallback className={`${getAvatarColor(tool.name)} text-white font-semibold`}>
                      {tool.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{tool.name}</h4>
                      {isOverdue ? (
                        <Badge variant="destructive">Overdue</Badge>
                      ) : (
                        <Badge className={getStatusColor(request.status, false)}>
                          {request.status.replace('_', ' ')}
                        </Badge>
                      )}
                    </div>
                    {(tool.brand || tool.power_source) && (
                      <div className="flex gap-2 mb-1 text-xs text-muted-foreground">
                        {tool.brand && <span className="font-medium">{tool.brand}</span>}
                        {tool.power_source && (
                          <span className="flex items-center gap-1">
                            <Zap className="h-3 w-3" />
                            {toolPowerSourceLabels[tool.power_source as keyof typeof toolPowerSourceLabels]}
                          </span>
                        )}
                      </div>
                    )}
                    <p className="text-sm text-muted-foreground mb-1">
                      From: {tool.profiles?.display_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(request.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {request.status === 'approved' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmPickup(request.id);
                      }}
                      disabled={processingId === request.id}
                      className="hover:scale-105 transition-transform duration-200"
                    >
                      Confirm Pickup
                    </Button>
                  )}
                  
                  {request.status === 'picked_up' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInitiateReturn(request.id);
                      }}
                      disabled={processingId === request.id}
                      className="hover:scale-105 transition-transform duration-200"
                    >
                      Initiate Return
                    </Button>
                  )}
                  
                  {request.status === 'return_pending' && (
                    <Button size="sm" variant="outline" disabled>
                      Waiting for Confirmation
                    </Button>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
