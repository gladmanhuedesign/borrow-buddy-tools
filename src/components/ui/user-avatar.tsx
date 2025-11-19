import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getAvatarInitials, getAvatarColor } from "@/utils/avatarUtils";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  displayName: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-16 w-16 text-lg",
};

export function UserAvatar({
  displayName,
  avatarUrl,
  size = "md",
  className,
}: UserAvatarProps) {
  const initials = getAvatarInitials(displayName);
  const bgColor = getAvatarColor(displayName);

  return (
    <Avatar className={cn(sizeClasses[size], className)}>
      {avatarUrl && (
        <AvatarImage src={avatarUrl} alt={displayName} />
      )}
      <AvatarFallback className={cn(bgColor, "text-white font-semibold")}>
        {initials}
      </AvatarFallback>
    </Avatar>
  );
}
