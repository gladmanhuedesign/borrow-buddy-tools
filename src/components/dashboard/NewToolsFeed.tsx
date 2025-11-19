
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Hammer, Clock, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toolPowerSourceLabels } from "@/config/toolCategories";
import { UserAvatar } from "@/components/ui/user-avatar";

type NewTool = {
  id: string;
  name: string;
  description: string;
  image_url: string | null;
  created_at: string;
  owner_name: string;
  owner_avatar_url: string | null;
  group_name: string;
  owner_id: string;
  brand: string | null;
  power_source: string | null;
};

export const NewToolsFeed = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();

  const { data: newTools = [], isLoading } = useQuery({
    queryKey: ['new-tools-feed', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];

      // Get user's groups
      const { data: userGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUser.id);

      if (groupsError || !userGroups?.length) return [];

      const groupIds = userGroups.map(g => g.group_id);

      // Get all members from user's groups (excluding the current user)
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .in('group_id', groupIds)
        .neq('user_id', currentUser.id);

      if (membersError || !groupMembers?.length) return [];

      const memberIds = [...new Set(groupMembers.map(m => m.user_id))];

      // Get tools from group members (excluding current user's tools)
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select('id, name, description, image_url, created_at, owner_id, brand, power_source')
        .in('owner_id', memberIds)
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
        .order('created_at', { ascending: false })
        .limit(5);

      if (toolsError) {
        console.error('Error fetching new tools:', toolsError);
        return [];
      }

      if (!toolsData || toolsData.length === 0) return [];

      // Get owner names and determine which group each tool belongs to
      const ownerIds = [...new Set(toolsData.map(tool => tool.owner_id))];

      const [ownersResponse, groupsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', ownerIds),
        supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds)
      ]);

      // Create lookup maps
      const ownersMap = new Map(
        (ownersResponse.data || []).map(owner => [owner.id, { name: owner.display_name, avatar: owner.avatar_url }])
      );
      const groupsMap = new Map(
        (groupsResponse.data || []).map(group => [group.id, group.name])
      );

      // Create a map of user to their groups
      const userGroupMap = new Map<string, string>();
      groupMembers.forEach(member => {
        if (!userGroupMap.has(member.user_id)) {
          userGroupMap.set(member.user_id, member.group_id);
        }
      });

      // Combine the data
      return toolsData.map(tool => {
        const ownerData = ownersMap.get(tool.owner_id);
        return {
          id: tool.id,
          name: tool.name,
          description: tool.description,
          image_url: tool.image_url,
          created_at: tool.created_at,
          owner_name: ownerData?.name || 'Unknown User',
          owner_avatar_url: ownerData?.avatar || null,
          group_name: groupsMap.get(userGroupMap.get(tool.owner_id) || '') || 'Unknown Group',
          owner_id: tool.owner_id,
          brand: tool.brand,
          power_source: tool.power_source
        };
      }) as NewTool[];
    },
    enabled: !!currentUser?.id
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hammer className="h-5 w-5" />
            <span>New Tools in Your Groups</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (newTools.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Hammer className="h-5 w-5" />
            <span>New Tools in Your Groups</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No new tools have been added to your groups recently.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Hammer className="h-5 w-5" />
          <span>New Tools in Your Groups</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {newTools.map((tool) => (
            <div key={tool.id} className="flex items-center justify-between space-x-3 p-3 rounded-lg border bg-card hover:bg-primary/[0.07] transition-colors">
              <div className="flex items-center space-x-3 flex-1">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={tool.image_url || undefined} alt={tool.name} />
                  <AvatarFallback>
                    <Hammer className="h-6 w-6" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{tool.name}</h4>
                  {(tool.brand || tool.power_source) && (
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {tool.brand && <span className="font-medium">{tool.brand}</span>}
                      {tool.power_source && (
                        <span className="flex items-center gap-1">
                          <Zap className="h-3 w-3" />
                          {toolPowerSourceLabels[tool.power_source as keyof typeof toolPowerSourceLabels]}
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-muted-foreground flex items-center gap-2">
                    <UserAvatar
                      displayName={tool.owner_name}
                      avatarUrl={tool.owner_avatar_url}
                      size="sm"
                    />
                    <span>Added by {tool.owner_name} in {tool.group_name}</span>
                  </p>
                  <div className="flex items-center text-xs text-muted-foreground mt-1">
                    <Clock className="h-3 w-3 mr-1" />
                    {new Date(tool.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => navigate(`/tools/${tool.id}`)}
              >
                View
              </Button>
            </div>
          ))}
          {newTools.length === 5 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/tools')}
              className="w-full"
            >
              View all tools
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
