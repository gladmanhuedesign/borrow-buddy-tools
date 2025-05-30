
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Check, X, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Invitation = {
  id: string;
  group_id: string;
  email: string;
  created_at: string;
  groups: {
    id: string;
    name: string;
    description: string | null;
    creator_id: string;
    creator: {
      display_name: string;
    }
  };
  creator: {
    display_name: string;
  };
};

const GroupInvitations = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const {
    data: invitations = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['invitations', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];

      // Get invitations sent to the user's email
      const { data, error } = await supabase
        .from('group_invites')
        .select(`
          id, 
          group_id, 
          email, 
          created_at,
          groups:group_id (
            id,
            name, 
            description,
            creator_id,
            creator:creator_id (
              display_name
            )
          ),
          creator:created_by (
            display_name
          )
        `)
        .eq('email', currentUser.email)
        .neq('email', '*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching invitations:', error);
        throw error;
      }

      return data as Invitation[];
    },
    enabled: !!currentUser?.email
  });

  const { 
    data: sentInvitations = [],
    isLoading: sentLoading
  } = useQuery({
    queryKey: ['sent-invitations', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];

      // Get invitations created by the current user
      const { data, error } = await supabase
        .from('group_invites')
        .select(`
          id, 
          group_id, 
          email, 
          created_at,
          groups:group_id (
            id,
            name
          )
        `)
        .eq('created_by', currentUser.id)
        .neq('email', '*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sent invitations:', error);
        throw error;
      }

      return data;
    },
    enabled: !!currentUser?.id
  });

  const handleAccept = async (invitationId: string, groupId: string) => {
    if (!currentUser) return;
    
    setProcessingId(invitationId);
    
    try {
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('group_id', groupId)
        .single();
      
      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You are already a member of this group.",
        });
        
        // Delete the invitation since it's no longer needed
        await supabase
          .from('group_invites')
          .delete()
          .eq('id', invitationId);
          
        refetch();
        // Redirect to group details even if already a member
        navigate(`/groups/${groupId}`);
        return;
      }
      
      // Join the group as a member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupId,
          user_id: currentUser.id,
          role: 'member'
        });
      
      if (memberError) throw memberError;
      
      // Delete the invitation
      const { error: deleteError } = await supabase
        .from('group_invites')
        .delete()
        .eq('id', invitationId);
      
      if (deleteError) throw deleteError;
      
      toast({
        title: "Invitation accepted",
        description: "You have successfully joined the group.",
      });
      
      refetch();
      
      // Redirect to the group details page
      navigate(`/groups/${groupId}`);
    } catch (error: any) {
      toast({
        title: "Error accepting invitation",
        description: error.message || "An error occurred while accepting the invitation.",
        variant: "destructive",
      });
      console.error('Accept invitation error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleDecline = async (invitationId: string) => {
    setProcessingId(invitationId);
    
    try {
      // Delete the invitation
      const { error } = await supabase
        .from('group_invites')
        .delete()
        .eq('id', invitationId);
      
      if (error) throw error;
      
      toast({
        title: "Invitation declined",
        description: "The invitation has been declined.",
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error declining invitation",
        description: error.message || "An error occurred while declining the invitation.",
        variant: "destructive",
      });
      console.error('Decline invitation error:', error);
    } finally {
      setProcessingId(null);
    }
  };

  const handleCancelInvite = async (invitationId: string) => {
    setProcessingId(invitationId);
    
    try {
      // Delete the invitation
      const { error } = await supabase
        .from('group_invites')
        .delete()
        .eq('id', invitationId);
      
      if (error) throw error;
      
      toast({
        title: "Invitation cancelled",
        description: "The invitation has been cancelled.",
      });
      
      refetch();
    } catch (error: any) {
      toast({
        title: "Error cancelling invitation",
        description: error.message || "An error occurred while cancelling the invitation.",
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (error) {
    toast({
      title: "Error loading invitations",
      description: "There was a problem loading your invitations.",
      variant: "destructive",
    });
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
        <h1 className="text-2xl font-bold">Group Invitations</h1>
      </div>

      <Tabs defaultValue="received">
        <TabsList className="grid w-full md:w-auto grid-cols-2">
          <TabsTrigger value="received">Received</TabsTrigger>
          <TabsTrigger value="sent">Sent</TabsTrigger>
        </TabsList>
        
        <TabsContent value="received" className="pt-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : invitations.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Invitations</CardTitle>
                <CardDescription>
                  You don't have any pending group invitations.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" onClick={() => navigate("/groups")}>
                  Browse Groups
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-4">
              {invitations.map((invitation) => (
                <Card key={invitation.id}>
                  <CardHeader>
                    <CardTitle>{invitation.groups.name}</CardTitle>
                    <CardDescription>
                      {invitation.groups.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Invited by {invitation.creator.display_name} on{" "}
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleDecline(invitation.id)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="mr-2 h-4 w-4" />
                      )}
                      Decline
                    </Button>
                    <Button
                      onClick={() => handleAccept(invitation.id, invitation.group_id)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="mr-2 h-4 w-4" />
                      )}
                      Accept
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="sent" className="pt-4">
          {sentLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                  </CardHeader>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : sentInvitations.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No Sent Invitations</CardTitle>
                <CardDescription>
                  You haven't sent any group invitations.
                </CardDescription>
              </CardHeader>
              <CardFooter>
                <Button variant="outline" onClick={() => navigate("/groups")}>
                  Go to Groups
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <div className="space-y-4">
              {sentInvitations.map((invitation: any) => (
                <Card key={invitation.id}>
                  <CardHeader>
                    <CardTitle>{invitation.groups.name}</CardTitle>
                    <CardDescription>
                      Invitation sent to: {invitation.email}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Sent on {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button
                      variant="outline"
                      onClick={() => handleCancelInvite(invitation.id)}
                      disabled={processingId === invitation.id}
                    >
                      {processingId === invitation.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Cancel Invitation"
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default GroupInvitations;
