
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";

export const PendingActions = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: requestsToMe = [], refetch: refetchToMe } = useQuery({
    queryKey: ['requestsToMe', currentUser?.id],
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
          message,
          tools (
            name,
            image_url
          ),
          profiles (
            display_name
          )
        `)
        .in('tool_id', toolIds)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser
  });

  const { data: requestsFromMe = [], refetch: refetchFromMe } = useQuery({
    queryKey: ['requestsFromMe', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      const { data, error } = await supabase
        .from('tool_requests')
        .select(`
          id,
          status,
          start_date,
          end_date,
          message,
          tools (
            name,
            image_url,
            profiles (
              display_name
            )
          )
        `)
        .eq('requester_id', currentUser.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!currentUser
  });

  const handleApprove = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase
        .from('tool_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: "Request approved",
        description: "The request has been approved.",
      });
      
      refetchToMe();
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

  const handleDeny = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase
        .from('tool_requests')
        .update({ status: 'denied' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: "Request denied",
        description: "The request has been denied.",
      });
      
      refetchToMe();
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

  const handleCancel = async (requestId: string) => {
    setProcessingId(requestId);
    
    try {
      const { error } = await supabase
        .from('tool_requests')
        .update({ status: 'canceled' })
        .eq('id', requestId);
      
      if (error) throw error;
      
      toast({
        title: "Request canceled",
        description: "Your request has been canceled.",
      });
      
      refetchFromMe();
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

  const totalPending = requestsToMe.length + requestsFromMe.length;

  if (totalPending === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pending Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No pending requests.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Requests to Me */}
      {requestsToMe.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Requests to Me ({requestsToMe.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requestsToMe.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={request.tools.image_url || ''} alt={request.tools.name} />
                      <AvatarFallback>{request.tools.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium truncate">{request.tools.name}</h4>
                      <p className="text-sm text-muted-foreground mb-1">
                        From: {request.profiles?.display_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </p>
                      {request.message && (
                        <p className="text-sm text-muted-foreground mt-1">"{request.message}"</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeny(request.id)}
                      disabled={processingId === request.id}
                    >
                      Deny
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Requests from Me */}
      {requestsFromMe.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Requests I've Sent ({requestsFromMe.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {requestsFromMe.map((request) => (
              <div key={request.id} className="p-4 border rounded-lg">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-12 w-12 flex-shrink-0">
                      <AvatarImage src={request.tools.image_url || ''} alt={request.tools.name} />
                      <AvatarFallback>{request.tools.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    
                    <div className="min-w-0 flex-1">
                      <h4 className="font-medium truncate">{request.tools.name}</h4>
                      <p className="text-sm text-muted-foreground mb-1">
                        To: {request.tools.profiles?.display_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {format(new Date(request.start_date), 'MMM d')} - {format(new Date(request.end_date), 'MMM d, yyyy')}
                      </p>
                      <Badge variant="outline">Pending</Badge>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleCancel(request.id)}
                      disabled={processingId === request.id}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
