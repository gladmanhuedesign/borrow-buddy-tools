
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Upload, Loader2 } from "lucide-react";
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
});

type FormValues = z.infer<typeof formSchema>;

interface ToolCategory {
  id: string;
  name: string;
}

interface Tool {
  id: string;
  name: string;
  description: string;
  category_id: string;
  image_url: string;
  owner_id: string;
}

const EditTool = () => {
  const { id } = useParams<{ id: string }>();
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<ToolCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [tool, setTool] = useState<Tool | null>(null);
  const [loadingTool, setLoadingTool] = useState(true);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      instructions: "",
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
    }
  }, [imageFile]);

  useEffect(() => {
    const fetchTool = async () => {
      if (!id || !currentUser) return;
      
      try {
        const { data: toolData, error } = await supabase
          .from('tools')
          .select('*')
          .eq('id', id)
          .eq('owner_id', currentUser.id)
          .single();

        if (error) {
          console.error("Error fetching tool:", error);
          toast({
            title: "Error",
            description: "Failed to load tool details or you don't have permission to edit this tool.",
            variant: "destructive",
          });
          navigate("/tools");
          return;
        }

        setTool(toolData);
        
        // Set form values
        form.setValue("name", toolData.name);
        form.setValue("description", toolData.description || "");
        form.setValue("categoryId", toolData.category_id || "");
        form.setValue("condition", "good" as ToolCondition); // Default since condition isn't in DB
        form.setValue("instructions", toolData.description || "");
        
        if (toolData.image_url) {
          setPreviewUrl(toolData.image_url);
        }
      } catch (error) {
        console.error("Error fetching tool:", error);
        toast({
          title: "Error",
          description: "Failed to load tool details.",
          variant: "destructive",
        });
        navigate("/tools");
      } finally {
        setLoadingTool(false);
      }
    };
    
    fetchTool();
  }, [id, currentUser, form, navigate]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
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
    if (!currentUser || !tool) return;
    
    try {
      setIsLoading(true);
      
      let imageUrl: string | null = tool.image_url;
      
      // Upload new image if provided
      if (data.image) {
        const newImageUrl = await uploadImage(data.image);
        if (newImageUrl) {
          imageUrl = newImageUrl;
        } else {
          toast({
            title: "Image upload failed",
            description: "Failed to upload the new image. Tool will be updated without changing the image.",
            variant: "destructive",
          });
        }
      }

      // Update tool in database
      const { error } = await supabase
        .from('tools')
        .update({
          name: data.name,
          description: data.description,
          category_id: data.categoryId,
          image_url: imageUrl,
        })
        .eq('id', tool.id);

      if (error) {
        console.error("Error updating tool:", error);
        throw error;
      }
      
      toast({
        title: "Tool updated successfully",
        description: `"${data.name}" has been updated.`,
      });
      
      // Navigate back to tool detail
      navigate(`/tools/${tool.id}`);
    } catch (error) {
      console.error("Tool update failed:", error);
      toast({
        title: "Failed to update tool",
        description: "An error occurred while updating your tool.",
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

  if (loadingTool) {
    return (
      <div className="flex justify-center p-8">
        <div className="animate-pulse">Loading tool details...</div>
      </div>
    );
  }

  if (!tool) {
    return (
      <div className="text-center p-8">
        <h2 className="text-xl font-bold">Tool not found</h2>
        <p className="mt-2 text-muted-foreground">
          The tool you're trying to edit doesn't exist or you don't have permission to edit it.
        </p>
        <Button onClick={() => navigate("/tools")} className="mt-4">
          Back to Tools
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/tools/${tool.id}`)}
          className="h-8 w-8 p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold">Edit Tool</h1>
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
          
          <div className="grid gap-6 md:grid-cols-2">
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingCategories}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          loadingCategories 
                            ? "Loading categories..." 
                            : "Select a category"
                        } />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select condition" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {Object.entries(toolConditionLabels).map(([value, label]) => (
                        <SelectItem
                          key={value}
                          value={value}
                        >
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          
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
          
          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/tools/${tool.id}`)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading || loadingCategories || categories.length === 0}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating Tool...
                </>
              ) : (
                "Update Tool"
              )}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};

export default EditTool;
