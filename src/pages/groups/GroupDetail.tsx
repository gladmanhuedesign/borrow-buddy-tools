
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { Group } from "@/types";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, Share2, Users, Tool, Plus, Loader2 } from "lucide-react";

const inviteFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [members, setMembers] = useState<any[]>([]);
  const [tools, setTools] = useState<any[]>([]);

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
  });

  useEffect(() => {
    // This will be replaced with actual data fetching
    const fetchGroupDetails = async () => {
      try {
        // Mock data for now
        const mockGroup: Group = {
          id: id || "mock-id",
          name: "Sample Group",
          description: "This is a sample group for demonstration purposes.",
          createdAt: new Date().toISOString(),
          createdBy: currentUser?.id || "unknown",
          isPrivate: true,
          memberCount: 1,
        };
        
        setGroup(mockGroup);
        setMembers([]);
        setTools([]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching group details:", error);
        toast({
          title: "Error",
          description: "Failed to load group details.",
          variant: "destructive",
        });
        setLoading(false);
      }
    };
    
    fetchGroupDetails();
  }, [id, currentUser?.id]);
  
  const handleInvite = async (data: InviteFormValues) => {
    if (!group || !currentUser) return;
    
    try {
      setInviting(true);
      // This will be replaced with the actual invitation API call
      console.log("Inviting user:", data.email);
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${data.email}.`,
      });
      
      setInviteDialogOpen(false);
      inviteForm.reset();
    } catch (error) {
      toast({
        title: "Failed to send invitation",
        description: "An error occurred while sending the invitation.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-pulse">Loading group details...</div>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-bold">Group not found</h2>
        <p className="mt-2 text-muted-foreground">
          The group you're looking for doesn't exist or you don't have permission to view it.
        </p>
        <Button onClick={() => navigate("/groups")} className="mt-4">
          Back to Groups
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
          onClick={() => navigate("/groups")}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">{group.name}</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Information</CardTitle>
          <CardDescription>{group.description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
            </div>
            <div className="flex gap-2">
              <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Share2 className="mr-2 h-4 w-4" /> Invite
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite to {group.name}</DialogTitle>
                    <DialogDescription>
                      Send an invitation to join this group. The person will receive an email with a link to join.
                    </DialogDescription>
                  </DialogHeader>
                  <Form {...inviteForm}>
                    <form onSubmit={inviteForm.handleSubmit(handleInvite)}>
                      <FormField
                        control={inviteForm.control}
                        name="email"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Email Address</FormLabel>
                            <FormControl>
                              <Input placeholder="email@example.com" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter className="mt-4">
                        <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={inviting}>
                          {inviting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending...
                            </>
                          ) : (
                            "Send Invitation"
                          )}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="tools" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="tools">Tools</TabsTrigger>
          <TabsTrigger value="members">Members</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tools" className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Group Tools</h2>
            <Button size="sm" onClick={() => navigate("/tools/add")}>
              <Plus className="mr-2 h-4 w-4" /> Add Tool
            </Button>
          </div>
          
          {tools.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-center">No Tools Yet</CardTitle>
                <CardDescription className="text-center">
                  This group doesn't have any tools yet. Add your first tool to start sharing.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6">
                <Button onClick={() => navigate("/tools/add")}>
                  <Plus className="mr-2 h-4 w-4" /> Add a Tool
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tools.map((tool) => (
                <Card key={tool.id}>
                  <CardHeader>
                    <CardTitle>{tool.name}</CardTitle>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members" className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Group Members</h2>
          </div>
          
          {members.length === 0 ? (
            <Card className="border-dashed">
              <CardHeader>
                <CardTitle className="text-center">Just You</CardTitle>
                <CardDescription className="text-center">
                  You're the only member in this group. Invite others to join!
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center pb-6">
                <Button onClick={() => setInviteDialogOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" /> Invite Members
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {members.map((member) => (
                <div key={member.id}>
                  {/* Member display would go here */}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GroupDetail;
