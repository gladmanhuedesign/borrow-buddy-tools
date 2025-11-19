
import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Hammer } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToolSearch } from "@/hooks/useToolSearch";
import { cn } from "@/lib/utils";

export const SearchInput = ({ onNavigate }: { onNavigate?: () => void } = {}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [showResults, setShowResults] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);

  const { data: searchResults = [], isLoading } = useToolSearch(
    searchTerm,
    searchTerm.length >= 2
  );

  const topResults = searchResults.slice(0, 5);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        resultsRef.current &&
        !resultsRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || topResults.length === 0) {
      if (e.key === "Enter" && searchTerm.trim()) {
        handleSearch();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex(prev => (prev < topResults.length - 1 ? prev + 1 : prev));
        break;
      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex(prev => (prev > 0 ? prev - 1 : -1));
        break;
      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < topResults.length) {
          handleResultClick(topResults[selectedIndex].id);
        } else {
          handleSearch();
        }
        break;
      case "Escape":
        setShowResults(false);
        setSelectedIndex(-1);
        break;
    }
  };

  const handleSearch = () => {
    if (searchTerm.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`);
      setShowResults(false);
      inputRef.current?.blur();
      onNavigate?.();
    }
  };

  const handleResultClick = (toolId: string) => {
    navigate(`/tools/${toolId}`);
    setShowResults(false);
    setSearchTerm("");
    onNavigate?.();
  };

  const handleInputChange = (value: string) => {
    setSearchTerm(value);
    setSelectedIndex(-1);
    setShowResults(value.length >= 2);
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="Search tools..."
          value={searchTerm}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (searchTerm.length >= 2) {
              setShowResults(true);
            }
          }}
          className="pl-10 pr-4"
        />
      </div>

      {showResults && (
        <div
          ref={resultsRef}
          className="absolute top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg z-50 max-h-80 overflow-y-auto"
        >
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Searching...
            </div>
          ) : topResults.length > 0 ? (
            <>
              {topResults.map((tool, index) => (
                <button
                  key={tool.id}
                  onClick={() => handleResultClick(tool.id)}
                  className={cn(
                    "w-full flex items-center gap-3 p-3 text-left hover:bg-primary/8 transition-colors",
                    selectedIndex === index && "bg-primary/8"
                  )}
                >
                  <div className="h-12 w-12 rounded-md overflow-hidden bg-muted flex-shrink-0">
                    {tool.image_url ? (
                      <img src={tool.image_url} alt={tool.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Hammer className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{tool.name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {tool.group_name} • {tool.category_name || 'Uncategorized'}
                    </div>
                  </div>
                  <div className={cn(
                    "text-xs px-2 py-1 rounded-full",
                    tool.status === 'available' ? "bg-green-100 text-green-800" :
                    tool.status === 'borrowed' ? "bg-yellow-100 text-yellow-800" :
                    "bg-gray-100 text-gray-800"
                  )}>
                    {tool.status}
                  </div>
                </button>
              ))}
              {searchResults.length > 5 && (
                <div className="border-t">
                  <Button
                    variant="ghost"
                    onClick={handleSearch}
                    className="w-full justify-center text-sm text-muted-foreground hover:text-foreground"
                  >
                    View all {searchResults.length} results
                  </Button>
                </div>
              )}
            </>
          ) : searchTerm.length >= 2 ? (
            <div className="p-4 text-center text-muted-foreground">
              No tools found for "{searchTerm}"
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};
