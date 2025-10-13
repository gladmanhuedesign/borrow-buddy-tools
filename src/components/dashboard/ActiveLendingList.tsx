
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
import { Zap, MessageCircle } from "lucide-react";

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

export const ActiveLendingList = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: lentTools = [], refetch } = useQuery({
    queryKey: ['activeLending', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('id')
        .eq('owner_id', currentUser.id);
      
      if (toolsError) throw toolsError;
      if (!tools || tools.length === 0) return [];
      
      const toolIds = tools.map(tool => tool.id);
      
      const { data, error } = await supabase
        .from('tool_requests')
        .select(`
          id,
          status,
          start_date,
          end_date,
          picked_up_at,
          requester_id,
          tools!inner (
            id,
            name,
            description,
            image_url,
            brand,
            power_source
          ),
          profiles!tool_requests_requester_id_fkey (
            display_name
          )
        `)
        .in('tool_id', toolIds)
        .in('status', ['approved', 'picked_up', 'return_pending', 'overdue']);
      
      if (error) throw error;
      
      // Fetch unread message counts for each request
      const requestsWithMessages = await Promise.all((data || []).map(async (request) => {
        const { count } = await supabase
          .from('request_messages')
          .select('*', { count: 'exact', head: true })
          .eq('request_id', request.id)
          .eq('is_read', false)
          .neq('sender_id', currentUser.id);
        
        return {
          ...request,
          unread_count: count || 0
        };
      }));
      
      return requestsWithMessages;
    },
    enabled: !!currentUser
  });

  const handleConfirmReturn = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase
        .from('tool_requests')
        .update({ 
          status: 'returned',
          returned_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: "Return confirmed",
        description: "You have confirmed the tool return.",
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

  if (lentTools.length === 0) {
    return (
      <Card className="hover:shadow-md transition-shadow duration-200">
        <CardHeader>
          <CardTitle>Active Lending</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">You're not currently lending any tools.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <CardTitle>Active Lending ({lentTools.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lentTools.map((request) => {
          const isOverdue = isPast(new Date(request.end_date));
          const tool = request.tools;
          
          return (
            <div 
              key={request.id} 
              onClick={() => navigate(`/requests/${request.id}`)}
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
                      {request.unread_count > 0 && (
                        <Badge variant="default" className="ml-auto flex items-center gap-1">
                          <MessageCircle className="h-3 w-3" />
                          {request.unread_count}
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
                      To: {request.profiles?.display_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(request.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  {request.status === 'return_pending' && (
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleConfirmReturn(request.id);
                      }}
                      disabled={processingId === request.id}
                      className="hover:scale-105 transition-transform duration-200"
                    >
                      Confirm Return
                    </Button>
                  )}
                  
                  {request.status === 'picked_up' && (
                    <Button size="sm" variant="outline" disabled>
                      In Use
                    </Button>
                  )}
                  
                  {request.status === 'approved' && (
                    <Button size="sm" variant="outline" disabled>
                      Waiting for Pickup
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
