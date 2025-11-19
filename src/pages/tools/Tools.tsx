
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Zap, Hammer } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toolStatusLabels, toolPowerSourceLabels } from "@/config/toolCategories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";
import { UserAvatar } from "@/components/ui/user-avatar";
import { useProfile } from "@/hooks/useProfile";

interface Tool {
  id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  status: string;
  image_url: string | null;
  created_at: string;
  brand: string | null;
  power_source: string | null;
}

const Tools = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { profile } = useProfile();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserTools = async () => {
      if (!currentUser) return;
      
      try {
        console.log("Fetching tools for user:", currentUser.id);
        
        const { data: toolsData, error } = await supabase
          .from('tools')
          .select('*')
          .eq('owner_id', currentUser.id)
          .order('created_at', { ascending: false });

        if (error) {
          console.error("Error fetching tools:", error);
          toast({
            title: "Error",
            description: "Failed to load your tools.",
            variant: "destructive",
          });
          return;
        }

        console.log("Fetched tools:", toolsData);
        setTools(toolsData || []);
      } catch (error) {
        console.error("Error fetching tools:", error);
        toast({
          title: "Error",
          description: "Failed to load your tools.",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUserTools();
  }, [currentUser]);


  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h1 className="text-2xl font-bold">My Tools</h1>
        <Button onClick={() => navigate("/tools/add")} className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add Tool
        </Button>
      </div>
      
      {loading ? (
        <div className="flex justify-center p-8">
          <div className="animate-pulse">Loading tools...</div>
        </div>
      ) : tools.length === 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-center">No Tools Listed</CardTitle>
            <CardDescription className="text-center">
              You haven't added any tools to share yet
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Button onClick={() => navigate("/tools/add")}>
              <Plus className="mr-2 h-4 w-4" /> Add Your First Tool
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tools.map((tool) => (
            <Link key={tool.id} to={`/tools/${tool.id}`}>
              <div className="group relative h-[320px] rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02]">
                {/* Full Height Image Section */}
                <div className="absolute inset-0 bg-background/5">
                  {tool.image_url ? (
                    <img
                      src={tool.image_url}
                      alt={tool.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <Hammer className="h-16 w-16 text-primary/40" />
                    </div>
                  )}
                  
                  {/* Smooth Vertical Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 via-40% to-transparent" />
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 right-3">
                    <Badge variant={
                      tool.status === 'available' ? 'secondary' :
                      tool.status === 'borrowed' ? 'default' :
                      'destructive'
                    }>
                      {toolStatusLabels[tool.status as keyof typeof toolStatusLabels] || tool.status}
                    </Badge>
                  </div>

                  {/* Tool Info - Overlaid on image */}
                  <div className="absolute inset-x-0 bottom-0 p-5 space-y-2">
                    <h3 className="font-bold text-lg text-white drop-shadow-lg leading-tight">{tool.name}</h3>
                    <div className="space-y-1">
                      {(tool.brand || tool.power_source) && (
                        <div className="flex gap-2 text-sm text-white/95 drop-shadow-md">
                          {tool.brand && <span className="font-medium">{tool.brand}</span>}
                          {tool.power_source && (
                            <span className="flex items-center gap-1">
                              <Zap className="h-3.5 w-3.5" />
                              {toolPowerSourceLabels[tool.power_source as keyof typeof toolPowerSourceLabels]}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-xs text-white/80 drop-shadow-md">
                        <UserAvatar
                          displayName={currentUser?.displayName || "You"}
                          avatarUrl={profile?.avatar_url}
                          size="sm"
                          className="h-6 w-6 text-xs"
                        />
                        <span>Owned by you</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tools;
