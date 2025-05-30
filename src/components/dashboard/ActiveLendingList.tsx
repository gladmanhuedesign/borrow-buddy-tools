
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format, isPast } from "date-fns";
import { useNavigate } from "react-router-dom";

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
          tools (
            id,
            name,
            description
          ),
          profiles (
            display_name
          )
        `)
        .in('tool_id', toolIds)
        .in('status', ['approved', 'picked_up', 'return_pending']);
      
      if (error) throw error;
      return data || [];
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
      <Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Active Lending ({lentTools.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {lentTools.map((request) => {
          const isOverdue = isPast(new Date(request.end_date));
          const tool = request.tools;
          
          return (
            <div key={request.id} className="p-4 border rounded-lg">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{tool.name}</h4>
                      {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                      <Badge variant="outline">{request.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      To: {request.profiles?.display_name}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(request.end_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => navigate(`/tools/${tool.id}`)}
                  >
                    View History
                  </Button>
                  
                  {request.status === 'return_pending' && (
                    <Button
                      size="sm"
                      onClick={() => handleConfirmReturn(request.id)}
                      disabled={processingId === request.id}
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
