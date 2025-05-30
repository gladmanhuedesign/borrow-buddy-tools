
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

type FilterOptions = {
  categories: string[];
  groups: string[];
  statuses: string[];
};

export const useFilterOptions = () => {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['filter-options', currentUser?.id],
    queryFn: async (): Promise<FilterOptions> => {
      if (!currentUser?.id) {
        return { categories: [], groups: [], statuses: [] };
      }

      // Get user's groups
      const { data: userGroups, error: groupsError } = await supabase
        .from('group_members')
        .select('group_id')
        .eq('user_id', currentUser.id);

      if (groupsError) {
        console.error('Error fetching user groups:', groupsError);
        return { categories: [], groups: [], statuses: [] };
      }

      const groupIds = userGroups?.map(g => g.group_id) || [];

      // Get all members from user's groups
      const { data: groupMembers, error: membersError } = await supabase
        .from('group_members')
        .select('user_id, group_id')
        .in('group_id', groupIds);

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        return { categories: [], groups: [], statuses: [] };
      }

      const memberIds = [...new Set(groupMembers?.map(m => m.user_id) || [])];

      // Get all tools from group members to extract filter options
      const { data: toolsData, error: toolsError } = await supabase
        .from('tools')
        .select(`
          category_id,
          status,
          tool_categories(name)
        `)
        .in('owner_id', memberIds);

      if (toolsError) {
        console.error('Error fetching tools for filters:', toolsError);
        return { categories: [], groups: [], statuses: [] };
      }

      // Get group names
      const { data: groupsData, error: groupNamesError } = await supabase
        .from('groups')
        .select('name')
        .in('id', groupIds);

      if (groupNamesError) {
        console.error('Error fetching group names:', groupNamesError);
        return { categories: [], groups: [], statuses: [] };
      }

      // Extract unique values
      const categories = [...new Set(
        toolsData
          ?.map(tool => tool.tool_categories?.name)
          .filter(Boolean) || []
      )] as string[];

      const groups = [...new Set(
        groupsData?.map(group => group.name).filter(Boolean) || []
      )] as string[];

      const statuses = [...new Set(
        toolsData?.map(tool => tool.status).filter(Boolean) || []
      )] as string[];

      return {
        categories: categories.sort(),
        groups: groups.sort(),
        statuses: statuses.sort()
      };
    },
    enabled: !!currentUser?.id
  });
};
