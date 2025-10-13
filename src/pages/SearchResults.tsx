
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import { Search, Filter, Hammer, Zap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToolSearch } from "@/hooks/useToolSearch";
import { useFilterOptions } from "@/hooks/useFilterOptions";
import { toolPowerSourceLabels } from "@/config/toolCategories";
import { cn } from "@/lib/utils";

const SearchResults = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const initialQuery = searchParams.get('q') || '';
  
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const { data: searchResults = [], isLoading } = useToolSearch(
    searchTerm,
    searchTerm.length >= 2
  );

  const { data: filterOptions = { categories: [], groups: [], statuses: [] } } = useFilterOptions();

  // Get unique values for filters from search results (for dynamic filtering)
  const searchBasedCategories = useMemo(() => {
    const categories = searchResults
      .map(tool => tool.category_name)
      .filter(Boolean);
    return [...new Set(categories)] as string[];
  }, [searchResults]);

  const searchBasedGroups = useMemo(() => {
    const groups = searchResults
      .map(tool => tool.group_name)
      .filter(Boolean);
    return [...new Set(groups)] as string[];
  }, [searchResults]);

  const searchBasedStatuses = useMemo(() => {
    const statuses = searchResults
      .map(tool => tool.status)
      .filter(Boolean);
    return [...new Set(statuses)] as string[];
  }, [searchResults]);

  // Use search-based filters if we have search results, otherwise use default filter options
  const availableCategories = searchTerm && searchResults.length > 0 ? searchBasedCategories : filterOptions.categories;
  const availableGroups = searchTerm && searchResults.length > 0 ? searchBasedGroups : filterOptions.groups;
  const availableStatuses = searchTerm && searchResults.length > 0 ? searchBasedStatuses : filterOptions.statuses;

  // Apply filters
  const filteredResults = useMemo(() => {
    return searchResults.filter(tool => {
      if (categoryFilter !== 'all' && tool.category_name !== categoryFilter) {
        return false;
      }
      if (groupFilter !== 'all' && tool.group_name !== groupFilter) {
        return false;
      }
      if (statusFilter !== 'all' && tool.status !== statusFilter) {
        return false;
      }
      return true;
    });
  }, [searchResults, categoryFilter, groupFilter, statusFilter]);

  const handleSearch = () => {
    if (searchTerm.trim()) {
      setSearchParams({ q: searchTerm.trim() });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const resetFilters = () => {
    setCategoryFilter('all');
    setGroupFilter('all');
    setStatusFilter('all');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'borrowed':
        return 'bg-yellow-100 text-yellow-800';
      case 'unavailable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col space-y-4">
        <h1 className="text-3xl font-bold">Search Tools</h1>
        
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch}>
            Search
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4" />
            <span className="text-sm font-medium">Filters:</span>
          </div>
          
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {availableCategories.map(category => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Group" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Groups</SelectItem>
              {availableGroups.map(group => (
                <SelectItem key={group} value={group}>
                  {group}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              {availableStatuses.map(status => (
                <SelectItem key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {(categoryFilter !== 'all' || groupFilter !== 'all' || statusFilter !== 'all') && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Clear Filters
            </Button>
          )}
        </div>
      </div>

      {/* Results */}
      <div className="space-y-4">
        {searchTerm && (
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {isLoading ? 'Searching...' : 
               `${filteredResults.length} result${filteredResults.length !== 1 ? 's' : ''} for "${searchTerm}"`}
            </p>
          </div>
        )}

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <div className="h-12 w-12 bg-gray-200 rounded-full"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredResults.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredResults.map((tool) => (
              <Card key={tool.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent 
                  className="p-4"
                  onClick={() => navigate(`/tools/${tool.id}`)}
                >
                  <div className="flex items-start space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={tool.image_url || undefined} alt={tool.name} />
                      <AvatarFallback>
                        <Hammer className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0 space-y-2">
                      <div>
                        <h3 className="font-medium text-sm truncate">{tool.name}</h3>
                        <p className="text-xs text-muted-foreground truncate">
                          {tool.description}
                        </p>
                        {(tool.brand || tool.power_source) && (
                          <div className="flex gap-2 mt-1 text-xs text-muted-foreground">
                            {tool.brand && <span className="font-medium">{tool.brand}</span>}
                            {tool.power_source && (
                              <span className="flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                {toolPowerSourceLabels[tool.power_source as keyof typeof toolPowerSourceLabels]}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="text-muted-foreground">
                            {tool.group_name}
                          </div>
                          <div className="text-muted-foreground">
                            by {tool.owner_name}
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          {tool.category_name && (
                            <Badge variant="outline" className="text-xs">
                              {tool.category_name}
                            </Badge>
                          )}
                          <Badge className={cn("text-xs", getStatusColor(tool.status))}>
                            {tool.status}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : searchTerm ? (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No tools found</h3>
            <p className="text-muted-foreground">
              Try adjusting your search terms or filters
            </p>
          </div>
        ) : (
          <div className="text-center py-12">
            <Search className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Search for tools</h3>
            <p className="text-muted-foreground">
              Enter a search term to find tools in your groups
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchResults;
