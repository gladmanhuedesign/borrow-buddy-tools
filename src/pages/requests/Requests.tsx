
import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToolRequest } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Inbox, SendHorizonal } from "lucide-react";

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

const Requests = () => {
  const navigate = useNavigate();
  const [incomingRequests, setIncomingRequests] = useState<any[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This will be replaced with actual data fetching
    const fetchRequests = async () => {
      try {
        // Mock data for now
        setIncomingRequests([]);
        setOutgoingRequests([]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching requests:", error);
        setLoading(false);
      }
    };
    
    fetchRequests();
  }, []);

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
          ) : outgoingRequests.length === 0 ? (
            renderEmptyState("outgoing")
          ) : (
            <div className="space-y-4">
              {outgoingRequests.map((request) => (
                <Link key={request.id} to={`/requests/${request.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="line-clamp-1">{request.toolName}</CardTitle>
                          <CardDescription className="line-clamp-1">
                            Requested from {request.ownerName}
                          </CardDescription>
                        </div>
                        <RequestStatusBadge status={request.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Requested on {new Date(request.requestedAt).toLocaleDateString()}
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
          ) : incomingRequests.length === 0 ? (
            renderEmptyState("incoming")
          ) : (
            <div className="space-y-4">
              {incomingRequests.map((request) => (
                <Link key={request.id} to={`/requests/${request.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="line-clamp-1">{request.toolName}</CardTitle>
                          <CardDescription className="line-clamp-1">
                            Requested by {request.borrowerName}
                          </CardDescription>
                        </div>
                        <RequestStatusBadge status={request.status} />
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">
                          Requested on {new Date(request.requestedAt).toLocaleDateString()}
                        </span>
                        <div>
                          {request.status === "pending" && (
                            <>
                              <Button variant="outline" size="sm" className="mr-2">
                                Deny
                              </Button>
                              <Button size="sm">
                                Approve
                              </Button>
                            </>
                          )}
                          {request.status !== "pending" && (
                            <Button variant="ghost" size="sm">
                              View Details
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Requests;
