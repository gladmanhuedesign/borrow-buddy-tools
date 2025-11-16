
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";

export const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          variant="action"
          onClick={() => navigate("/tools/add")}
          className="w-full h-auto py-5 md:py-6 text-left flex items-center justify-start space-x-4"
        >
          <PlusCircle className="h-6 w-6" /> 
          <div>
            <div className="font-semibold text-base">Add a Tool</div>
            <div className="text-sm text-action-foreground/80">Share your tools with your groups</div>
          </div>
        </Button>
      </CardContent>
    </Card>
  );
};
