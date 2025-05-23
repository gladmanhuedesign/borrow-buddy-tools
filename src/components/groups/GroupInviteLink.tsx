
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/use-toast";
import { Copy, Check } from "lucide-react";

interface GroupInviteLinkProps {
  groupId: string;
}

const GroupInviteLink = ({ groupId }: GroupInviteLinkProps) => {
  const [copied, setCopied] = useState(false);
  
  // Generate a mock invitation link
  const invitationLink = `${window.location.origin}/invite/${groupId}`;
  
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      toast({
        title: "Link copied",
        description: "Invitation link copied to clipboard",
      });
      
      setTimeout(() => {
        setCopied(false);
      }, 3000);
    } catch (error) {
      console.error("Failed to copy:", error);
      toast({
        title: "Copy failed",
        description: "Unable to copy the link to clipboard",
        variant: "destructive",
      });
    }
  };
  
  return (
    <div className="flex flex-col space-y-2">
      <label className="text-sm font-medium">Invitation Link</label>
      <div className="flex w-full max-w-sm items-center space-x-2">
        <Input
          value={invitationLink}
          readOnly
          className="flex-1"
        />
        <Button
          type="button"
          size="icon"
          onClick={copyToClipboard}
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Share this link to invite people to your group
      </p>
    </div>
  );
};

export default GroupInviteLink;
