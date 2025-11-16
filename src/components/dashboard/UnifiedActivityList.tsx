import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ArrowDownLeft, ArrowUpRight, Clock, MessageCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

type ActivityType = "borrowing" | "lending" | "pending_to_me" | "pending_from_me";

type ActivityItem = {
  id: string;
  type: ActivityType;
  tool_id: string;
  tool_name: string;
  tool_image: string | null;
  status: string;
  start_date?: string;
  end_date?: string;
  other_party_name: string;
  message?: string;
  unread_messages: number;
  total_messages: number;
  isOverdue?: boolean;
};

const getActivityBadge = (type: ActivityType) => {
  switch (type) {
    case "borrowing":
      return { label: "Borrowing", variant: "default" as const, icon: ArrowDownLeft };
    case "lending":
      return { label: "Lending", variant: "secondary" as const, icon: ArrowUpRight };
    case "pending_to_me":
      return { label: "Pending Request", variant: "default" as const, icon: Clock };
    case "pending_from_me":
      return { label: "Your Request", variant: "outline" as const, icon: Clock };
  }
};

const getStatusColor = (status: string, isOverdue: boolean) => {
  if (isOverdue) return "bg-destructive text-destructive-foreground";
  switch (status) {
    case "pending": return "bg-accent text-accent-foreground";
    case "approved": return "bg-accent text-accent-foreground";
    case "picked_up": return "bg-secondary text-secondary-foreground";
    case "return_pending": return "bg-primary/20 text-primary";
    default: return "bg-muted text-muted-foreground";
  }
};

const getStatusLabel = (status: string) => {
  switch (status) {
    case "pending": return "Pending";
    case "approved": return "Approved";
    case "picked_up": return "In Use";
    case "return_pending": return "Return Pending";
    case "overdue": return "Overdue";
    default: return status;
  }
};

