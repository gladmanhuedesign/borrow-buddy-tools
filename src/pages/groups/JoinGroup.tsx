
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Users, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const JoinGroup = () => {
  const { inviteCode } = useParams<{ inviteCode: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { currentUser, isAuthenticated } = useAuth();
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [groupInfo, setGroupInfo] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!inviteCode) {
      setError("Invalid invitation link");
      setLoading(false);
      return;
    }

    const fetchInvitation = async () => {
      try {
        // Check if this is a general invitation (with email='*')
        const { data: generalInvite, error: generalError } = await supabase
          .from('group_invites')
          .select(`
            id, 
            group_id, 
            groups:group_id (
              id, 
              name, 
              description,
              creator_id,
              creator:creator_id (
                display_name
              )
            )
          `)
          .eq('invite_code', inviteCode)
          .eq('email', '*')
          .single();

        if (generalInvite) {
          setGroupInfo(generalInvite);
          setLoading(false);
          return;
        }

        // If not found as a general invite and user is authenticated, check for personal invite
        if (isAuthenticated && currentUser?.email) {
          const { data: personalInvite, error: personalError } = await supabase
            .from('group_invites')
            .select(`
              id, 
              group_id, 
              groups:group_id (
                id, 
                name, 
                description,
                creator_id,
                creator:creator_id (
                  display_name
                )
              )
            `)
            .eq('invite_code', inviteCode)
            .eq('email', currentUser.email)
            .single();

          if (personalInvite) {
            setGroupInfo(personalInvite);
            setLoading(false);
            return;
          }
        }

        // If no invite found
        setError("Invalid or expired invitation");
        setLoading(false);
      } catch (error: any) {
        console.error("Error fetching invitation:", error);
        setError("Error loading invitation details");
        setLoading(false);
      }
    };

    fetchInvitation();
  }, [inviteCode, currentUser, isAuthenticated]);

  const handleJoin = async () => {
    if (!currentUser || !groupInfo) return;
    
    setJoining(true);
    
    try {
      // Check if already a member
      const { data: existingMember } = await supabase
        .from('group_members')
        .select('id')
        .eq('user_id', currentUser.id)
        .eq('group_id', groupInfo.group_id)
        .single();
      
      if (existingMember) {
        toast({
          title: "Already a member",
          description: "You are already a member of this group.",
        });
        navigate(`/groups/${groupInfo.group_id}`);
        return;
      }
      
      // Join the group as a member
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: groupInfo.group_id,
          user_id: currentUser.id,
          role: 'member'
        });
      
      if (memberError) throw memberError;
      
      // If this was a personal invitation (not '*'), delete it
      if (groupInfo.email !== '*') {
        await supabase
          .from('group_invites')
          .delete()
          .eq('id', groupInfo.id);
      }
      
      toast({
        title: "Success!",
        description: `You've joined ${groupInfo.groups.name}`,
      });
      
      navigate(`/groups/${groupInfo.group_id}`);
    } catch (error: any) {
      toast({
        title: "Error joining group",
        description: error.message || "An error occurred while joining the group.",
        variant: "destructive",
      });
      console.error('Join group error:', error);
      setJoining(false);
    }
  };

  if (loading) {
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
          <Skeleton className="h-8 w-40" />
        </div>
        
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-1/3" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (error || !groupInfo) {
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
          <h1 className="text-2xl font-bold">Join Group</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Invitation Error</CardTitle>
            <CardDescription>
              {error || "This invitation link is invalid or has expired."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/groups")}>
              Back to Groups
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  // If not authenticated, prompt to login
  if (!isAuthenticated) {
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
          <h1 className="text-2xl font-bold">Join Group</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Join {groupInfo.groups.name}</CardTitle>
            <CardDescription>
              You need to sign in before you can join this group.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              <Users className="inline mr-1 h-4 w-4" />
              Created by {groupInfo.groups.creator.display_name}
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/login", { state: { redirectAfterLogin: `/invite/${inviteCode}` } })}>
              Sign In to Join
            </Button>
          </CardFooter>
        </Card>
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
        <h1 className="text-2xl font-bold">Join Group</h1>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Join {groupInfo.groups.name}</CardTitle>
          <CardDescription>
            {groupInfo.groups.description || "No description provided"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            <Users className="inline mr-1 h-4 w-4" />
            Created by {groupInfo.groups.creator.display_name}
          </p>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" onClick={() => navigate("/groups")}>
            Cancel
          </Button>
          <Button onClick={handleJoin} disabled={joining}>
            {joining ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Joining...
              </>
            ) : (
              "Join Group"
            )}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default JoinGroup;
