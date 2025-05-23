
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Users } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";
import { Group } from "@/types";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const Groups = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  // Fetch groups the user is a member of
  const {
    data: groups = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['groups', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];
      
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
            return {
              ...group,
              memberCount: 0
            };
          }
          
          return {
            ...group,
            memberCount: count || 0
          };
        })
      );
      
      return groupsWithMemberCount.filter(Boolean) as Group[];
    },
    enabled: !!currentUser,
  });

  useEffect(() => {
    if (error) {
      toast({
        title: "Error loading groups",
        description: "There was a problem loading your groups.",
        variant: "destructive",
      });
      console.error(error);
    }
  }, [error]);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Groups</h1>
        <Button onClick={() => navigate("/groups/create")}>
          <Plus className="mr-2 h-4 w-4" /> New Group
        </Button>
      </div>
      
      {isLoading ? (
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
