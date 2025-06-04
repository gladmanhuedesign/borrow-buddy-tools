
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, Users, PlusCircle, Clock, Check, X, UserPlus, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { ActiveBorrowingList } from "@/components/dashboard/ActiveBorrowingList";
import { ActiveLendingList } from "@/components/dashboard/ActiveLendingList";
import { PendingActions } from "@/components/dashboard/PendingActions";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { NewToolsFeed } from "@/components/dashboard/NewToolsFeed";

type Invitation = {
  id: string;
  group_id: string;
  email: string;
  created_at: string;
  group_name: string;
  group_description: string | null;
  creator_display_name: string;
};

const Dashboard = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch pending invitations
  const { data: invitations = [], refetch: refetchInvitations } = useQuery({
    queryKey: ['dashboard-invitations', currentUser?.email],
    queryFn: async () => {
      if (!currentUser?.email) return [];

      // First get the invitations
      const { data: inviteData, error: inviteError } = await supabase
        .from('group_invites')
        .select('id, group_id, email, created_at, created_by')
        .eq('email', currentUser.email)
        .neq('email', '*')
        .order('created_at', { ascending: false });

      if (inviteError) {
        console.error('Error fetching invitations:', inviteError);
        return [];
      }

      if (!inviteData || inviteData.length === 0) return [];

      // Then get group details and creator info separately to avoid RLS issues
      const groupIds = inviteData.map(invite => invite.group_id);
      const creatorIds = inviteData.map(invite => invite.created_by);

      const [groupsResponse, creatorsResponse] = await Promise.all([
        supabase
          .from('groups')
          .select('id, name, description')
          .in('id', groupIds),
        supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', creatorIds)
      ]);

      // Create lookup maps
      const groupsMap = new Map(
        (groupsResponse.data || []).map(group => [group.id, group])
      );
      const creatorsMap = new Map(
        (creatorsResponse.data || []).map(creator => [creator.id, creator])
      );

      // Combine the data
      return inviteData.map(invite => ({
        id: invite.id,
        group_id: invite.group_id,
        email: invite.email,
        created_at: invite.created_at,
        group_name: groupsMap.get(invite.group_id)?.name || 'Unknown Group',
        group_description: groupsMap.get(invite.group_id)?.description || null,
        creator_display_name: creatorsMap.get(invite.created_by)?.display_name || 'Unknown User'
      })) as Invitation[];
    },
    enabled: !!currentUser?.email
  });

  // Set up real-time subscription for invitations
  useEffect(() => {
    if (!currentUser?.email) return;

    const channel = supabase
      .channel('dashboard-invitation-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'group_invites' }, 
        () => {
          refetchInvitations();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUser?.email, refetchInvitations]);

  const handleAcceptInvitation = async (invitationId: string, groupId: string) => {
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
          
        refetchInvitations();
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
      
      refetchInvitations();
      
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

  const handleDeclineInvitation = async (invitationId: string) => {
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
      
      refetchInvitations();
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

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Welcome back, {currentUser?.displayName}!</h1>
        <p className="text-lg text-muted-foreground">
          Here's what's happening with your tools and groups
        </p>
      </div>

      <div className="space-y-8">
        {/* Three column layout for main sections */}
        <div className="grid gap-6 md:grid-cols-3">
          <ActiveBorrowingList />
          <ActiveLendingList />
          <PendingActions />
        </div>
        
        {/* New Tools Feed Section */}
        <NewToolsFeed />
        
        {/* Quick Actions Section */}
        <QuickActions />

        {/* Pending Invitations Section */}
        {invitations.length > 0 && (
          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                <UserPlus className="h-4 w-4" />
              </div>
              <h2 className="text-2xl font-semibold tracking-tight">Pending Group Invitations</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="border-blue-200 bg-blue-50/50">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-lg">{invitation.group_name}</CardTitle>
                    <CardDescription>
                      {invitation.group_description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <p className="text-sm text-muted-foreground">
                      Invited by <span className="font-medium">{invitation.creator_display_name}</span> on{" "}
                      {new Date(invitation.created_at).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter className="flex justify-end space-x-3 pt-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeclineInvitation(invitation.id)}
                      disabled={processingId === invitation.id}
                    >
                      <X className="mr-2 h-4 w-4" />
                      Decline
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleAcceptInvitation(invitation.id, invitation.group_id)}
                      disabled={processingId === invitation.id}
                    >
                      <Check className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
