
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, User, Calendar, CheckCircle, XCircle, Package, RotateCcw } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

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
          profiles!tool_history_borrower_id_fkey (
            display_name
          ),
          action_performer:profiles!tool_history_action_by_fkey (
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
        borrower_name: entry.profiles?.display_name || 'Unknown User',
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
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Action</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>By</TableHead>
              <TableHead>Borrower</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Details</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((entry) => {
              const Icon = actionIcons[entry.action_type as keyof typeof actionIcons] || Clock;
              
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <Badge variant={actionColors[entry.action_type as keyof typeof actionColors]}>
                        {actionLabels[entry.action_type as keyof typeof actionLabels]}
                      </Badge>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="text-sm">
                      {format(new Date(entry.created_at), 'MMM d, yyyy')}
                      <div className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), 'h:mm a')}
                      </div>
                    </div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-medium">{entry.action_by_name}</div>
                  </TableCell>
                  
                  <TableCell>
                    <div className="font-medium">{entry.borrower_name}</div>
                  </TableCell>
                  
                  <TableCell>
                    {(entry.start_date || entry.end_date) && (
                      <div className="text-sm">
                        {entry.start_date && format(new Date(entry.start_date), 'MMM d')} 
                        {entry.start_date && entry.end_date && ' - '}
                        {entry.end_date && format(new Date(entry.end_date), 'MMM d, yyyy')}
                      </div>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <div className="space-y-1 text-sm">
                      {entry.actual_pickup_date && (
                        <div className="text-muted-foreground">
                          Picked up: {format(new Date(entry.actual_pickup_date), 'MMM d, h:mm a')}
                        </div>
                      )}
                      
                      {entry.actual_return_date && (
                        <div className="text-muted-foreground">
                          Returned: {format(new Date(entry.actual_return_date), 'MMM d, h:mm a')}
                        </div>
                      )}
                      
                      {entry.notes && (
                        <div className="text-xs bg-gray-50 p-1 rounded">
                          {entry.notes}
                        </div>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};
