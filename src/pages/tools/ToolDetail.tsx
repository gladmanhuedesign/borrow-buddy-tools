
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tool } from "@/types";
import { defaultToolCategories, toolConditionLabels, toolStatusLabels } from "@/config/toolCategories";
import { ArrowLeft, AlertCircle, Clock, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const requestFormSchema = z.object({
  notes: z.string().optional(),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

const ToolDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      notes: "",
    },
  });

  useEffect(() => {
    // This will be replaced with actual data fetching
    const fetchToolDetails = async () => {
      try {
        // Mock data for demonstration
        const mockTool: Tool = {
          id: id || "mock-id",
          name: "Power Drill",
          description: "18V cordless drill with battery and charger",
          categoryId: "power-tools",
          condition: "good",
          status: "available",
          ownerId: "some-user-id", // Not the current user
          groupId: "sample-group-1",
          instructions: "Please charge after use",
          imageUrl: "https://via.placeholder.com/640x360?text=Power+Drill",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        
        setTool(mockTool);
        
        // Check if current user is the owner
        if (currentUser && mockTool.ownerId === currentUser.id) {
          setIsOwner(true);
        }
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching tool details:", error);
        toast({
          title: "Error",
          description: "Failed to load tool details.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    fetchToolDetails();
  }, [id, currentUser]);

  const handleRequest = async (data: RequestFormValues) => {
    if (!tool || !currentUser) return;
    
    try {
      setRequesting(true);
      // This will be replaced with the actual request API call
      console.log("Requesting tool:", tool.id, data);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Request sent",
        description: `Your request for "${tool.name}" has been sent to the owner.`,
      });
      
      setRequestDialogOpen(false);
      requestForm.reset();
      navigate("/requests");
    } catch (error) {
      toast({
        title: "Request failed",
        description: "An error occurred while sending your request.",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-pulse">Loading tool details...</div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-bold">Tool not found</h2>
        <p className="mt-2 text-muted-foreground">
          The tool you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => navigate("/tools")} className="mt-4">
          Back to Tools
        </Button>
      </div>
    );
  }

  // Find category by ID
  const category = defaultToolCategories.find(c => c.id === tool.categoryId);

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{tool.name}</h1>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          {tool.imageUrl && (
            <div className="overflow-hidden rounded-lg border">
              <div className="aspect-video w-full">
                <img
                  src={tool.imageUrl}
                  alt={tool.name}
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          )}

          <div className="mt-6 space-y-4">
            <div>
              <h2 className="font-medium">Description</h2>
              <p className="mt-1 text-muted-foreground">{tool.description}</p>
            </div>

            {tool.instructions && (
              <div>
                <h2 className="font-medium">Usage Instructions</h2>
                <p className="mt-1 text-muted-foreground">{tool.instructions}</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Tool Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Status</span>
                <Badge variant={tool.status === "available" ? "outline" : "secondary"}>
                  {toolStatusLabels[tool.status as keyof typeof toolStatusLabels] || tool.status}
                </Badge>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category</span>
                <span>{category ? category.name : tool.categoryId}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-muted-foreground">Condition</span>
                <span>{toolConditionLabels[tool.condition as keyof typeof toolConditionLabels] || tool.condition}</span>
              </div>
              
              {!isOwner && (
                <div className="mt-6 pt-4 border-t">
                  <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="w-full" disabled={tool.status !== "available"}>
                        {tool.status === "available" ? (
                          "Request to Borrow"
                        ) : (
                          <>
                            <AlertCircle className="mr-2 h-4 w-4" /> Not Available
                          </>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Request to Borrow</DialogTitle>
                        <DialogDescription>
                          Send a request to borrow "{tool.name}". The owner will be notified and can approve or deny your request.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...requestForm}>
                        <form onSubmit={requestForm.handleSubmit(handleRequest)}>
                          <FormField
                            control={requestForm.control}
                            name="notes"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Textarea
                                    placeholder="Add a message to the owner (optional)"
                                    className="min-h-[100px]"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <DialogFooter className="mt-4">
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => setRequestDialogOpen(false)}
                            >
                              Cancel
                            </Button>
                            <Button type="submit" disabled={requesting}>
                              {requesting ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                                </>
                              ) : (
                                "Send Request"
                              )}
                            </Button>
                          </DialogFooter>
                        </form>
                      </Form>
                    </DialogContent>
                  </Dialog>
                </div>
              )}
              
              {isOwner && (
                <div className="mt-6 space-y-2 pt-4 border-t">
                  <Button variant="outline" className="w-full">
                    Edit Tool
                  </Button>
                  <Button variant="outline" className="w-full" disabled={tool.status !== "available"}>
                    Mark as Unavailable
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* For future implementation: Tool history, lending records, etc. */}
        </div>
      </div>
    </div>
  );
};

export default ToolDetail;
