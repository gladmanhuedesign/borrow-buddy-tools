
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          onClick={() => navigate("/tools/add")}
          className="w-full h-auto py-4 text-left flex items-center justify-start space-x-4"
        >
          <PlusCircle className="h-5 w-5" /> 
          <div>
            <div className="font-semibold">Add a Tool</div>
            <div className="text-xs text-muted">Share your tools with your groups</div>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};
