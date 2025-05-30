import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Hammer, Users, PlusCircle, Clock, Check, X, UserPlus, ArrowUp, ArrowDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

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

  // Fetch tools count
  const { data: toolsCount = 0 } = useQuery({
    queryKey: ['toolsCount', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      const { count, error } = await supabase
        .from('tools')
        .select('id', { count: 'exact', head: true })
        .eq('owner_id', currentUser.id);
      
      if (error) {
        console.error('Error fetching tools count:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!currentUser
  });

  // Fetch groups count
  const { data: groupsCount = 0 } = useQuery({
    queryKey: ['groupsCount', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      const { count, error } = await supabase
        .from('group_members')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', currentUser.id);
      
      if (error) {
        console.error('Error fetching groups count:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!currentUser
  });

  // Fetch outgoing requests count (requests I've sent out)
  const { data: outgoingRequestsCount = 0 } = useQuery({
    queryKey: ['outgoingRequestsCount', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      const { count, error } = await supabase
        .from('tool_requests')
        .select('id', { count: 'exact', head: true })
        .eq('requester_id', currentUser.id)
        .in('status', ['pending', 'approved']);
      
      if (error) {
        console.error('Error fetching outgoing requests count:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!currentUser
  });

  // Fetch incoming requests count (requests sent to my tools)
  const { data: incomingRequestsCount = 0 } = useQuery({
    queryKey: ['incomingRequestsCount', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return 0;
      
      // First get the tools owned by the current user
      const { data: tools, error: toolsError } = await supabase
        .from('tools')
        .select('id')
        .eq('owner_id', currentUser.id);
      
      if (toolsError) {
        console.error('Error fetching tools for requests count:', toolsError);
        return 0;
      }
      
      if (!tools || tools.length === 0) return 0;
      
      const toolIds = tools.map(tool => tool.id);
      
      // Then count requests for those tools
      const { count, error } = await supabase
        .from('tool_requests')
        .select('id', { count: 'exact', head: true })
        .in('tool_id', toolIds)
        .in('status', ['pending', 'approved']);
      
      if (error) {
        console.error('Error fetching incoming requests count:', error);
        return 0;
      }
      return count ?? 0;
    },
    enabled: !!currentUser
  });

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

  const stats = [
    { 
      title: "My Tools", 
      value: toolsCount, 
      icon: <Hammer className="h-5 w-5" />,
      action: () => navigate("/tools"),
      actionText: "View Tools"
    },
    { 
      title: "My Groups", 
      value: groupsCount, 
      icon: <Users className="h-5 w-5" />,
      action: () => navigate("/groups"),
      actionText: "View Groups" 
    },
    { 
      title: "Active Requests", 
      value: `${outgoingRequestsCount + incomingRequestsCount}`, 
      icon: <Clock className="h-5 w-5" />,
      action: () => navigate("/requests"),
      actionText: "View Requests",
      subtitle: (
        <div className="flex items-center gap-4 text-xs text-muted-foreground mt-1">
          <div className="flex items-center gap-1">
            <ArrowUp className="h-3 w-3" />
            <span>{outgoingRequestsCount} sent</span>
          </div>
          <div className="flex items-center gap-1">
            <ArrowDown className="h-3 w-3" />
            <span>{incomingRequestsCount} received</span>
          </div>
        </div>
      )
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Welcome, {currentUser?.displayName}!</h1>
        <p className="text-muted-foreground">
          Here's what's happening with your tools and groups
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              {stat.icon}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              {stat.subtitle}
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={stat.action}
              >
                {stat.actionText}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Pending Invitations Section */}
      {invitations.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center space-x-2">
            <UserPlus className="h-5 w-5" />
            <h2 className="text-xl font-bold">Pending Group Invitations</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {invitations.map((invitation) => (
              <Card key={invitation.id} className="border-blue-200 bg-blue-50/50">
                <CardHeader>
                  <CardTitle className="text-lg">{invitation.group_name}</CardTitle>
                  <CardDescription>
                    {invitation.group_description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Invited by <span className="font-medium">{invitation.creator_display_name}</span> on{" "}
                    {new Date(invitation.created_at).toLocaleDateString()}
                  </p>
                </CardContent>
                <CardFooter className="flex justify-end space-x-2">
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

      <div className="flex flex-col space-y-4">
        <h2 className="text-xl font-bold">Quick Actions</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <Button 
            onClick={() => navigate("/tools/add")}
            className="h-auto py-4 text-left flex items-center justify-start space-x-4"
          >
            <PlusCircle className="h-5 w-5" /> 
            <div>
              <div className="font-semibold">Add a Tool</div>
              <div className="text-xs text-muted">Share your tools with your groups</div>
            </div>
          </Button>
          
          <Button 
            onClick={() => navigate("/groups/create")}
            variant="outline"
            className="h-auto py-4 text-left flex items-center justify-start space-x-4"
          >
            <Users className="h-5 w-5" /> 
            <div>
              <div className="font-semibold">Create a Group</div>
              <div className="text-xs text-muted">Start sharing with friends or colleagues</div>
            </div>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
