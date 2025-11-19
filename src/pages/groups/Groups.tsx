
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

// Separate component for the groups list
const GroupsList = ({ groups }: { groups: Group[] }) => {
  const navigate = useNavigate();
  
  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {groups.map((group) => (
        <div
          key={group.id}
          onClick={() => navigate(`/groups/${group.id}`)}
          className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] h-[280px]"
        >
          {/* Full Height Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/20 to-primary/10">
            {/* Group Icon */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10">
              <Users className="h-32 w-32" />
            </div>
            
            {/* Smooth Vertical Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 via-40% to-transparent" />
            
            {/* Privacy Badge */}
            {group.isPrivate && (
              <div className="absolute top-3 right-3">
                <Badge variant="outline" className="bg-background/80 backdrop-blur-sm">
                  Private
                </Badge>
              </div>
            )}

            {/* Group Info - Overlaid */}
            <div className="absolute inset-x-0 bottom-0 p-5 space-y-2">
              <h3 className="font-bold text-xl text-white drop-shadow-lg leading-tight line-clamp-2">{group.name}</h3>
              {group.description && (
                <p className="text-sm text-white/90 drop-shadow-md line-clamp-2">{group.description}</p>
              )}
              <div className="flex items-center gap-2 text-sm text-white/95 drop-shadow-md">
                <Users className="h-4 w-4" />
                <span>{group.memberCount} {group.memberCount === 1 ? "member" : "members"}</span>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Separate component for loading state
const LoadingState = () => (
  <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
    {[1, 2, 3].map((i) => (
      <div key={i} className="rounded-2xl overflow-hidden h-[280px] animate-pulse">
        <div className="h-full w-full bg-muted"></div>
      </div>
    ))}
  </div>
);

// Separate component for empty state
const EmptyState = ({ onCreateClick }: { onCreateClick: () => void }) => (
  <Card className="border-dashed">
    <CardHeader>
      <CardTitle className="text-center">No Groups Yet</CardTitle>
      <CardDescription className="text-center">
        You haven't joined or created any groups yet
      </CardDescription>
    </CardHeader>
    <CardContent className="flex justify-center pb-6">
      <Button onClick={onCreateClick}>
        <Plus className="mr-2 h-4 w-4" /> Create Your First Group
      </Button>
    </CardContent>
  </Card>
);

// Separate component for error states
const ErrorState = ({ 
  error, 
  isRecursionError, 
  onNavigate 
}: { 
  error: any, 
  isRecursionError: boolean, 
  onNavigate: () => void 
}) => {
  // If it's a Supabase recursion error, display a specific message
  if (isRecursionError) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Database Configuration Issue</AlertTitle>
        <AlertDescription>
          There is a database configuration issue that needs to be resolved.
          <div className="mt-2">
            <Button variant="outline" size="sm" onClick={onNavigate}>
              Back to Dashboard
            </Button>
          </div>
        </AlertDescription>
      </Alert>
    );
  }

  // For any other error
  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>Error loading groups</AlertTitle>
      <AlertDescription>
        There was a problem loading your groups. Please try again later.
        <div className="mt-2">
          <Button variant="outline" size="sm" onClick={() => window.location.reload()}>
            Try Again
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};

// Custom hook for fetching invitation count
const useInvitationCount = (userEmail: string | undefined) => {
  const [invitationCount, setInvitationCount] = useState(0);
  
  useEffect(() => {
    if (!userEmail) return;

    const fetchInvitationCount = async () => {
      try {
        const { count, error } = await supabase
          .from('group_invites')
          .select('*', { count: 'exact', head: true })
          .eq('email', userEmail);
        
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
  }, [userEmail]);

  return invitationCount;
};

// Main Groups component
const Groups = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const invitationCount = useInvitationCount(currentUser?.email);
  
  // Fetch groups the user is a member of
  const {
    data: groups = [],
    isLoading,
    error,
    isError,
    refetch
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
        console.error("Error in groups query:", error);
        throw error;
      }
    },
    enabled: !!currentUser,
    retry: false, // Don't retry on database policy errors
  });

  // Check if the error contains the "infinite recursion" message
  const isRecursionError = error && 
    typeof error === 'object' && 
    (error.toString().includes('infinite recursion detected in policy') || 
     (error as any)?.message?.includes('infinite recursion detected in policy'));
  
  const handleCreateGroup = () => navigate("/groups/create");

  // If there's a recursion error, also try to notify the Supabase admin
  useEffect(() => {
    if (isRecursionError) {
      // Log the error clearly for debugging
      console.error("Supabase recursion error detected:", error);
      
      // Show a toast to the user
      toast({
        title: "Database configuration issue detected",
        description: "The administrator has been notified of this issue.",
        variant: "destructive"
      });
    }
  }, [isRecursionError, error]);

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
          <Button onClick={handleCreateGroup}>
            <Plus className="mr-2 h-4 w-4" /> New Group
          </Button>
        </div>
      </div>
      
      {isError ? (
        <ErrorState 
          error={error} 
          isRecursionError={isRecursionError} 
          onNavigate={() => navigate("/dashboard")} 
        />
      ) : isLoading ? (
        <LoadingState />
      ) : groups.length === 0 ? (
        <EmptyState onCreateClick={handleCreateGroup} />
      ) : (
        <GroupsList groups={groups} />
      )}
    </div>
  );
};

export default Groups;
