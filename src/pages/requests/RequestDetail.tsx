import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToolRequest } from "@/types";
import { ArrowLeft, Send, CheckCircle, XCircle, Loader2, RotateCcw, Package, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

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

interface RequestDetail {
  id: string;
  status: ToolRequest["status"];
  start_date: string;
  end_date: string;
  message: string | null;
  created_at: string;
  updated_at: string;
  picked_up_at: string | null;
  returned_at: string | null;
  return_notes: string | null;
  tools: {
    id: string;
    name: string;
    description: string | null;
    image_url: string | null;
    brand: string | null;
    condition: string | null;
    status: string;
    owner_id: string;
    category_id: string | null;
    tool_categories: {
      name: string;
    } | null;
    profiles: {
      display_name: string;
    } | null;
  } | null;
  profiles: {
    display_name: string;
  } | null;
}

interface Message {
  id: string;
  request_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  is_read: boolean;
  profiles: {
    display_name: string;
  } | null;
}

const RequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [request, setRequest] = useState<RequestDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [returnNotes, setReturnNotes] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    if (!currentUser || !id) return;

    const fetchRequestDetails = async () => {
      try {
        console.log("Fetching request details for:", id);
        
        // Fetch request details
        const { data: requestData, error: requestError } = await supabase
          .from('tool_requests')
          .select(`
            id,
            status,
            start_date,
            end_date,
            message,
            created_at,
            updated_at,
            picked_up_at,
            returned_at,
            return_notes,
            tools (
              id,
              name,
              description,
              image_url,
              brand,
              condition,
              status,
              owner_id,
              category_id,
              tool_categories (
                name
              ),
              profiles:owner_id (
                display_name
              )
            ),
            profiles:requester_id (
              display_name
            )
          `)
          .eq('id', id)
          .single();

        if (requestError) {
          console.error("Error fetching request:", requestError);
          throw requestError;
        }

        console.log("Request data:", requestData);
        setRequest(requestData as RequestDetail);
        
        // Check if current user is the tool owner
        if (requestData?.tools?.owner_id === currentUser.id) {
          setIsOwner(true);
        }
        
        // Fetch messages
        const { data: messagesData, error: messagesError } = await supabase
          .from("request_messages")
          .select(`
            id,
            request_id,
            sender_id,
            content,
            created_at,
            is_read
          `)
          .eq("request_id", id)
          .order("created_at", { ascending: true });

        if (messagesError) {
          console.error("Error fetching messages:", messagesError);
        } else if (messagesData) {
          // Fetch profiles for all senders
          const senderIds = [...new Set(messagesData.map(m => m.sender_id))];
          const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, display_name")
            .in("id", senderIds);

          const profilesMap = new Map(profilesData?.map(p => [p.id, p]) || []);
          
          const messagesWithProfiles = messagesData.map(msg => ({
            ...msg,
            profiles: profilesMap.get(msg.sender_id) || null
          }));
          
          setMessages(messagesWithProfiles as Message[]);
          
          // Mark unread messages from other party as read
          const unreadMessageIds = messagesWithProfiles
            .filter(msg => msg.sender_id !== currentUser.id && !msg.is_read)
            .map(msg => msg.id);
          
          if (unreadMessageIds.length > 0) {
            await supabase
              .from('request_messages')
              .update({ is_read: true })
              .in('id', unreadMessageIds);
          }
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching request details:", error);
        toast({
          title: "Error",
          description: "Failed to load request details.",
          variant: "destructive",
        });
        navigate("/requests");
      }
    };
    
    fetchRequestDetails();

    // Subscribe to new messages via real-time
    const channel = supabase
      .channel(`request-messages-${id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "request_messages",
          filter: `request_id=eq.${id}`,
        },
        async (payload) => {
          // Fetch sender profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("display_name")
            .eq("id", payload.new.sender_id)
            .single();

          const newMessage = {
            ...payload.new,
            profiles: profile,
          } as Message;

          setMessages((prev) => [...prev, newMessage]);
          
          // Mark as read if it's from the other party
          if (payload.new.sender_id !== currentUser?.id) {
            await supabase
              .from('request_messages')
              .update({ is_read: true })
              .eq('id', payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, currentUser, navigate]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !request || !currentUser) return;
    
    try {
      setSendingMessage(true);
      console.log("Sending message:", messageText);
      
      const { error } = await supabase
        .from("request_messages")
        .insert({
          request_id: request.id,
          sender_id: currentUser.id,
          content: messageText.trim(),
        });

      if (error) throw error;

      // Message will be added via real-time subscription
      setMessageText("");
    } catch (error) {
      console.error("Error sending message:", error);
      toast({
        title: "Failed to send message",
        description: "An error occurred while sending your message.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleStatusUpdate = async (newStatus: ToolRequest["status"], notes?: string) => {
    if (!request || !currentUser) return;
    
    try {
      setProcessingAction(true);
      console.log(`Updating request ${request.id} status to:`, newStatus);
      
      const updateData: any = { 
        status: newStatus,
        updated_at: new Date().toISOString()
      };
      
      if (notes && newStatus === 'returned') {
        updateData.return_notes = notes;
      }

      const { error } = await supabase
        .from('tool_requests')
        .update(updateData)
        .eq('id', request.id);

      if (error) throw error;
      
      // Update local state
      setRequest({ ...request, status: newStatus, return_notes: notes || request.return_notes });
      
      const statusMessages = {
        approved: "Request approved successfully.",
        denied: "Request denied.",
        picked_up: "Tool pickup confirmed.",
        return_pending: "Return initiation confirmed.",
        returned: "Tool return confirmed.",
        canceled: "Request canceled."
      };
      
      toast({
        title: `Request ${newStatus.replace('_', ' ')}`,
        description: statusMessages[newStatus] || `Request status updated to ${newStatus}.`,
      });
      
    } catch (error) {
      console.error(`Error updating request status:`, error);
      toast({
        title: "Error",
        description: `Failed to ${newStatus} request.`,
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleReturnWithNotes = async () => {
    await handleStatusUpdate('returned', returnNotes);
    setReturnNotes("");
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-bold">Request not found</h2>
        <p className="mt-2 text-muted-foreground">
          The request you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => navigate("/requests")} className="mt-4">
          Back to Requests
        </Button>
      </div>
    );
  }

  const isRequester = request.profiles && currentUser?.id !== request.tools?.owner_id;

  const getActionButtons = () => {
    if (isOwner) {
      switch (request.status) {
        case "pending":
          return (
            <>
              <Button
                variant="outline"
                onClick={() => handleStatusUpdate("denied")}
                disabled={processingAction}
                className="flex-1"
              >
                {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="mr-2 h-4 w-4" /> Deny</>}
              </Button>
              <Button 
                onClick={() => handleStatusUpdate("approved")}
                disabled={processingAction}
                className="flex-1"
              >
                {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="mr-2 h-4 w-4" /> Approve</>}
              </Button>
            </>
          );
        case "approved":
          return (
            <Button 
              onClick={() => handleStatusUpdate("picked_up")}
              disabled={processingAction}
              className="flex-1"
            >
              {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Package className="mr-2 h-4 w-4" /> Confirm Pickup</>}
            </Button>
          );
        case "return_pending":
          return (
            <div className="space-y-2 w-full">
              <Textarea
                value={returnNotes}
                onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Optional return notes (condition, issues, etc.)"
                rows={2}
              />
              <Button 
                onClick={handleReturnWithNotes}
                disabled={processingAction}
                className="w-full"
              >
                {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><PackageCheck className="mr-2 h-4 w-4" /> Confirm Return</>}
              </Button>
            </div>
          );
      }
    }
    
    if (isRequester) {
      switch (request.status) {
        case "pending":
          return (
            <Button 
              variant="outline"
              onClick={() => handleStatusUpdate("canceled")}
              disabled={processingAction}
              className="flex-1"
            >
              {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><XCircle className="mr-2 h-4 w-4" /> Cancel Request</>}
            </Button>
          );
        case "picked_up":
        case "overdue":
          return (
            <Button 
              onClick={() => handleStatusUpdate("return_pending")}
              disabled={processingAction}
              className="flex-1"
            >
              {processingAction ? <Loader2 className="h-4 w-4 animate-spin" /> : <><RotateCcw className="mr-2 h-4 w-4" /> Initiate Return</>}
            </Button>
          );
      }
    }
    
    return null;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/requests")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-xl font-semibold">Tool Request: {request.tools?.name}</h1>
        <RequestStatusBadge status={request.status} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Request Details</CardTitle>
              <CardDescription>
                {isOwner 
                  ? `${request.profiles?.display_name} wants to borrow your ${request.tools?.name}`
                  : `You requested to borrow ${request.tools?.name} from ${request.tools?.profiles?.display_name}`}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Start Date</h4>
                    <p>{new Date(request.start_date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">End Date</h4>
                    <p>{new Date(request.end_date).toLocaleDateString()}</p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Request Date</h4>
                  <p>{formatDistanceToNow(new Date(request.created_at), { addSuffix: true })}</p>
                </div>

                {request.picked_up_at && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Picked Up</h4>
                    <p className="text-green-600">{new Date(request.picked_up_at).toLocaleDateString()}</p>
                  </div>
                )}

                {request.returned_at && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Returned</h4>
                    <p className="text-blue-600">{new Date(request.returned_at).toLocaleDateString()}</p>
                  </div>
                )}

                {request.return_notes && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Return Notes</h4>
                    <p className="text-sm">{request.return_notes}</p>
                  </div>
                )}
                
                {request.message && (
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Message</h4>
                    <p className="text-sm">{request.message}</p>
                  </div>
                )}
                
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">Tool Status</h4>
                  <Badge variant="outline">{request.tools?.status}</Badge>
                </div>
                
                {/* Action buttons based on user role and request status */}
                <div className="flex space-x-2 pt-4 border-t">
                  {getActionButtons()}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Communicate about this request</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4 h-[300px] overflow-y-auto flex flex-col space-y-4">
                  {messages.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center text-muted-foreground">
                      No messages yet. Start the conversation!
                    </div>
                  ) : (
                    messages.map((message) => (
                      <div
                        key={message.id}
                        className={`rounded-lg p-3 max-w-[80%] ${
                          message.sender_id === currentUser?.id
                            ? "bg-primary text-primary-foreground self-end"
                            : "bg-muted self-start"
                        }`}
                      >
                        <div className="text-xs mb-1 opacity-70">
                          {message.sender_id === currentUser?.id ? "You" : message.profiles?.display_name}
                        </div>
                        <div>{message.content}</div>
                        <div className="text-xs mt-1 opacity-70 text-right">
                          {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Textarea
                    value={messageText}
                    onChange={(e) => setMessageText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message here..."
                    className="flex-1 min-h-[40px] max-h-[200px] resize-none"
                    rows={1}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={!messageText.trim() || sendingMessage}
                    className="self-end"
                  >
                    {sendingMessage ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tool Information Sidebar */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle>Tool Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.tools?.image_url && (
                <div className="aspect-square rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={request.tools.image_url} 
                    alt={request.tools.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}
              
              <div>
                <h3 className="font-semibold text-lg">{request.tools?.name}</h3>
              </div>

              {request.tools?.brand && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Brand</h4>
                  <p className="text-sm font-medium">{request.tools.brand}</p>
                </div>
              )}

              {request.tools?.tool_categories && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Category</h4>
                  <Badge variant="secondary">{request.tools.tool_categories.name}</Badge>
                </div>
              )}

              {request.tools?.condition && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Condition</h4>
                  <Badge variant="outline" className="capitalize">{request.tools.condition}</Badge>
                </div>
              )}

              {request.tools?.description && (
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground mb-1">Description</h4>
                  <p className="text-sm">{request.tools.description}</p>
                </div>
              )}

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Owner</h4>
                <p className="text-sm font-medium">{request.tools?.profiles?.display_name}</p>
              </div>

              <div>
                <h4 className="font-medium text-sm text-muted-foreground mb-1">Current Status</h4>
                <Badge variant="outline">{request.tools?.status}</Badge>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => navigate(`/tools/${request.tools?.id}`)}
              >
                View Full Tool Details
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;
