
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, MoreHorizontal, ShieldAlert, UserMinus, UserCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  profile: {
    display_name: string;
  };
}

interface MemberManagementProps {
  groupId: string;
  members: Member[];
  userRole: string | null;
  isCreator: boolean;
  onMembersChange: () => void;
}

const MemberManagement = ({
  groupId,
  members,
  userRole,
  isCreator,
  onMembersChange
}: MemberManagementProps) => {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [actionMember, setActionMember] = useState<Member | null>(null);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [confirmAction, setConfirmAction] = useState<'remove' | 'promote' | 'demote' | null>(null);
  const [processing, setProcessing] = useState(false);

  const canManageRoles = isCreator || userRole === 'admin';
  
  const handleAction = (action: 'remove' | 'promote' | 'demote', member: Member) => {
    setActionMember(member);
    setConfirmAction(action);
    setConfirmDialogOpen(true);
  };

  const handleConfirm = async () => {
    if (!actionMember || !confirmAction) return;
    
    setProcessing(true);
    
    try {
      if (confirmAction === 'remove') {
        // Remove member from group
        const { error } = await supabase
          .from('group_members')
          .delete()
          .eq('id', actionMember.id);
        
        if (error) throw error;
        
        toast({
          title: "Member removed",
          description: `${actionMember.profile.display_name} has been removed from the group.`,
        });
      } 
      else if (confirmAction === 'promote') {
        // Promote member to admin
        const { error } = await supabase
          .from('group_members')
          .update({ role: 'admin' })
          .eq('id', actionMember.id);
        
        if (error) throw error;
        
        toast({
          title: "Role updated",
          description: `${actionMember.profile.display_name} is now an admin.`,
        });
      }
      else if (confirmAction === 'demote') {
        // Demote admin to member
        const { error } = await supabase
          .from('group_members')
          .update({ role: 'member' })
          .eq('id', actionMember.id);
        
        if (error) throw error;
        
        toast({
          title: "Role updated",
          description: `${actionMember.profile.display_name} is now a member.`,
        });
      }
      
      onMembersChange();
      setConfirmDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Action failed",
        description: error.message || "An error occurred while processing your request.",
        variant: "destructive",
      });
      console.error('Member management error:', error);
    } finally {
      setProcessing(false);
    }
  };

  const getDialogContent = () => {
    if (!actionMember || !confirmAction) return null;
    
    const memberName = actionMember.profile.display_name;
    
    switch (confirmAction) {
      case 'remove':
        return {
          title: "Remove Member",
          description: `Are you sure you want to remove ${memberName} from this group?`
        };
      case 'promote':
        return {
          title: "Promote to Admin",
          description: `Are you sure you want to make ${memberName} an admin? They will be able to manage members and group settings.`
        };
      case 'demote':
        return {
          title: "Remove Admin Role",
          description: `Are you sure you want to change ${memberName}'s role to member? They will no longer have admin privileges.`
        };
      default:
        return {
          title: "Confirm Action",
          description: "Are you sure you want to perform this action?"
        };
    }
  };

  const dialogContent = getDialogContent();

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Joined</TableHead>
            {canManageRoles && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {members.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-medium">
                {member.profile.display_name}
                {member.user_id === currentUser?.id && " (You)"}
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  {member.role === 'admin' && (
                    <ShieldAlert className="h-3.5 w-3.5 text-amber-500" />
                  )}
                  <span className="capitalize">{member.role}</span>
                </div>
              </TableCell>
              <TableCell>
                {new Date(member.joined_at).toLocaleDateString()}
              </TableCell>
              {canManageRoles && (
                <TableCell className="text-right">
                  {/* Don't show actions for the group creator or for yourself if you're not the creator */}
                  {(isCreator || (member.user_id !== currentUser?.id)) && 
                   member.role !== 'creator' && 
                   !(member.user_id === currentUser?.id && !isCreator) && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {member.role === 'member' ? (
                          <DropdownMenuItem 
                            onClick={() => handleAction('promote', member)}
                            className="cursor-pointer"
                          >
                            <UserCheck className="mr-2 h-4 w-4" />
                            Make Admin
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem 
                            onClick={() => handleAction('demote', member)}
                            className="cursor-pointer"
                          >
                            <ShieldAlert className="mr-2 h-4 w-4" />
                            Remove Admin Role
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem 
                          onClick={() => handleAction('remove', member)}
                          className="cursor-pointer text-destructive focus:text-destructive"
                        >
                          <UserMinus className="mr-2 h-4 w-4" />
                          Remove from Group
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Confirm Dialog */}
      <Dialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogContent?.title}</DialogTitle>
            <DialogDescription>
              {dialogContent?.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setConfirmDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={confirmAction === 'remove' ? "destructive" : "default"}
              onClick={handleConfirm}
              disabled={processing}
            >
              {processing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                confirmAction === 'remove' ? 'Remove' : 'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MemberManagement;
