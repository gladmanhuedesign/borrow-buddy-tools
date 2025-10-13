import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToolRequest } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, SendHorizonal, RefreshCw } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const RequestStatusBadge = ({ status }: { status: ToolRequest["status"] }) => {
  const variants: Record<ToolRequest["status"], { variant: "default" | "outline" | "secondary" | "destructive"; label: string }> = {
    pending: { variant: "secondary", label: "Pending" },
    approved: { variant: "outline", label: "Approved" },
    picked_up: { variant: "default", label: "Picked Up" },
    return_pending: { variant: "secondary", label: "Return Pending" },
    denied: { variant: "destructive", label: "Denied" },
    returned: { variant: "default", label: "Returned" },
    canceled: { variant: "destructive", label: "Canceled" },
    overdue: { variant: "destructive", label: "Overdue" }
  };
  
  const { variant, label } = variants[status] || { variant: "secondary", label: status };
  
  return <Badge variant={variant}>{label}</Badge>;
};

interface RequestWithDetails {
  id: string;
  status: ToolRequest["status"];
  start_date: string;
  end_date: string;
  message: string | null;
  created_at: string;
  picked_up_at: string | null;
  returned_at: string | null;
  return_notes: string | null;
  tools: {
    id: string;
    name: string;
    owner_id: string;
    status: string;
    profiles: {
      display_name: string;
    } | null;
  } | null;
  profiles: {
    display_name: string;
  } | null;
}

