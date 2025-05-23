
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ToolRequest } from "@/types";
import { ArrowLeft, Send, CheckCircle, XCircle, Loader2 } from "lucide-react";

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

const RequestDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [request, setRequest] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [messageText, setMessageText] = useState("");
  const [sendingMessage, setSendingMessage] = useState(false);
  const [processingAction, setProcessingAction] = useState(false);

  useEffect(() => {
    // This will be replaced with actual data fetching
    const fetchRequestDetails = async () => {
      try {
        // Mock request data for demonstration
        const mockRequest = {
          id: id || "mock-id",
          toolId: "tool-123",
          toolName: "Power Drill",
          borrowerId: "user-456",
          borrowerName: "Jane Smith",
          ownerId: "user-789",
          ownerName: "John Doe",
          status: "pending" as ToolRequest["status"],
          requestedAt: new Date().toISOString(),
          notes: "I need this for a weekend project.",
        };
        
        setRequest(mockRequest);
        
        // Check if current user is the owner
        if (currentUser && mockRequest.ownerId === currentUser.id) {
          setIsOwner(true);
        }
        
        // Mock messages
        setMessages([]);
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching request details:", error);
        toast({
          title: "Error",
          description: "Failed to load request details.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    fetchRequestDetails();
  }, [id, currentUser]);

  const handleSendMessage = async () => {
    if (!messageText.trim() || !request || !currentUser) return;
    
    try {
      setSendingMessage(true);
      // This will be replaced with the actual message API call
      console.log("Sending message:", messageText);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Add message to UI
      const newMessage = {
        id: `msg-${Date.now()}`,
        requestId: request.id,
        senderId: currentUser.id,
        senderName: currentUser.displayName,
        content: messageText,
        createdAt: new Date().toISOString(),
        isRead: false,
      };
      
      setMessages([...messages, newMessage]);
      setMessageText("");
    } catch (error) {
      toast({
        title: "Failed to send message",
        description: "An error occurred while sending your message.",
        variant: "destructive",
      });
    } finally {
      setSendingMessage(false);
    }
  };

  const handleApproveRequest = async () => {
    if (!request || !currentUser || !isOwner) return;
    
    try {
      setProcessingAction(true);
      // This will be replaced with the actual API call
      console.log("Approving request:", request.id);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update request in UI
      setRequest({ ...request, status: "approved" });
      
      toast({
        title: "Request approved",
        description: "You've approved the request to borrow your tool.",
      });
    } catch (error) {
      toast({
        title: "Failed to approve request",
        description: "An error occurred while processing your action.",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  const handleDenyRequest = async () => {
    if (!request || !currentUser || !isOwner) return;
    
    try {
      setProcessingAction(true);
      // This will be replaced with the actual API call
      console.log("Denying request:", request.id);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update request in UI
      setRequest({ ...request, status: "denied" });
      
      toast({
        title: "Request denied",
        description: "You've denied the request to borrow your tool.",
      });
    } catch (error) {
      toast({
        title: "Failed to deny request",
        description: "An error occurred while processing your action.",
        variant: "destructive",
      });
    } finally {
      setProcessingAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-pulse">Loading request details...</div>
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
        <h1 className="text-xl font-semibold">Tool Request: {request.toolName}</h1>
        <RequestStatusBadge status={request.status} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Request Details</CardTitle>
          <CardDescription>
            {isOwner 
              ? `${request.borrowerName} wants to borrow your ${request.toolName}`
              : `You requested to borrow ${request.toolName} from ${request.ownerName}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium">Request Date</h3>
              <p className="text-muted-foreground">
                {new Date(request.requestedAt).toLocaleString()}
              </p>
            </div>
            
            {request.notes && (
              <div>
                <h3 className="font-medium">Notes</h3>
                <p className="text-muted-foreground">{request.notes}</p>
              </div>
            )}
            
            {isOwner && request.status === "pending" && (
              <div className="flex space-x-4 pt-4 border-t">
                <Button
                  variant="outline"
                  onClick={handleDenyRequest}
                  disabled={processingAction}
                  className="flex-1"
                >
                  {processingAction ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <XCircle className="mr-2 h-4 w-4" /> Deny
                    </>
                  )}
                </Button>
                <Button 
                  onClick={handleApproveRequest}
                  disabled={processingAction}
                  className="flex-1"
                >
                  {processingAction ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" /> Approve
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h2 className="text-xl font-semibold">Messages</h2>
        
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
                  message.senderId === currentUser?.id
                    ? "bg-primary text-primary-foreground self-end"
                    : "bg-muted self-start"
                }`}
              >
                <div className="text-xs mb-1 opacity-70">
                  {message.senderId === currentUser?.id ? "You" : message.senderName}
                </div>
                <div>{message.content}</div>
                <div className="text-xs mt-1 opacity-70 text-right">
                  {new Date(message.createdAt).toLocaleTimeString([], { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                  })}
                </div>
              </div>
            ))
          )}
        </div>
        
        <div className="flex space-x-2">
          <Textarea
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage}
            disabled={!messageText.trim() || sendingMessage}
            className="self-end"
          >
            {sendingMessage ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-4 w-4" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default RequestDetail;
