
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, User, Calendar, CheckCircle, XCircle, Package, RotateCcw } from "lucide-react";

interface ToolHistoryProps {
  toolId: string;
}

interface HistoryEntry {
  id: string;
  action_type: string;
  action_by: string;
  borrower_name: string;
  action_by_name: string;
  start_date: string | null;
  end_date: string | null;
  actual_pickup_date: string | null;
  actual_return_date: string | null;
  notes: string | null;
  created_at: string;
}

const actionIcons = {
  pending: Clock,
  approved: CheckCircle,
  denied: XCircle,
  picked_up: Package,
  return_pending: RotateCcw,
  returned: CheckCircle,
  canceled: XCircle,
  overdue: Clock,
};

const actionLabels = {
  pending: "Requested",
  approved: "Approved",
  denied: "Denied",
  picked_up: "Picked Up",
  return_pending: "Return Requested",
  returned: "Returned",
  canceled: "Canceled",
  overdue: "Overdue",
};

const actionColors = {
  pending: "default",
  approved: "default",
  denied: "destructive",
  picked_up: "default",
  return_pending: "secondary",
  returned: "default",
  canceled: "destructive",
  overdue: "destructive",
} as const;

export const ToolHistory = ({ toolId }: ToolHistoryProps) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['toolHistory', toolId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tool_history')
        .select(`
          id,
          action_type,
          action_by,
          start_date,
          end_date,
          actual_pickup_date,
          actual_return_date,
          notes,
          created_at,
          borrower:borrower_id (
            display_name
          ),
          action_performer:action_by (
            display_name
          )
        `)
        .eq('tool_id', toolId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(entry => ({
        id: entry.id,
        action_type: entry.action_type,
        action_by: entry.action_by,
        borrower_name: entry.borrower?.display_name || 'Unknown User',
        action_by_name: entry.action_performer?.display_name || 'Unknown User',
        start_date: entry.start_date,
        end_date: entry.end_date,
        actual_pickup_date: entry.actual_pickup_date,
        actual_return_date: entry.actual_return_date,
        notes: entry.notes,
        created_at: entry.created_at,
      })) as HistoryEntry[];
    },
    enabled: !!toolId
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Borrowing History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading history...</p>
        </CardContent>
      </Card>
    );
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Borrowing History</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">No borrowing history yet.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Borrowing History ({history.length})</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {history.map((entry) => {
          const Icon = actionIcons[entry.action_type as keyof typeof actionIcons] || Clock;
          
          return (
            <div key={entry.id} className="flex items-start space-x-4 p-4 border rounded-lg">
              <div className="flex-shrink-0">
                <Icon className="h-5 w-5 text-muted-foreground" />
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={actionColors[entry.action_type as keyof typeof actionColors]}>
                    {actionLabels[entry.action_type as keyof typeof actionLabels]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(entry.created_at), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4" />
                    <span>By: <strong>{entry.action_by_name}</strong></span>
                    {entry.borrower_name !== entry.action_by_name && (
                      <span>• Borrower: <strong>{entry.borrower_name}</strong></span>
                    )}
                  </div>
                  
                  {(entry.start_date || entry.end_date) && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {entry.start_date && format(new Date(entry.start_date), 'MMM d')} 
                        {entry.start_date && entry.end_date && ' - '}
                        {entry.end_date && format(new Date(entry.end_date), 'MMM d, yyyy')}
                      </span>
                    </div>
                  )}
                  
                  {entry.actual_pickup_date && (
                    <div className="text-sm text-muted-foreground">
                      Picked up: {format(new Date(entry.actual_pickup_date), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                  
                  {entry.actual_return_date && (
                    <div className="text-sm text-muted-foreground">
                      Returned: {format(new Date(entry.actual_return_date), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                  
                  {entry.notes && (
                    <div className="text-sm bg-gray-50 p-2 rounded">
                      <strong>Note:</strong> {entry.notes}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};
