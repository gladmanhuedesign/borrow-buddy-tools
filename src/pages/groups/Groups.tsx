
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Users, Mail, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Group } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";

const Groups = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [invitationCount, setInvitationCount] = useState(0);

  // Fetch invitation count
  useEffect(() => {
    if (!currentUser?.email) return;

    const fetchInvitationCount = async () => {
      try {
        const { count, error } = await supabase
          .from('group_invites')
          .select('*', { count: 'exact', head: true })
          .eq('email', currentUser.email);
        
        if (error) {
          console.error('Error fetching invitation count:', error);
          return;
        }
        
        setInvitationCount(count || 0);
      } catch (err) {
        console.error('Error fetching invitation count:', err);
      }
    };

    fetchInvitationCount();
  }, [currentUser?.email]);

  // Fetch groups the user is a member of
  const {
    data: groups = [],
    isLoading,
    error,
    isError
  } = useQuery({
    queryKey: ['groups', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
      try {
        // Get groups where user is a member
        const { data: memberGroups, error: memberError } = await supabase
          .from('group_members')
          .select(`
            group_id,
            groups:group_id (
              id,
              name, 
              description,
              is_private,
              created_at,
              creator_id
            )
          `)
          .eq('user_id', currentUser.id);
        
        if (memberError) {
          console.error("Error fetching member groups:", memberError);
          throw memberError;
        }

        // Get the count of members for each group
        const groupsWithMemberCount = await Promise.all(
          (memberGroups || []).map(async ({ groups: group }) => {
            if (!group) return null;
            
            const { count, error: countError } = await supabase
              .from('group_members')
              .select('*', { count: 'exact', head: true })
              .eq('group_id', group.id);
            
            if (countError) {
              console.error("Error counting members:", countError);
              return null;
            }
            
            // Transform the Supabase data format to match our Group type
            return {
              id: group.id,
              name: group.name,
              description: group.description || "",
              createdAt: group.created_at,
              createdBy: group.creator_id,
              isPrivate: group.is_private,
              memberCount: count || 0
            } as Group;
          })
        );
        
        return groupsWithMemberCount.filter(Boolean) as Group[];
      } catch (error) {
        // Make sure to throw the error to be handled by React Query
        console.error("Error in groups query:", error);
        throw error;
      }
    },
    enabled: !!currentUser,
    retry: 1, // Limit retries to prevent excessive API calls on database error
  });

  // Check if the error contains the "infinite recursion" message
  const isRecursionError = error && 
    typeof error === 'object' && 
    error.toString().includes('infinite recursion detected in policy');
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Groups</h1>
        <div className="flex gap-2">
          {invitationCount > 0 && (
            <Button 
              variant="outline"
              onClick={() => navigate("/groups/invitations")}
              className="gap-1"
            >
              <Mail className="h-4 w-4" />
              Invitations
              <Badge variant="destructive" className="ml-1 text-xs">
                {invitationCount}
              </Badge>
            </Button>
          )}
          <Button onClick={() => navigate("/groups/create")}>
            <Plus className="mr-2 h-4 w-4" /> New Group
          </Button>
        </div>
      </div>
      
      {isRecursionError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading groups</AlertTitle>
          <AlertDescription>
            There appears to be a database configuration issue. This may require administrator attention.
            <div className="mt-2">
              <Button variant="outline" size="sm" onClick={() => navigate("/dashboard")}>
                Back to Dashboard
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="h-full">
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
          ))}
        </div>
      ) : isError && !isRecursionError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error loading groups</AlertTitle>
          <AlertDescription>
            There was a problem loading your groups. Please try again later.
          </AlertDescription>
        </Alert>
      ) : groups.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-center">No Groups Yet</CardTitle>
            <CardDescription className="text-center">
              You haven't joined or created any groups yet
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={() => navigate("/groups/create")}>
              <Plus className="mr-2 h-4 w-4" /> Create Your First Group
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {groups.map((group) => (
            <Link key={group.id} to={`/groups/${group.id}`}>
              <Card className="h-full transition-shadow hover:shadow-md">
                <CardHeader>
                  <CardTitle className="line-clamp-1">{group.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {group.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center text-sm text-muted-foreground">
                    <Users className="mr-1 h-4 w-4" />
                    {group.memberCount} {group.memberCount === 1 ? "member" : "members"}
                  </div>
                </CardContent>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    View Group
                  </Button>
                </CardFooter>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Groups;
