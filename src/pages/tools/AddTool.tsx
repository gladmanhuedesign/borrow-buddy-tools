import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { toast } from "@/components/ui/use-toast";
import { ArrowLeft, Upload, Loader2, ChevronDown, ChevronRight } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ToolCondition, toolConditionLabels } from "@/config/toolCategories";
import { supabase } from "@/integrations/supabase/client";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Tool name must be at least 2 characters.",
  }),
  description: z.string().min(10, {
    message: "Description must be at least 10 characters.",
  }),
  categoryId: z.string({
    required_error: "Please select a category.",
  }),
  condition: z.nativeEnum(ToolCondition, {
    required_error: "Please select the condition of your tool.",
  }),
  instructions: z.string().optional(),
  image: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, `Max file size is 5MB.`)
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      "Only .jpg, .jpeg, .png and .webp formats are supported."
    )
    .optional(),
  hiddenFromGroups: z.array(z.string()).optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface Group {
  id: string;
  name: string;
  description: string | null;
}

interface ToolCategory {
  id: string;
  name: string;
}

const AddTool = () => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loadingGroups, setLoadingGroups] = useState(true);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      instructions: "",
      hiddenFromGroups: [],
    },
  });

  // Watch for image file changes to generate preview
  const imageFile = form.watch("image");
  
  useEffect(() => {
    if (imageFile) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(imageFile);
    } else {
      setPreviewUrl(null);
    }
  }, [imageFile]);

  useEffect(() => {
    const fetchUserGroups = async () => {
      if (!currentUser) return;
      
      try {
        console.log("Fetching user groups for:", currentUser.id);
        
        // Fetch groups where the user is a member
        const { data: groupMembers, error } = await supabase
          .from('group_members')
          .select(`
            groups (
              id,
              name,
              description
            )
          `)
          .eq('user_id', currentUser.id);

        if (error) {
          console.error("Error fetching user groups:", error);
          toast({
            title: "Error",
            description: "Failed to load your groups.",
            variant: "destructive",
          });
          return;
        }

        // Extract groups from the relation
        const userGroups = groupMembers
          ?.map(member => member.groups)
          .filter(group => group !== null) as Group[];
        
        console.log("User groups:", userGroups);
        setGroups(userGroups || []);
      } catch (error) {
        console.error("Error fetching groups:", error);
        toast({
          title: "Error",
          description: "Failed to load your groups.",
          variant: "destructive",
        });
      } finally {
        setLoadingGroups(false);
      }
    };
    
    fetchUserGroups();
  }, [currentUser]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        console.log("Fetching tool categories");
        
        const { data: categoriesData, error } = await supabase
          .from('tool_categories')
          .select('id, name')
          .order('name');

        if (error) {
          console.error("Error fetching categories:", error);
          toast({
            title: "Error",
            description: "Failed to load tool categories.",
            variant: "destructive",
          });
          return;
        }

        console.log("Tool categories:", categoriesData);
        setCategories(categoriesData || []);
      } catch (error) {
        console.error("Error fetching categories:", error);
        toast({
          title: "Error",
          description: "Failed to load tool categories.",
          variant: "destructive",
        });
      } finally {
        setLoadingCategories(false);
      }
    };
    
    fetchCategories();
  }, []);

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `tool-images/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('tool-images')
        .upload(filePath, file);

      if (uploadError) {
        console.error("Upload error:", uploadError);
        return null;
      }

      const { data } = supabase.storage
        .from('tool-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const onSubmit = async (data: FormValues) => {
    if (!currentUser) return;
    
    try {
      setIsLoading(true);
      console.log("Creating tool:", data);
      
      let imageUrl: string | null = null;
      
      // Upload image if provided
      if (data.image) {
        imageUrl = await uploadImage(data.image);
        if (!imageUrl) {
          toast({
            title: "Image upload failed",
            description: "Failed to upload the image. Tool will be created without image.",
            variant: "destructive",
          });
        }
      }

      // Insert tool into database
      const { data: toolData, error } = await supabase
        .from('tools')
        .insert({
          name: data.name,
          description: data.description,
          category_id: data.categoryId,
          owner_id: currentUser.id,
          image_url: imageUrl,
          status: 'available'
        })
        .select('id')
        .single();

      if (error) {
        console.error("Error creating tool:", error);
        throw error;
      }

      // Handle group visibility settings if user has groups and has hidden the tool from some
      if (groups.length > 0 && data.hiddenFromGroups && data.hiddenFromGroups.length > 0) {
        const visibilityInserts = data.hiddenFromGroups.map(groupId => ({
          tool_id: toolData.id,
          group_id: groupId,
          is_hidden: true
        }));

        const { error: visibilityError } = await supabase
          .from('tool_group_visibility')
          .insert(visibilityInserts);

        if (visibilityError) {
          console.error("Error setting group visibility:", visibilityError);
          // Don't fail the entire operation for visibility settings
          toast({
            title: "Tool created with warning",
            description: "Tool was created but group visibility settings may not have been saved correctly.",
            variant: "destructive",
          });
        }
      }
      
      toast({
        title: "Tool added successfully",
        description: `"${data.name}" has been added to your tools.`,
      });
      
      // Navigate to the tools list
      navigate("/tools");
    } catch (error) {
      console.error("Tool creation failed:", error);
      toast({
        title: "Failed to add tool",
        description: "An error occurred while adding your tool.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle image file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue("image", file);
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
        <h1 className="text-2xl font-bold">Add a New Tool</h1>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Tool Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter tool name" {...field} />
                </FormControl>
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
                    placeholder="Describe your tool, including make, model, and details"
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
            name="categoryId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-2 md:grid-cols-3 gap-3"
                    disabled={loadingCategories}
                  >
                    {loadingCategories ? (
                      <div className="col-span-full text-center text-muted-foreground">
                        Loading categories...
                      </div>
                    ) : (
                      categories.map((category) => (
                        <div key={category.id} className="flex items-center space-x-2">
                          <RadioGroupItem
                            value={category.id}
                            id={category.id}
                            className="peer sr-only"
                          />
                          <label
                            htmlFor={category.id}
                            className="flex-1 cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                          >
                            {category.name}
                          </label>
                        </div>
                      ))
                    )}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-2 md:grid-cols-5 gap-3"
                  >
                    {Object.entries(toolConditionLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={value}
                          id={value}
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={value}
                          className="flex-1 cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium text-center transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
                        >
                          {label}
                        </label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Advanced Group Visibility Settings */}
          {groups.length > 0 && (
            <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" type="button" className="flex items-center gap-2 p-0 h-auto">
                  {isAdvancedOpen ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  Advanced: Group Visibility Settings
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-4 mt-4 p-4 border rounded-lg">
                <div className="text-sm text-muted-foreground mb-3">
                  By default, your tool will be visible to all groups you're a member of. 
                  Check the boxes below to hide this tool from specific groups.
                </div>
                <FormField
                  control={form.control}
                  name="hiddenFromGroups"
                  render={() => (
                    <FormItem>
                      <FormLabel>Hide this tool from:</FormLabel>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {loadingGroups ? (
                          <div className="col-span-full text-center text-muted-foreground">
                            Loading groups...
                          </div>
                        ) : (
                          groups.map((group) => (
                            <FormField
                              key={group.id}
                              control={form.control}
                              name="hiddenFromGroups"
                              render={({ field }) => {
                                return (
                                  <FormItem
                                    key={group.id}
                                    className="flex flex-row items-start space-x-3 space-y-0"
                                  >
                                    <FormControl>
                                      <Checkbox
                                        checked={field.value?.includes(group.id)}
                                        onCheckedChange={(checked) => {
                                          return checked
                                            ? field.onChange([...field.value || [], group.id])
                                            : field.onChange(
                                                field.value?.filter(
                                                  (value) => value !== group.id
                                                )
                                              )
                                        }}
                                      />
                                    </FormControl>
                                    <div className="space-y-1 leading-none">
                                      <FormLabel className="text-sm font-normal">
                                        {group.name}
                                      </FormLabel>
                                      {group.description && (
                                        <p className="text-xs text-muted-foreground">
                                          {group.description}
                                        </p>
                                      )}
                                    </div>
                                  </FormItem>
                                )
                              }}
                            />
                          ))
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CollapsibleContent>
            </Collapsible>
          )}
          
          <FormItem>
            <FormLabel>Tool Image</FormLabel>
            <div className="grid w-full gap-2">
              <div className="border rounded-md p-4">
                {previewUrl ? (
                  <div className="relative aspect-video overflow-hidden rounded-md">
                    <img
                      src={previewUrl}
                      alt="Tool preview"
                      className="h-full w-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="flex h-40 flex-col items-center justify-center rounded-md border border-dashed text-center">
                    <Upload className="h-10 w-10 text-muted-foreground" />
                    <p className="mt-2 text-sm font-medium">
                      Drag and drop or click to upload
                    </p>
                    <p className="text-xs text-muted-foreground">
                      JPG, PNG or WEBP (max 5MB)
                    </p>
                  </div>
                )}
                <Input
                  id="image-upload"
                  type="file"
                  className="mt-2"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileChange}
                />
              </div>
              {form.formState.errors.image && (
                <p className="text-sm font-medium text-destructive">
                  {form.formState.errors.image.message}
                </p>
              )}
            </div>
          </FormItem>
          
          <FormField
            control={form.control}
            name="instructions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Usage Instructions (Optional)</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Add any special instructions or tips for using this tool"
                    className="min-h-[100px]"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <Button
            type="submit"
            disabled={isLoading || loadingCategories || categories.length === 0}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Tool...
              </>
            ) : (
              "Add Tool"
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AddTool;
