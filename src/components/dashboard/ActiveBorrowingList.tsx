
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

export const ActiveBorrowingList = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
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
            profiles (
              display_name
            )
          )
        `)
        .eq('requester_id', currentUser.id)
        .in('status', ['approved', 'picked_up', 'return_pending']);
      
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
      <Card>
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
    <Card>
      <CardHeader>
        <CardTitle>Active Borrowing ({borrowedTools.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {borrowedTools.map((request) => {
          const isOverdue = isPast(new Date(request.end_date));
          const tool = request.tools;
          
          return (
            <div key={request.id} className="p-4 border rounded-lg">
              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <Avatar className="h-12 w-12 flex-shrink-0">
                    <AvatarImage src={tool.image_url || ''} alt={tool.name} />
                    <AvatarFallback>{tool.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium truncate">{tool.name}</h4>
                      {isOverdue && <Badge variant="destructive">Overdue</Badge>}
                      <Badge variant="outline">{request.status}</Badge>
                    </div>
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
                      onClick={() => handleConfirmPickup(request.id)}
                      disabled={processingId === request.id}
                    >
                      Confirm Pickup
                    </Button>
                  )}
                  
                  {request.status === 'picked_up' && (
                    <Button
                      size="sm"
                      onClick={() => handleInitiateReturn(request.id)}
                      disabled={processingId === request.id}
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
