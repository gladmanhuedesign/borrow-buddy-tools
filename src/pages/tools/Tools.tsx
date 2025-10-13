
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toolStatusLabels, toolPowerSourceLabels } from "@/config/toolCategories";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/components/ui/use-toast";

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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {tools.map((tool) => (
            <Link key={tool.id} to={`/tools/${tool.id}`}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                {tool.image_url && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={tool.image_url}
                      alt={tool.name}
                      className="h-full w-full object-contain bg-muted"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle className="line-clamp-1">{tool.name}</CardTitle>
                    <Badge variant={
                      tool.status === "available" ? "outline" : 
                      tool.status === "unavailable" ? "destructive" : 
                      "secondary"
                    }>
                      {toolStatusLabels[tool.status as keyof typeof toolStatusLabels] || tool.status}
                    </Badge>
                  </div>
                  {(tool.brand || tool.power_source) && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {tool.brand && (
                        <Badge variant="secondary" className="text-sm font-semibold">
                          {tool.brand}
                        </Badge>
                      )}
                      {tool.power_source && (
                        <Badge variant="outline" className="text-sm flex items-center gap-1.5">
                          <Zap className="h-3.5 w-3.5" />
                          {toolPowerSourceLabels[tool.power_source as keyof typeof toolPowerSourceLabels]}
                        </Badge>
                      )}
                     </div>
                   )}
                 </CardHeader>
               </Card>
             </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export default Tools;
