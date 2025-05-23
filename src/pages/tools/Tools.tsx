
import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tool } from "@/types";
import { toolStatusLabels } from "@/config/toolCategories";

const Tools = () => {
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // This will be replaced with actual data fetching
    const fetchTools = async () => {
      try {
        // Mock data for now
        setTools([]);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching tools:", error);
        setLoading(false);
      }
    };
    
    fetchTools();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">My Tools</h1>
        <Button onClick={() => navigate("/tools/add")}>
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {tools.map((tool) => (
            <Link key={tool.id} to={`/tools/${tool.id}`}>
              <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
                {tool.imageUrl && (
                  <div className="aspect-video w-full overflow-hidden">
                    <img
                      src={tool.imageUrl}
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
                    {tool.description}
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
