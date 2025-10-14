
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
  brand: string | null;
  power_source: string | null;
};

export const useToolSearch = (searchTerm: string, enabled: boolean = true) => {
  const { currentUser } = useAuth();

  return useQuery({
    queryKey: ['tool-search', searchTerm, currentUser?.id],
    queryFn: async (): Promise<SearchResult[]> => {
      if (!currentUser?.id || !searchTerm.trim()) return [];

      console.log('Searching for:', searchTerm);

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

      // Split search term into individual words for flexible matching
      const searchWords = searchTerm.trim().split(/\s+/).filter(word => word.length > 0);

      // Build search query with AND logic for multiple words
      let toolsQuery = supabase
        .from('tools')
        .select(`
          id, 
          name, 
          description, 
          category_id, 
          owner_id, 
          status, 
          image_url,
          brand,
          power_source,
          tool_categories(name)
        `)
        .in('owner_id', memberIds);

      // Apply OR conditions for each word (search across all fields)
      // Each word must be found in at least one field (OR within word)
      // All words must be found (AND across words)
      searchWords.forEach(word => {
        toolsQuery = toolsQuery.or(
          `name.ilike.%${word}%,description.ilike.%${word}%,brand.ilike.%${word}%,power_source.ilike.%${word}%`
        );
      });

      const { data: toolsData, error: toolsError } = await toolsQuery
        .order('name', { ascending: true });

      if (toolsError) {
        console.error('Error searching tools:', toolsError);
        return [];
      }

      // Also search for tools by category name
      const { data: categorySearchData, error: categoryError } = await supabase
        .from('tool_categories')
        .select('id')
        .ilike('name', `%${searchTerm}%`);

      if (categoryError) {
        console.error('Error searching categories:', categoryError);
      }

      const categoryIds = categorySearchData?.map(cat => cat.id) || [];
      let categoryToolsData: any[] = [];

      if (categoryIds.length > 0) {
        const { data: catTools, error: catToolsError } = await supabase
          .from('tools')
          .select(`
            id, 
            name, 
            description, 
            category_id, 
            owner_id, 
            status, 
            image_url,
            brand,
            power_source,
            tool_categories(name)
          `)
          .in('owner_id', memberIds)
          .in('category_id', categoryIds)
          .order('name', { ascending: true });

        if (catToolsError) {
          console.error('Error searching tools by category:', catToolsError);
        } else {
          categoryToolsData = catTools || [];
        }
      }

      // Combine and deduplicate results
      const allTools = [...(toolsData || []), ...categoryToolsData];
      const uniqueTools = allTools.filter((tool, index, self) => 
        index === self.findIndex(t => t.id === tool.id)
      );

      console.log('Found tools:', uniqueTools.length);

      if (!uniqueTools || uniqueTools.length === 0) return [];

      // Get additional data
      const ownerIds = [...new Set(uniqueTools.map(tool => tool.owner_id))];
      const categoryIds2 = [...new Set(uniqueTools.map(tool => tool.category_id).filter(Boolean))];

      const [ownersResponse, categoriesResponse, groupsResponse] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name')
          .in('id', ownerIds),
        categoryIds2.length > 0 ? supabase
          .from('tool_categories')
          .select('id, name')
          .in('id', categoryIds2) : Promise.resolve({ data: [] }),
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
      return uniqueTools.map(tool => ({
        id: tool.id,
        name: tool.name,
        description: tool.description || '',
        category_name: tool.tool_categories?.name || categoriesMap.get(tool.category_id || '') || null,
        group_name: groupsMap.get(userGroupMap.get(tool.owner_id) || '') || 'Unknown Group',
        owner_name: ownersMap.get(tool.owner_id) || 'Unknown User',
        status: tool.status,
        image_url: tool.image_url,
        owner_id: tool.owner_id,
        group_id: userGroupMap.get(tool.owner_id) || '',
        brand: tool.brand || null,
        power_source: tool.power_source || null
      }));
    },
    enabled: enabled && !!currentUser?.id && !!searchTerm.trim()
  });
};
