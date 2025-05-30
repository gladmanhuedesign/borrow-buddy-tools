
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type SearchResult = {
  id: string;
  name: string;
  description: string;
  category_name: string | null;
  group_name: string;
  owner_name: string;
  status: string;
  image_url: string | null;
  owner_id: string;
  group_id: string;
};

export const useToolSearch = (searchTerm: string, enabled: boolean = true) => {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['tool-search', searchTerm, currentUser?.id],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!currentUser?.id || !searchTerm.trim()) return [];

      // Get user's groups
      const { data: userGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUser.id);

      if (groupsError) {
        console.error('Error fetching user groups:', groupsError);
        return [];
      }

      const groupIds = userGroups?.map(g => g.group_id) || [];

      // Get all members from user's groups
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .in('group_id', groupIds);

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        return [];
      }

      const memberIds = [...new Set(groupMembers?.map(m => m.user_id) || [])];

      // Search tools (user's own tools + tools from group members)
      // Use left join to include tools without categories
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select(`
          id, 
          name, 
          description, 
          category_id, 
          owner_id, 
          status, 
          image_url,
          tool_categories(name)
        `)
        .in('owner_id', memberIds)
        .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,tool_categories.name.ilike.%${searchTerm}%`)
        .order('name', { ascending: true });

      if (toolsError) {
        console.error('Error searching tools:', toolsError);
        return [];
      }

      if (!toolsData || toolsData.length === 0) return [];

      // Get additional data
      const ownerIds = [...new Set(toolsData.map(tool => tool.owner_id))];
      const categoryIds = [...new Set(toolsData.map(tool => tool.category_id).filter(Boolean))];

      const [ownersResponse, categoriesResponse, groupsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ownerIds),
        categoryIds.length > 0 ? supabase
          .from('tool_categories')
          .select('id, name')
          .in('id', categoryIds) : Promise.resolve({ data: [] }),
        supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds)
      ]);

      // Create lookup maps
      const ownersMap = new Map(
        (ownersResponse.data || []).map(owner => [owner.id, owner.display_name])
      );
      const categoriesMap = new Map(
        (categoriesResponse.data || []).map(category => [category.id, category.name])
      );
      const groupsMap = new Map(
        (groupsResponse.data || []).map(group => [group.id, group.name])
      );

      // Create user to group mapping
      const userGroupMap = new Map<string, string>();
      (groupMembers || []).forEach(member => {
        if (!userGroupMap.has(member.user_id)) {
          userGroupMap.set(member.user_id, member.group_id);
        }
      });

      // Combine the data
      return toolsData.map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description || '',
        category_name: tool.tool_categories?.name || categoriesMap.get(tool.category_id || '') || null,
        group_name: groupsMap.get(userGroupMap.get(tool.owner_id) || '') || 'Unknown Group',
        owner_name: ownersMap.get(tool.owner_id) || 'Unknown User',
        status: tool.status,
        image_url: tool.image_url,
        owner_id: tool.owner_id,
        group_id: userGroupMap.get(tool.owner_id) || ''
      }));
    },
    enabled: enabled && !!currentUser?.id && !!searchTerm.trim()
  });
};
