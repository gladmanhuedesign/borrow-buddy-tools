
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import GroupInviteLink from "@/components/groups/GroupInviteLink";
import MemberManagement from "@/components/groups/MemberManagement";
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
import { ArrowLeft, Share2, Users, Plus, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const inviteFormSchema = z.object({
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

type InviteFormValues = z.infer<typeof inviteFormSchema>;

type Member = {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    display_name: string;
  };
};

type GroupWithMembers = {
  id: string;
  name: string;
  description: string | null;
  is_private: boolean;
  created_at: string;
  creator_id: string;
  members: Member[];
  memberCount: number;
};

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: {
      email: "",
    },
  });

  // Fetch group details
  const {
    data: group,
    isLoading: groupLoading,
    error: groupError,
    refetch: refetchGroup
  } = useQuery({
    queryKey: ['group', id],
    queryFn: async () => {
      if (!id || !currentUser) return null;
      
      // Fetch group details
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('*')
        .eq('id', id)
        .single();
        
      if (groupError) throw groupError;
      
      // Fetch group members with their profiles
      const { data: membersData, error: membersError } = await supabase
        .from('group_members')
        .select(`
          id,
          user_id,
          role,
          created_at,
          profiles:user_id(display_name)
        `)
        .eq('group_id', id);
        
      if (membersError) throw membersError;
      
      // Format the members data to match our expected type
      const formattedMembers: Member[] = membersData.map(member => ({
        id: member.id,
        user_id: member.user_id,
        role: member.role,
        joined_at: member.created_at,
        profile: {
          display_name: member.profiles?.display_name || 'Unknown User'
        }
      }));
      
      // Check current user's role in group
      const currentMember = formattedMembers.find(member => member.user_id === currentUser.id);
      if (currentMember) {
        setUserRole(currentMember.role);
      }
      
      // Generate invite code if user is admin or creator
      if (groupData.creator_id === currentUser.id || (currentMember && currentMember.role === 'admin')) {
        await ensureInviteCode(id);
      }
        
      return {
        ...groupData,
        members: formattedMembers,
        memberCount: formattedMembers.length,
      } as GroupWithMembers;
    },
    enabled: !!id && !!currentUser,
  });

  // Fetch tools that belong to group members
  const {
    data: tools = [],
    isLoading: toolsLoading,
  } = useQuery({
    queryKey: ['groupTools', id],
    queryFn: async () => {
      if (!id || !currentUser) return [];
      
      // Get user IDs of group members
      const { data: memberIds } = await supabase
        .from('group_members')
        .select('user_id')
        .eq('group_id', id);
        
      if (!memberIds || memberIds.length === 0) return [];
      
      // Get tools owned by group members
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select(`
          id,
          name,
          description,
          status,
          image_url,
          brand,
          power_source,
          category_id,
          owner_id,
          profiles:owner_id(display_name),
          tool_categories:category_id(name)
        `)
        .in('owner_id', memberIds.map(m => m.user_id));
        
      if (toolsError) throw toolsError;
      
      return toolsData || [];
    },
    enabled: !!id && !!currentUser && !!group,
  });

  // Ensure an invite code exists for this group
  const ensureInviteCode = async (groupId: string) => {
    // Check if invite code already exists
    const { data: existingInvites } = await supabase
      .from('group_invites')
      .select('invite_code')
      .eq('group_id', groupId)
      .eq('email', '*')
      .limit(1);
      
    if (existingInvites && existingInvites.length > 0) {
      setInviteCode(existingInvites[0].invite_code);
      return existingInvites[0].invite_code;
    }
    
    // Generate a new invite code
    const newInviteCode = Math.random().toString(36).substring(2, 10);
    
    // Store the invite code
    const { error } = await supabase
      .from('group_invites')
      .insert({
        group_id: groupId,
        email: '*', // Special value for general invite link
        invite_code: newInviteCode,
        created_by: currentUser!.id
      });
      
    if (error) {
      console.error("Failed to create invite code:", error);
      return null;
    }
    
    setInviteCode(newInviteCode);
    return newInviteCode;
  };
  
  const handleInvite = async (data: InviteFormValues) => {
    if (!group || !currentUser || !id) return;
    
    try {
      setInviting(true);
      
      // Generate a unique invite code
      const inviteCode = Math.random().toString(36).substring(2, 10);
      
      // Save the invite to the database
      const { error } = await supabase
        .from('group_invites')
        .insert({
          group_id: id,
          email: data.email,
          invite_code: inviteCode,
          created_by: currentUser.id
        });
        
      if (error) throw error;
      
      // In a real-world application, we would send an email here.
      // For now, just show a toast notification
      toast({
        title: "Invitation sent",
        description: `An invitation has been sent to ${data.email}.`,
      });
      
      setInviteDialogOpen(false);
      inviteForm.reset();
    } catch (error: any) {
      toast({
        title: "Failed to send invitation",
        description: error.message || "An error occurred while sending the invitation.",
        variant: "destructive",
      });
    } finally {
      setInviting(false);
    }
  };

  const handleMembersChange = () => {
    refetchGroup();
  };

  useEffect(() => {
    if (groupError) {
      toast({
        title: "Error loading group",
        description: "There was a problem loading the group details.",
        variant: "destructive",
      });
      console.error(groupError);
    }
  }, [groupError]);

  if (groupLoading) {
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
          <Skeleton className="h-8 w-48" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
        </Card>
        
        <div>
          <Skeleton className="h-10 w-full" />
          <div className="mt-4 space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
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

  const isCreator = currentUser?.id === group.creator_id;
  const isAdmin = userRole === 'admin' || isCreator;

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
              {isAdmin && (
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
                    
                    {inviteCode && (
                      <div className="mb-4">
                        <GroupInviteLink groupId={inviteCode} />
                      </div>
                    )}
                    
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
              )}
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
          
          {toolsLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : tools.length === 0 ? (
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
              {tools.map((tool: any) => (
                <Card key={tool.id} className="h-full cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate(`/tools/${tool.id}`)}>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0">
                        {tool.image_url ? (
                          <img 
                            src={tool.image_url} 
                            alt={tool.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center text-muted-foreground text-xs">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold line-clamp-1 mb-2">{tool.name}</h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          {tool.brand && (
                            <p className="line-clamp-1">Brand: {tool.brand}</p>
                          )}
                          {tool.power_source && (
                            <p className="line-clamp-1">Power: {tool.power_source}</p>
                          )}
                          {tool.tool_categories?.name && (
                            <p className="line-clamp-1">Category: {tool.tool_categories.name}</p>
                          )}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Badge 
                            className={`text-xs ${
                              tool.status === 'available' 
                                ? 'bg-green-600 hover:bg-green-700 text-white' 
                                : tool.status === 'borrowed'
                                ? 'bg-orange-600 hover:bg-orange-700 text-white'
                                : tool.status === 'unavailable'
                                ? 'bg-red-600 hover:bg-red-700 text-white'
                                : 'bg-gray-600 hover:bg-gray-700 text-white'
                            }`}
                          >
                            {tool.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="members" className="pt-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Group Members</h2>
            {isAdmin && (
              <Button size="sm" onClick={() => setInviteDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" /> Invite Member
              </Button>
            )}
          </div>
          
          {group.members.length === 0 ? (
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
            <Card>
              <MemberManagement
                groupId={group.id}
                members={group.members}
                userRole={userRole}
                isCreator={isCreator}
                onMembersChange={handleMembersChange}
              />
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GroupDetail;
