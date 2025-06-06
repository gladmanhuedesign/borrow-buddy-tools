import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Loader2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/integrations/supabase/client";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

const formSchema = z.object({
  name: z.string().min(3, {
    message: "Group name must be at least 3 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  isPrivate: z.boolean().default(true),
});

type FormValues = z.infer<typeof formSchema>;

const CreateGroup = () => {
  const { currentUser, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      isPrivate: true,
    },
  });

  const onSubmit = async (data: FormValues) => {
    if (!currentUser || !isAuthenticated) {
      toast({
        title: "Authentication error",
        description: "You must be logged in to create a group.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      console.log("Creating group with user ID:", currentUser.id);
      console.log("isAuthenticated:", isAuthenticated);
      
      // Double-check session is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        console.error("Session verification failed:", sessionError);
        toast({
          title: "Authentication error",
          description: "Your session has expired. Please log in again.",
          variant: "destructive",
        });
        navigate('/login');
        return;
      }
      
      console.log("Session verified, user authenticated:", session.user.id);
      console.log("Session access token exists:", !!session.access_token);
      
      // Use a transaction-like approach: create group first, then add member
      console.log("Step 1: Creating group...");
      const { data: newGroup, error: groupError } = await supabase
        .from('groups')
        .insert({
          name: data.name,
          description: data.description,
          is_private: data.isPrivate,
          creator_id: currentUser.id
        })
        .select()
        .single();
      
      if (groupError) {
        console.error("Group creation error:", groupError);
        throw groupError;
      }
      
      console.log("Step 1 complete: Group created successfully:", newGroup);
      
      // Small delay to ensure the group is fully committed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Add the creator as a member with 'admin' role
      console.log("Step 2: Adding creator as admin member...");
      const { error: memberError } = await supabase
        .from('group_members')
        .insert({
          group_id: newGroup.id,
          user_id: currentUser.id,
          role: 'admin'
        });
      
      if (memberError) {
        console.error("Member insertion error:", memberError);
        // Try to clean up the created group
        await supabase.from('groups').delete().eq('id', newGroup.id);
        throw memberError;
      }
      
      console.log("Step 2 complete: Creator added as admin member successfully");
      
      toast({
        title: "Group created successfully",
        description: `"${data.name}" has been created.`,
      });
      
      // Navigate to the new group
      navigate(`/groups/${newGroup.id}`);
    } catch (error: any) {
      console.error("Full error details:", error);
      let errorMessage = "An error occurred while creating the group.";
      
      if (error.code === '42501') {
        errorMessage = "Permission denied. Please refresh the page and try again.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Failed to create group",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Create a New Group</h1>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Group Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter group name" {...field} />
                </FormControl>
                <FormDescription>
                  Choose a name that describes your group's purpose.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Describe what this group is for and who should join"
                    className="min-h-[120px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="isPrivate"
            render={({ field }) => (
              <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <FormLabel className="text-base">Private Group</FormLabel>
                  <FormDescription>
                    When enabled, users can only join by invitation
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          
          <Button type="submit" disabled={isLoading} className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating...
              </>
            ) : (
              "Create Group"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default CreateGroup;