export const UnifiedActivityList = () => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const { data: activities = [], isLoading, refetch } = useQuery({
    queryKey: ['unified-activities', currentUser?.id],
    queryFn: async () => {
      if (!currentUser) return [];

      const allActivities: ActivityItem[] = [];

      // Fetch borrowing items
      const { data: borrowing } = await supabase
        .from('tool_requests')
        .select(`
          id,
          status,
          start_date,
          end_date,
          tools (
            id,
            name,
            image_url,
            profiles (display_name)
          )
        `)
        .eq('requester_id', currentUser.id)
        .in('status', ['approved', 'picked_up', 'return_pending', 'overdue']);

      if (borrowing) {
        for (const item of borrowing) {
          const { count: unreadCount } = await supabase
            .from('request_messages')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', item.id)
            .eq('is_read', false)
            .neq('sender_id', currentUser.id);
          
          const { count: totalCount } = await supabase
            .from('request_messages')
            .select('*', { count: 'exact', head: true })
            .eq('request_id', item.id);

          const isOverdue = new Date(item.end_date) < new Date() && item.status !== 'returned';

          allActivities.push({
            id: item.id,
            type: 'borrowing',
            tool_id: (item.tools as any).id,
            tool_name: (item.tools as any).name,
            tool_image: (item.tools as any).image_url,
            status: item.status,
            start_date: item.start_date,
            end_date: item.end_date,
            other_party_name: (item.tools as any).profiles?.display_name || 'Unknown',
            unread_messages: unreadCount || 0,
            total_messages: totalCount || 0,
            isOverdue
          });
        }
      }

      // Fetch lending items
      const { data: tools } = await supabase
        .from('tools')
        .select('id')
        .eq('owner_id', currentUser.id);

      if (tools && tools.length > 0) {
        const toolIds = tools.map(t => t.id);
        
        const { data: lending } = await supabase
          .from('tool_requests')
          .select(`
            id,
            status,
            start_date,
            end_date,
            tools!inner (
              id,
              name,
              image_url
            ),
            profiles!tool_requests_requester_id_fkey (
              display_name
            )
          `)
          .in('tool_id', toolIds)
          .in('status', ['approved', 'picked_up', 'return_pending', 'overdue']);

        if (lending) {
          for (const item of lending) {
            const { count: unreadCount } = await supabase
              .from('request_messages')
              .select('*', { count: 'exact', head: true })
              .eq('request_id', item.id)
              .eq('is_read', false)
              .neq('sender_id', currentUser.id);
            
            const { count: totalCount } = await supabase
              .from('request_messages')
              .select('*', { count: 'exact', head: true })
              .eq('request_id', item.id);

            const isOverdue = new Date(item.end_date) < new Date() && item.status !== 'returned';

            allActivities.push({
              id: item.id,
              type: 'lending',
              tool_id: (item.tools as any).id,
              tool_name: (item.tools as any).name,
              tool_image: (item.tools as any).image_url,
              status: item.status,
              start_date: item.start_date,
              end_date: item.end_date,
              other_party_name: (item.profiles as any)?.display_name || 'Unknown',
              unread_messages: unreadCount || 0,
              total_messages: totalCount || 0,
              isOverdue
            });
          }
        }

        // Fetch pending requests to me
        const { data: pendingToMe } = await supabase
          .from('tool_requests')
          .select(`
            id,
            status,
            message,
            tools (
              id,
              name,
              image_url
            ),
            profiles (
              display_name
            )
          `)
          .in('tool_id', toolIds)
          .eq('status', 'pending');

        if (pendingToMe) {
          for (const item of pendingToMe) {
            allActivities.push({
              id: item.id,
              type: 'pending_to_me',
              tool_id: (item.tools as any).id,
              tool_name: (item.tools as any).name,
              tool_image: (item.tools as any).image_url,
              status: item.status,
              other_party_name: (item.profiles as any)?.display_name || 'Unknown',
              message: item.message || '',
              unread_messages: 0,
              total_messages: 0
            });
          }
        }
      }

      // Fetch pending requests from me
      const { data: pendingFromMe } = await supabase
        .from('tool_requests')
        .select(`
          id,
          status,
          message,
          tools (
            id,
            name,
            image_url,
            profiles (
              display_name
            )
          )
        `)
        .eq('requester_id', currentUser.id)
        .eq('status', 'pending');

      if (pendingFromMe) {
        for (const item of pendingFromMe) {
          allActivities.push({
            id: item.id,
            type: 'pending_from_me',
            tool_id: (item.tools as any).id,
            tool_name: (item.tools as any).name,
            tool_image: (item.tools as any).image_url,
            status: item.status,
            other_party_name: (item.tools as any).profiles?.display_name || 'Unknown',
            message: item.message || '',
            unread_messages: 0,
            total_messages: 0
          });
        }
      }

      return allActivities;
    },
    enabled: !!currentUser
  });

  const handleAction = async (requestId: string, action: 'approve' | 'deny' | 'cancel' | 'confirm_pickup' | 'initiate_return' | 'confirm_return') => {
    setProcessingId(requestId);
    
    try {
      let updateData: any = {};
      let successMessage = '';

      switch (action) {
        case 'approve':
          updateData = { status: 'approved' };
          successMessage = 'Request approved';
          break;
        case 'deny':
          updateData = { status: 'denied' };
          successMessage = 'Request denied';
          break;
        case 'cancel':
          updateData = { status: 'canceled' };
          successMessage = 'Request canceled';
          break;
        case 'confirm_pickup':
          updateData = { status: 'picked_up', picked_up_at: new Date().toISOString() };
          successMessage = 'Pickup confirmed';
          break;
        case 'initiate_return':
          updateData = { status: 'return_pending' };
          successMessage = 'Return initiated';
          break;
        case 'confirm_return':
          updateData = { status: 'returned', returned_at: new Date().toISOString() };
          successMessage = 'Return confirmed';
          break;
      }

      const { error } = await supabase
        .from('tool_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Success",
        description: successMessage,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">My Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl overflow-hidden animate-pulse">
                <Skeleton className="h-48 w-full" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (activities.length === 0) {
    return (
      <Card className="hover:shadow-lg transition-all duration-200">
        <CardHeader>
          <CardTitle className="text-xl font-semibold">My Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-10">No active borrowing, lending, or pending requests</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hover:shadow-lg transition-all duration-200">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">My Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {activities.map((activity) => {
            const badgeInfo = getActivityBadge(activity.type);
            const BadgeIcon = badgeInfo.icon;

            return (
              <div
                key={activity.id}
                onClick={() => navigate(`/requests/${activity.id}`)}
                className="group relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-xl border border-border"
              >
                {/* Image Section */}
                <div className="relative h-48 overflow-hidden bg-muted">
                  {activity.tool_image ? (
                    <img
                      src={activity.tool_image}
                      alt={activity.tool_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                      <span className="text-4xl font-bold text-primary/40">
                        {activity.tool_name.substring(0, 2).toUpperCase()}
                      </span>
                    </div>
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                  
                  {/* Type Badge */}
                  <div className="absolute top-3 left-3">
                    <Badge variant={badgeInfo.variant} className="flex items-center gap-1.5">
                      <BadgeIcon className="h-3 w-3" />
                      {badgeInfo.label}
                    </Badge>
                  </div>

                  {/* Status Badge - Show overdue OR status, not both */}
                  {activity.isOverdue ? (
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-destructive text-destructive-foreground">
                        Overdue
                      </Badge>
                    </div>
                  ) : activity.status !== 'pending' && (
                    <div className="absolute top-3 right-3">
                      <Badge className={cn(getStatusColor(activity.status, false))}>
                        {getStatusLabel(activity.status)}
                      </Badge>
                    </div>
                  )}

                  {/* Messages Indicator */}
                  {activity.unread_messages > 0 && (
                    <div className="absolute top-12 right-3">
                      <Badge className="bg-primary text-primary-foreground">
                        <MessageCircle className="h-3 w-3 mr-1" />
                        {activity.unread_messages}
                      </Badge>
                    </div>
                  )}
                </div>

                {/* Content Section */}
                <div className="p-5 space-y-3 bg-card">
                  <div>
                    <h3 className="font-semibold text-base truncate">{activity.tool_name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {activity.type === 'borrowing' ? `from ${activity.other_party_name}` : 
                       activity.type === 'lending' ? `to ${activity.other_party_name}` :
                       `by ${activity.other_party_name}`}
                    </p>
                  </div>

                  {activity.end_date && (
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5 mr-1.5" />
                      Due: {format(new Date(activity.end_date), "MMM d, yyyy")}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2" onClick={(e) => e.stopPropagation()}>
                    {activity.type === 'pending_to_me' && (
                      <>
                        <Button
                          size="sm"
                          className="flex-1"
                          onClick={() => handleAction(activity.id, 'approve')}
                          disabled={processingId === activity.id}
                        >
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAction(activity.id, 'deny')}
                          disabled={processingId === activity.id}
                        >
                          Deny
                        </Button>
                      </>
                    )}
                    {activity.type === 'pending_from_me' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleAction(activity.id, 'cancel')}
                        disabled={processingId === activity.id}
                      >
                        Cancel Request
                      </Button>
                    )}
                    {activity.type === 'borrowing' && activity.status === 'approved' && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAction(activity.id, 'confirm_pickup')}
                        disabled={processingId === activity.id}
                      >
                        Confirm Pickup
                      </Button>
                    )}
                    {activity.type === 'borrowing' && activity.status === 'picked_up' && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAction(activity.id, 'initiate_return')}
                        disabled={processingId === activity.id}
                      >
                        Initiate Return
                      </Button>
                    )}
                    {activity.type === 'lending' && activity.status === 'return_pending' && (
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleAction(activity.id, 'confirm_return')}
                        disabled={processingId === activity.id}
                      >
                        Confirm Return
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
