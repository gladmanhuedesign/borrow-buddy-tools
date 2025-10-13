
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toolStatusLabels } from "@/config/toolCategories";
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
}

const Tools = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

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

  const handleBatchAnalysis = async () => {
    setAnalyzing(true);
    try {
      const { data, error } = await supabase.functions.invoke('batch-analyze-tools');
      
      if (error) throw error;
      
      toast({
        title: "Analysis Complete",
        description: `Processed ${data.processed} tools, updated ${data.updated}, failed ${data.failed}`,
      });
      
      // Refresh the tools list
      const { data: toolsData } = await supabase
        .from('tools')
        .select('*')
        .eq('owner_id', currentUser?.id)
        .order('created_at', { ascending: false });
      
      setTools(toolsData || []);
    } catch (error: any) {
      console.error('Batch analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze tools",
        variant: "destructive",
      });
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Tools</h1>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={handleBatchAnalysis}
            disabled={analyzing || tools.length === 0}
          >
            <Sparkles className="mr-2 h-4 w-4" /> 
            {analyzing ? "Analyzing..." : "Auto-fill Brand & Power"}
          </Button>
          <Button onClick={() => navigate("/tools/add")}>
            <Plus className="mr-2 h-4 w-4" /> Add Tool
          </Button>
        </div>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.id} to={`/tools/${tool.id}`}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                {tool.image_url && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={tool.image_url}
                      alt={tool.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                <CardHeader>
                  <div className="flex justify-between">
                    <CardTitle className="line-clamp-1">{tool.name}</CardTitle>
                    <Badge variant={tool.status === "available" ? "outline" : "secondary"}>
                      {toolStatusLabels[tool.status as keyof typeof toolStatusLabels] || tool.status}
                    </Badge>
                  </div>
                  <CardDescription className="line-clamp-2">
                    {tool.description || "No description provided"}
                  </CardDescription>
                </CardHeader>
                <CardFooter>
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
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

export default Tools;