const Requests = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [sentRequests, setSentRequests] = useState<RequestWithDetails[]>([]);
  const [receivedRequests, setReceivedRequests] = useState<RequestWithDetails[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRequests = async () => {
    if (!currentUser) return;

    try {
      console.log("Fetching requests for user:", currentUser.id);

      // First, run the overdue check
      await supabase.rpc('mark_overdue_requests');

      // Fetch requests sent by the current user
      const { data: sentData, error: sentError } = await supabase
        .from('tool_requests')
        .select(`
          id,
          status,
          start_date,
          end_date,
          message,
          created_at,
          picked_up_at,
          returned_at,
          return_notes,
          tools (
            id,
            name,
            owner_id,
            status,
            profiles:owner_id (
              display_name
            )
          )
        `)
        .eq('requester_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (sentError) {
        console.error("Error fetching sent requests:", sentError);
        throw sentError;
      }

      console.log("Sent requests data:", sentData);
      const transformedSentData = (sentData || []).map(request => ({
        ...request,
        status: request.status as ToolRequest["status"],
        profiles: null
      }));
      setSentRequests(transformedSentData);

      // Fetch requests received by the current user (requests for their tools)
      const { data: receivedData, error: receivedError } = await supabase
        .from('tool_requests')
        .select(`
          id,
          status,
          start_date,
          end_date,
          message,
          created_at,
          picked_up_at,
          returned_at,
          return_notes,
          requester_id,
          tools!inner (
            id,
            name,
            owner_id,
            status
          ),
          profiles:requester_id (
            display_name
          )
        `)
        .eq('tools.owner_id', currentUser.id)
        .order('created_at', { ascending: false });

      if (receivedError) {
        console.error("Error fetching received requests:", receivedError);
        throw receivedError;
      }

      console.log("Received requests data:", receivedData);
      const transformedReceivedData = (receivedData || []).map(request => ({
        ...request,
        status: request.status as ToolRequest["status"],
        tools: request.tools ? {
          ...request.tools,
          profiles: null
        } : null
      }));
      setReceivedRequests(transformedReceivedData);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching requests:", error);
      toast({
        title: "Error",
        description: "Failed to load requests.",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [currentUser]);

  const handleQuickAction = async (requestId: string, action: 'approve' | 'deny' | 'confirm_pickup' | 'confirm_return') => {
    try {
      let updateData: any = { updated_at: new Date().toISOString() };
      
      switch (action) {
        case 'approve':
          updateData.status = 'approved';
          break;
        case 'deny':
          updateData.status = 'denied';
          break;
        case 'confirm_pickup':
          updateData.status = 'picked_up';
          break;
        case 'confirm_return':
          updateData.status = 'returned';
          break;
      }

      const { error } = await supabase
        .from('tool_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setReceivedRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, status: updateData.status as ToolRequest["status"] } : req
        )
      );

      const actionLabels = {
        approve: 'approved',
        deny: 'denied',
        confirm_pickup: 'pickup confirmed',
        confirm_return: 'return confirmed'
      };

      toast({
        title: `Request ${actionLabels[action]}`,
        description: `The request has been ${actionLabels[action]}.`,
      });
    } catch (error) {
      console.error(`Error ${action}ing request:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} request.`,
        variant: "destructive",
      });
    }
  };

  const renderEmptyState = (type: "incoming" | "outgoing") => (
    <Card className="border-dashed">
      <CardHeader>
        <CardTitle className="text-center">No {type === "incoming" ? "Incoming" : "Outgoing"} Requests</CardTitle>
        <CardDescription className="text-center">
          {type === "incoming"
            ? "You haven't received any tool requests yet."
            : "You haven't requested any tools yet."}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex justify-center pb-6">
        {type === "outgoing" && (
          <Button onClick={() => navigate("/tools")}>
            Browse Available Tools
          </Button>
        )}
      </CardContent>
    </Card>
  );

  const getStatusColor = (status: ToolRequest["status"]) => {
    switch (status) {
      case 'pending': return 'text-yellow-600';
      case 'approved': return 'text-green-600';
      case 'picked_up': return 'text-blue-600';
      case 'return_pending': return 'text-orange-600';
      case 'denied': return 'text-red-600';
      case 'returned': return 'text-blue-600';
      case 'canceled': return 'text-gray-600';
      case 'overdue': return 'text-red-800';
      default: return 'text-gray-600';
    }
  };

  const getQuickActions = (request: RequestWithDetails) => {
    if (request.status === "pending") {
      return (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={(e) => {
              e.preventDefault();
              handleQuickAction(request.id, 'deny');
            }}
          >
            Deny
          </Button>
          <Button 
            size="sm"
            onClick={(e) => {
              e.preventDefault();
              handleQuickAction(request.id, 'approve');
            }}
          >
            Approve
          </Button>
        </>
      );
    }
    
    if (request.status === "approved") {
      return (
        <Button 
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            handleQuickAction(request.id, 'confirm_pickup');
          }}
        >
          Confirm Pickup
        </Button>
      );
    }
    
    if (request.status === "return_pending") {
      return (
        <Button 
          size="sm"
          onClick={(e) => {
            e.preventDefault();
            handleQuickAction(request.id, 'confirm_return');
          }}
        >
          Confirm Return
        </Button>
      );
    }
    
    return (
      <Link to={`/requests/${request.id}`}>
        <Button variant="ghost" size="sm">
          View Details
        </Button>
      </Link>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tool Requests</h1>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={fetchRequests}
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <Tabs defaultValue="outgoing" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="outgoing" className="flex gap-2 items-center">
            <SendHorizonal className="h-4 w-4" /> 
            Sent by Me ({sentRequests.length})
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex gap-2 items-center">
            <Inbox className="h-4 w-4" /> 
            Received ({receivedRequests.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="outgoing" className="pt-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-pulse">Loading your requests...</div>
            </div>
          ) : sentRequests.length === 0 ? (
            renderEmptyState("outgoing")
          ) : (
            <div className="space-y-6">
              {sentRequests.map((request) => (
                <Link key={request.id} to={`/requests/${request.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="line-clamp-1">{request.tools?.name || "Unknown Tool"}</CardTitle>
                          <CardDescription className="line-clamp-1">
                            Requested from {request.tools?.profiles?.display_name || "Unknown Owner"}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <RequestStatusBadge status={request.status} />
                          <Badge variant="outline" className="text-xs">
                            Tool: {request.tools?.status}
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center text-sm">
                        <div className="space-y-1">
                          <span className="text-muted-foreground">
                            Requested on {new Date(request.created_at).toLocaleDateString()}
                          </span>
                          <div className="text-xs text-muted-foreground">
                            {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                          </div>
                          {request.picked_up_at && (
                            <div className="text-xs text-green-600">
                              Picked up: {new Date(request.picked_up_at).toLocaleDateString()}
                            </div>
                          )}
                          {request.returned_at && (
                            <div className="text-xs text-blue-600">
                              Returned: {new Date(request.returned_at).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="incoming" className="pt-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <div className="animate-pulse">Loading incoming requests...</div>
            </div>
          ) : receivedRequests.length === 0 ? (
            renderEmptyState("incoming")
          ) : (
            <div className="space-y-6">
              {receivedRequests.map((request) => (
                <Card key={request.id} className="transition-shadow hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="line-clamp-1">{request.tools?.name || "Unknown Tool"}</CardTitle>
                        <CardDescription className="line-clamp-1">
                          Requested by {request.profiles?.display_name || "Unknown User"}
                        </CardDescription>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <RequestStatusBadge status={request.status} />
                        <Badge variant="outline" className="text-xs">
                          Tool: {request.tools?.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm">
                      <div className="space-y-1">
                        <span className="text-muted-foreground">
                          Requested on {new Date(request.created_at).toLocaleDateString()}
                        </span>
                        <div className="text-xs text-muted-foreground">
                          {new Date(request.start_date).toLocaleDateString()} - {new Date(request.end_date).toLocaleDateString()}
                        </div>
                        {request.picked_up_at && (
                          <div className="text-xs text-green-600">
                            Picked up: {new Date(request.picked_up_at).toLocaleDateString()}
                          </div>
                        )}
                        {request.returned_at && (
                          <div className="text-xs text-blue-600">
                            Returned: {new Date(request.returned_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        {getQuickActions(request)}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Requests;
