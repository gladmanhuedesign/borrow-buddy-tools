
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { 
  Users, 
  Hammer, 
  Check, 
  X, 
  Clock 
} from "lucide-react";

interface NotificationItemProps {
  notification: Notification;
  onClose?: () => void;
}

export const NotificationItem = ({ notification, onClose }: NotificationItemProps) => {
  const { markAsRead } = useNotifications();
  const navigate = useNavigate();

  const getIcon = () => {
    switch (notification.type) {
      case 'tool_request':
        return <Hammer className="h-4 w-4 text-blue-500" />;
      case 'request_approved':
        return <Check className="h-4 w-4 text-green-500" />;
      case 'request_denied':
        return <X className="h-4 w-4 text-red-500" />;
      case 'group_invite':
        return <Users className="h-4 w-4 text-purple-500" />;
      default:
        return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const handleClick = async () => {
    // Mark as read if not already read
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    // Close dropdown
    if (onClose) {
      onClose();
    }

    // Navigate based on notification type
    switch (notification.type) {
      case 'tool_request':
      case 'request_approved':
      case 'request_denied':
      case 'message':
      case 'new_message':
        if (notification.data?.request_id) {
          navigate(`/requests/${notification.data.request_id}`);
        } else {
          navigate('/requests');
        }
        break;
      case 'group_invite':
        navigate('/groups/invitations');
        break;
      case 'tool_returned':
      case 'return_pending':
        if (notification.data?.request_id) {
          navigate(`/requests/${notification.data.request_id}`);
        } else {
          navigate('/requests');
        }
        break;
      default:
        // If there's a request_id in data, navigate to it
        if (notification.data?.request_id) {
          navigate(`/requests/${notification.data.request_id}`);
        }
        break;
    }
  };

  const timeAgo = formatDistanceToNow(new Date(notification.created_at), { 
    addSuffix: true 
  });

  return (
    <div
      onClick={handleClick}
      className={cn(
        "p-4 cursor-pointer hover:bg-muted/50 transition-colors",
        !notification.read && "bg-primary/10 border-l-2 border-l-primary"
      )}
    >
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h4 className={cn(
              "text-sm truncate",
              !notification.read && "font-semibold"
            )}>
              {notification.title}
            </h4>
            {!notification.read && (
              <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0" />
            )}
          </div>
          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
            {notification.message}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {timeAgo}
          </p>
        </div>
      </div>
    </div>
  );
};
