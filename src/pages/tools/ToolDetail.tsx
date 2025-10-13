import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tool } from "@/types";
import { toolConditionLabels, toolStatusLabels, toolPowerSourceLabels } from "@/config/toolCategories";
import { ArrowLeft, AlertCircle, Clock, Loader2, Zap, Battery, Fuel, Wrench, Wind } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
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
import { ToolHistory } from "@/components/tools/ToolHistory";

const requestFormSchema = z.object({
  notes: z.string().optional(),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
});

type RequestFormValues = z.infer<typeof requestFormSchema>;

interface ToolCategory {
  id: string;
  name: string;
}

const ToolDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tool, setTool] = useState<Tool | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOwner, setIsOwner] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const [categories, setCategories] = useState<ToolCategory[]>([]);

  const requestForm = useForm<RequestFormValues>({
    resolver: zodResolver(requestFormSchema),
    defaultValues: {
      notes: "",
      startDate: "",
      endDate: "",
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const { data: categoriesData, error } = await supabase
          .from('tool_categories')
          .select('id, name');

        if (error) {
          console.error("Error fetching categories:", error);
          return;
        }

        setCategories(categoriesData || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
      }
    };
    
    fetchCategories();
  }, []);

  useEffect(() => {
    const fetchToolDetails = async () => {
      if (!id) return;
      
      try {
        console.log("Fetching tool details for ID:", id);
        
        const { data: toolData, error } = await supabase
          .from('tools')
          .select(`
            *,
            profiles:owner_id (
              display_name
            )
          `)
          .eq('id', id)
          .single();

        if (error) {
          console.error("Error fetching tool:", error);
          toast({
            title: "Error",
            description: "Failed to load tool details.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        if (!toolData) {
          setTool(null);
          setLoading(false);
          return;
        }

        // Map the database fields to our Tool interface
        const mappedTool: Tool = {
          id: toolData.id,
          name: toolData.name,
          description: toolData.description || "",
          categoryId: toolData.category_id || "",
          condition: "good", // Default since condition isn't in DB yet
          status: toolData.status,
          ownerId: toolData.owner_id,
          groupId: "sample-group-1", // Placeholder since group association isn't implemented yet
          instructions: toolData.description || "",
          imageUrl: toolData.image_url,
          brand: toolData.brand,
          powerSource: toolData.power_source,
          createdAt: toolData.created_at,
          updatedAt: toolData.updated_at,
        };
        
        setTool(mappedTool);
        
        // Check if current user is the owner
        if (currentUser && toolData.owner_id === currentUser.id) {
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
      console.log("Creating tool request:", { toolId: tool.id, data });
      
      const { error } = await supabase
        .from('tool_requests')
        .insert({
          tool_id: tool.id,
          requester_id: currentUser.id,
          start_date: data.startDate,
          end_date: data.endDate,
          message: data.notes || null,
          status: 'pending'
        });

      if (error) {
        console.error("Error creating request:", error);
        throw error;
      }
      
      toast({
        title: "Request sent",
        description: `Your request for "${tool.name}" has been sent to the owner.`,
      });
      
      setRequestDialogOpen(false);
      requestForm.reset();
      navigate("/requests");
    } catch (error) {
      console.error("Request creation failed:", error);
      toast({
        title: "Request failed",
        description: "An error occurred while sending your request.",
        variant: "destructive",
      });
    } finally {
      setRequesting(false);
    }
  };

  const handleToggleAvailability = async () => {
    if (!tool || !currentUser) return;
    
    try {
      const newStatus = tool.status === "available" ? "unavailable" : "available";
      
      const { error } = await supabase
        .from('tools')
        .update({ status: newStatus })
        .eq('id', tool.id);

      if (error) {
        console.error("Error updating tool status:", error);
        throw error;
      }
      
      // Update local state
      setTool({ ...tool, status: newStatus });
      
      toast({
        title: "Tool status updated",
        description: `${tool.name} is now ${newStatus}.`,
      });
    } catch (error) {
      console.error("Failed to update tool status:", error);
      toast({
        title: "Update failed",
        description: "An error occurred while updating the tool status.",
        variant: "destructive",
      });
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
  const category = categories.find(c => c.id === tool.categoryId);

  // Get today's date for min date validation
  const today = new Date().toISOString().split('T')[0];

  // Helper function to get power source icon
  const getPowerSourceIcon = (powerSource?: string) => {
    if (!powerSource) return null;
    switch (powerSource) {
      case 'battery': return <Battery className="h-4 w-4" />;
      case 'corded': return <Zap className="h-4 w-4" />;
      case 'gas': return <Fuel className="h-4 w-4" />;
      case 'manual': return <Wrench className="h-4 w-4" />;
      case 'pneumatic': return <Wind className="h-4 w-4" />;
      case 'hybrid': return <><Zap className="h-3 w-3" /><Battery className="h-3 w-3" /></>;
      default: return null;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/tools')}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{tool.name}</h1>
          {tool.brand && (
            <p className="text-sm text-muted-foreground mt-1">{tool.brand}</p>
          )}
        </div>
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

            {tool.instructions && tool.instructions !== tool.description && (
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
                <Badge variant={
                  tool.status === "available" ? "outline" : 
                  tool.status === "unavailable" ? "destructive" : 
                  "secondary"
                }>
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

              {tool.powerSource && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Power Source</span>
                  <div className="flex items-center gap-2">
                    {getPowerSourceIcon(tool.powerSource)}
                    <span>{toolPowerSourceLabels[tool.powerSource as keyof typeof toolPowerSourceLabels] || tool.powerSource}</span>
                  </div>
                </div>
              )}
              
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
                    <DialogContent className="sm:max-w-md">
                      <DialogHeader>
                        <DialogTitle>Request to Borrow</DialogTitle>
                        <DialogDescription>
                          Send a request to borrow "{tool.name}". The owner will be notified and can approve or deny your request.
                        </DialogDescription>
                      </DialogHeader>
                      <Form {...requestForm}>
                        <form onSubmit={requestForm.handleSubmit(handleRequest)} className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <FormField
                              control={requestForm.control}
                              name="startDate"
                              render={({ field }) => (
                                <FormItem>
                                  <label className="text-sm font-medium">Start Date</label>
                                  <FormControl>
                                    <input
                                      type="date"
                                      min={today}
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={requestForm.control}
                              name="endDate"
                              render={({ field }) => (
                                <FormItem>
                                  <label className="text-sm font-medium">End Date</label>
                                  <FormControl>
                                    <input
                                      type="date"
                                      min={requestForm.watch("startDate") || today}
                                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                      {...field}
                                    />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>
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
                          <DialogFooter>
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
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate(`/tools/${tool.id}/edit`)}
                  >
                    Edit Tool
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full" 
                    onClick={handleToggleAvailability}
                    disabled={tool.status === "borrowed"}
                  >
                    {tool.status === "available" ? "Mark as Unavailable" : "Mark as Available"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Add Tool History Section */}
      <ToolHistory toolId={tool.id} />
    </div>
  );
};

export default ToolDetail;
