
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToolRequest } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, SendHorizonal } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const RequestStatusBadge = ({ status }: { status: ToolRequest["status"] }) => {
  const variants: Record<ToolRequest["status"], { variant: "default" | "outline" | "secondary" | "destructive"; label: string }> = {
    pending: { variant: "secondary", label: "Pending" },
    approved: { variant: "outline", label: "Approved" },
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
  tools: {
    id: string;
    name: string;
    owner_id: string;
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

  useEffect(() => {
    if (!currentUser) return;

    const fetchRequests = async () => {
      try {
        console.log("Fetching requests for user:", currentUser.id);

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
            tools (
              id,
              name,
              owner_id,
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
        setSentRequests(sentData || []);

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
            requester_id,
            tools!inner (
              id,
              name,
              owner_id
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
        setReceivedRequests(receivedData || []);
        
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
    
    fetchRequests();
  }, [currentUser]);

  const handleApprove = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('tool_requests')
        .update({ status: 'approved' })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setReceivedRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, status: 'approved' as ToolRequest["status"] } : req
        )
      );

      toast({
        title: "Request approved",
        description: "The request has been approved.",
      });
    } catch (error) {
      console.error("Error approving request:", error);
      toast({
        title: "Error",
        description: "Failed to approve request.",
        variant: "destructive",
      });
    }
  };

  const handleDeny = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('tool_requests')
        .update({ status: 'denied' })
        .eq('id', requestId);

      if (error) throw error;

      // Update local state
      setReceivedRequests(prev => 
        prev.map(req => 
          req.id === requestId ? { ...req, status: 'denied' as ToolRequest["status"] } : req
        )
      );

      toast({
        title: "Request denied",
        description: "The request has been denied.",
      });
    } catch (error) {
      console.error("Error denying request:", error);
      toast({
        title: "Error",
        description: "Failed to deny request.",
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Tool Requests</h1>

      <Tabs defaultValue="outgoing" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="outgoing" className="flex gap-2 items-center">
            <SendHorizonal className="h-4 w-4" /> Sent by Me
          </TabsTrigger>
          <TabsTrigger value="incoming" className="flex gap-2 items-center">
            <Inbox className="h-4 w-4" /> Received
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
            <div className="space-y-4">
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
                        <RequestStatusBadge status={request.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Requested on {new Date(request.created_at).toLocaleDateString()}
                        </span>
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
            <div className="space-y-4">
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
                      <RequestStatusBadge status={request.status} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">
                        Requested on {new Date(request.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex gap-2">
                        {request.status === "pending" ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={(e) => {
                                e.preventDefault();
                                handleDeny(request.id);
                              }}
                            >
                              Deny
                            </Button>
                            <Button 
                              size="sm"
                              onClick={(e) => {
                                e.preventDefault();
                                handleApprove(request.id);
                              }}
                            >
                              Approve
                            </Button>
                          </>
                        ) : (
                          <Link to={`/requests/${request.id}`}>
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          </Link>
                        )}
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
