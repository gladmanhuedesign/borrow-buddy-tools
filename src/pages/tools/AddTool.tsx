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
import { ArrowLeft, Upload, Loader2, ChevronDown, ChevronRight, Camera, Sparkles, Images, CheckCircle2 } from "lucide-react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { ToolCondition, toolConditionLabels, ToolPowerSource, toolPowerSourceLabels } from "@/config/toolCategories";
import { supabase } from "@/integrations/supabase/client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToolDraft } from "@/types/toolDraft";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];

const formSchema = z.object({
  name: z.string().min(2, {
    message: "Tool name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  categoryId: z.string({
    required_error: "Please select a category.",
  }),
  condition: z.nativeEnum(ToolCondition).optional(),
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
  brand: z.string().trim().max(100, "Brand must be less than 100 characters").optional(),
  powerSource: z.nativeEnum(ToolPowerSource).optional(),
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
  
  // Multi-image batch mode states
  const [toolDrafts, setToolDrafts] = useState<ToolDraft[]>([]);
  const [currentDraftIndex, setCurrentDraftIndex] = useState(0);
  const [isBatchMode, setIsBatchMode] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [analyzingProgress, setAnalyzingProgress] = useState({ current: 0, total: 0 });
  const [savedToolsCount, setSavedToolsCount] = useState(0);
  const [totalToolsToProcess, setTotalToolsToProcess] = useState(0);
  
  // Legacy single-image mode states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<{
    tool_name: string;
    description: string;
    category: string;
    condition: string;
    confidence: number;
    brand?: string;
    power_source?: string;
  } | null>(null);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      description: "",
      instructions: "",
      hiddenFromGroups: [],
      brand: "",
      powerSource: undefined,
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
    
    // Handle batch mode - save current tool and move to next
    if (isBatchMode && toolDrafts.length > 0) {
      try {
        setIsLoading(true);
        const currentDraft = toolDrafts[currentDraftIndex];
        
        // Validate category is selected
        if (!data.categoryId || data.categoryId === '') {
          toast({
            title: "Category required",
            description: "Please select a category for this tool before saving.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Upload image for current tool
        let imageUrl: string | null = null;
        if (currentDraft.file) {
          imageUrl = await uploadImage(currentDraft.file);
          if (!imageUrl) {
            toast({
              title: "Image upload failed",
              description: "Failed to upload the image. Please try again.",
              variant: "destructive",
            });
            setIsLoading(false);
            return;
          }
        }
        
        // Insert current tool into database
        const { data: toolData, error } = await supabase
          .from('tools')
          .insert({
            name: data.name,
            description: data.description || null,
            category_id: data.categoryId,
            owner_id: currentUser.id,
            image_url: imageUrl,
            status: 'available',
            brand: data.brand || null,
            power_source: data.powerSource || null,
          })
          .select('id')
          .single();
        
        if (error) {
          console.error("Error creating tool:", error);
          toast({
            title: "Failed to save tool",
            description: "Please fix errors and try again.",
            variant: "destructive",
          });
          setIsLoading(false);
          return;
        }
        
        // Handle group visibility
        if (groups.length > 0 && data.hiddenFromGroups && data.hiddenFromGroups.length > 0) {
          const visibilityInserts = data.hiddenFromGroups.map(groupId => ({
            tool_id: toolData.id,
            group_id: groupId,
            is_hidden: true
          }));
          
          await supabase.from('tool_group_visibility').insert(visibilityInserts);
        }
        
        // Increment saved count
        setSavedToolsCount(prev => prev + 1);
        
        // Remove current tool from drafts
        const updatedDrafts = toolDrafts.filter((_, idx) => idx !== currentDraftIndex);
        
        if (updatedDrafts.length === 0) {
          // All done!
          toast({
            title: "All tools saved!",
            description: "All tools have been added to your inventory.",
          });
          setIsBatchMode(false);
          setToolDrafts([]);
          setCurrentDraftIndex(0);
          setSavedToolsCount(0);
          setTotalToolsToProcess(0);
          navigate('/tools');
        } else {
          // Move to next tool
          setToolDrafts(updatedDrafts);
          populateFormFromDraft(updatedDrafts[0]);
          
          // Scroll to top of form
          window.scrollTo({ top: 0, behavior: 'smooth' });
          
          toast({
            title: "Tool saved!",
            description: `Review the next tool (${updatedDrafts.length} remaining).`,
          });
        }
      } catch (error) {
        console.error("Tool creation failed:", error);
        toast({
          title: "Failed to save tool",
          description: "An error occurred. Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Single tool submission
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
          description: data.description || null,
          category_id: data.categoryId,
          owner_id: currentUser.id,
          image_url: imageUrl,
          status: 'available',
          brand: data.brand || null,
          power_source: data.powerSource || null,
        })
        .select('id')
        .single();

      if (error) {
        console.error("Error creating tool:", error);
        throw error;
      }

      // Handle group visibility settings
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


  // Handle AI-powered tool scanning
  const handleAIScan = async (file: File) => {
    try {
      setIsAnalyzing(true);
      setAiSuggestion(null);

      // Convert file to base64
      const reader = new FileReader();
      reader.readAsDataURL(file);
      
      await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
      });

      const base64Image = reader.result as string;

      // Call edge function
      const { data, error } = await supabase.functions.invoke('analyze-tool-image', {
        body: { image: base64Image }
      });

      if (error) {
        console.error('AI analysis error:', error);
        
        if (error.message?.includes('429') || error.message?.includes('rate limit')) {
          toast({
            title: "Rate limit exceeded",
            description: "Please try again in a few moments.",
            variant: "destructive",
          });
        } else if (error.message?.includes('402') || error.message?.includes('Payment')) {
          toast({
            title: "Credits needed",
            description: "Please add credits to your Lovable AI workspace.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "AI analysis failed",
            description: "Unable to analyze the image. You can still fill the form manually.",
            variant: "destructive",
          });
        }
        return;
      }

      if (data?.success && data?.data) {
        const suggestion = data.data;
        setAiSuggestion(suggestion);

        // Find matching category
        const matchingCategory = categories.find(
          cat => cat.name.toLowerCase() === suggestion.category.toLowerCase()
        );

        // Pre-fill form with AI suggestions
        form.setValue('name', suggestion.tool_name);
        form.setValue('description', suggestion.description);
        if (matchingCategory) {
          form.setValue('categoryId', matchingCategory.id);
        }
        form.setValue('condition', suggestion.condition as ToolCondition);
        
        // Set brand if available
        if (suggestion.brand) {
          form.setValue('brand', suggestion.brand);
        }
        
        // Set power source if available
        if (suggestion.power_source) {
          const powerSourceKey = suggestion.power_source.toUpperCase() as keyof typeof ToolPowerSource;
          if (ToolPowerSource[powerSourceKey]) {
            form.setValue('powerSource', ToolPowerSource[powerSourceKey]);
          }
        }

        toast({
          title: "AI Analysis Complete! 🎉",
          description: `Tool identified with ${suggestion.confidence}% confidence. Review and edit as needed.`,
        });
      }
    } catch (error) {
      console.error('AI scan error:', error);
      toast({
        title: "Analysis error",
        description: "Something went wrong. Please try again or fill the form manually.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Handle batch image analysis
  const handleBatchAIScan = async (files: File[]) => {
    const newDrafts: ToolDraft[] = [];
    
    setAnalyzingProgress({ current: 0, total: files.length });
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = `draft-${Date.now()}-${i}`;
      
      // Create image preview
      const reader = new FileReader();
      const imagePreview = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      
      // Initialize draft
      const draft: ToolDraft = {
        id: tempId,
        file,
        imagePreview,
        aiSuggestion: null,
        formData: {
          name: '',
          description: '',
          categoryId: '',
          condition: ToolCondition.GOOD,
          brand: '',
          powerSource: undefined,
        },
        status: 'analyzing',
      };
      
      newDrafts.push(draft);
      setToolDrafts([...newDrafts]);
      setAnalyzingProgress({ current: i + 1, total: files.length });
      
      // Analyze with AI
      try {
        const base64Image = imagePreview;
        const { data, error } = await supabase.functions.invoke('analyze-tool-image', {
          body: { image: base64Image }
        });
        
        if (error) throw error;
        
        if (data?.success && data?.data) {
          const suggestion = data.data;
          const matchingCategory = categories.find(
            cat => cat.name.toLowerCase() === suggestion.category.toLowerCase()
          );
          
          // Convert AI power source to enum value
          let powerSourceValue: ToolPowerSource | undefined = undefined;
          if (suggestion.power_source) {
            const powerSourceUpper = suggestion.power_source.toUpperCase();
            if (powerSourceUpper in ToolPowerSource) {
              powerSourceValue = ToolPowerSource[powerSourceUpper as keyof typeof ToolPowerSource];
            }
          }
          
          draft.aiSuggestion = suggestion;
          draft.formData = {
            name: suggestion.tool_name,
            description: suggestion.description,
            categoryId: matchingCategory?.id || '',
            condition: suggestion.condition as ToolCondition,
            brand: suggestion.brand || '',
            powerSource: powerSourceValue,
          };
          draft.status = 'analyzed';
        } else {
          draft.status = 'error';
          draft.error = 'AI analysis returned no data';
        }
      } catch (error) {
        console.error('AI analysis error for file', i, error);
        draft.status = 'error';
        draft.error = error instanceof Error ? error.message : 'Analysis failed';
      }
      
      setToolDrafts([...newDrafts]);
      
      // Small delay to avoid rate limits
      if (i < files.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }
    
    setAnalyzingProgress({ current: 0, total: 0 });
    setTotalToolsToProcess(files.length);
    setSavedToolsCount(0);
    
    toast({
      title: "Batch analysis complete!",
      description: `${newDrafts.filter(d => d.status === 'analyzed').length} of ${files.length} tools analyzed successfully.`,
    });
  };

  // Handle image file selection (single or multiple)
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    
    // If multiple files selected, enter batch mode
    if (fileArray.length > 1) {
      setIsBatchMode(true);
      setUploadedFiles(fileArray);
      setCurrentDraftIndex(0);
      await handleBatchAIScan(fileArray);
    } else {
      // Single file mode (legacy)
      const file = fileArray[0];
      setIsBatchMode(false);
      form.setValue("image", file);
      await handleAIScan(file);
    }
  };

  // Handle camera capture
  const handleCameraCapture = () => {
    const input = document.getElementById('image-upload') as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  // Clear AI suggestion and reset to manual entry
  const clearAISuggestion = () => {
    setAiSuggestion(null);
  };

  // Skip current tool in batch mode
  const skipCurrentTool = () => {
    const updatedDrafts = toolDrafts.filter((_, idx) => idx !== currentDraftIndex);
    setToolDrafts(updatedDrafts);
    
    if (updatedDrafts.length === 0) {
      setIsBatchMode(false);
      setCurrentDraftIndex(0);
      setSavedToolsCount(0);
      setTotalToolsToProcess(0);
      toast({
        title: "Batch mode cancelled",
      });
    } else {
      populateFormFromDraft(updatedDrafts[0]);
      toast({
        title: "Tool skipped",
      });
    }
  };

  const populateFormFromDraft = (draft: ToolDraft) => {
    form.setValue('name', draft.formData.name);
    form.setValue('description', draft.formData.description || '');
    form.setValue('categoryId', draft.formData.categoryId);
    form.setValue('condition', (draft.formData.condition || undefined) as ToolCondition | undefined);
    form.setValue('brand', draft.formData.brand || '');
    form.setValue('powerSource', (draft.formData.powerSource || undefined) as ToolPowerSource | undefined);
    form.setValue('instructions', draft.formData.instructions || '');
    form.setValue('hiddenFromGroups', draft.formData.hiddenFromGroups || []);
  };

  // Load first draft when batch mode starts
  useEffect(() => {
    if (isBatchMode && toolDrafts.length > 0 && toolDrafts[currentDraftIndex]) {
      populateFormFromDraft(toolDrafts[currentDraftIndex]);
    }
  }, [isBatchMode, toolDrafts.length]);

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
          
          {/* AI Scan Section */}
          <Card className="p-6 bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h3 className="font-semibold text-lg">AI Tool Scanner</h3>
              </div>
              <p className="text-sm text-muted-foreground">
                Upload one or multiple images - AI will automatically identify your tools and fill out the forms.
              </p>
              
              {analyzingProgress.total > 0 && (
                <div className="bg-background rounded-lg p-4 space-y-2 border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Analyzing tools...
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {analyzingProgress.current} of {analyzingProgress.total}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(analyzingProgress.current / analyzingProgress.total) * 100}%` }}
                    />
                  </div>
                </div>
              )}
              
              {aiSuggestion && (
                <div className="bg-background rounded-lg p-4 space-y-2 border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-primary">
                      ✓ AI Identified: {aiSuggestion.tool_name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {aiSuggestion.confidence}% confident
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Form has been pre-filled. Review and edit as needed below.
                  </p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={clearAISuggestion}
                    className="h-7 text-xs"
                  >
                    Clear AI Data
                  </Button>
                </div>
              )}
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  type="button"
                  onClick={handleCameraCapture}
                  disabled={isAnalyzing || loadingCategories || analyzingProgress.total > 0}
                  variant="default"
                >
                  {isAnalyzing || analyzingProgress.total > 0 ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyzing...
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" /> Scan Single Tool
                    </>
                  )}
                </Button>
                
                <Button
                  type="button"
                  onClick={() => {
                    const input = document.getElementById('image-upload') as HTMLInputElement;
                    if (input) {
                      input.setAttribute('multiple', 'true');
                      input.click();
                    }
                  }}
                  disabled={isAnalyzing || loadingCategories || analyzingProgress.total > 0}
                  variant="secondary"
                >
                  <Images className="mr-2 h-4 w-4" /> Upload Multiple
                </Button>
              </div>
            </div>
          </Card>

          {/* Compact Progress Banner for Batch Mode */}
          {isBatchMode && toolDrafts.length > 0 && (
            <Card className="p-3 bg-primary/5 border-primary/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    {savedToolsCount} of {totalToolsToProcess} successfully uploaded and reviewed
                  </span>
                </div>
                <Badge variant="outline" className="text-xs">
                  {toolDrafts.length} remaining
                </Badge>
              </div>
            </Card>
          )}

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                {isBatchMode ? `Edit Tool ${currentDraftIndex + 1} Details` : 'Or enter manually'}
              </span>
            </div>
          </div>

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
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Brand (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., DeWalt, Milwaukee, Bosch" {...field} />
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
                <FormLabel>Description (Optional)</FormLabel>
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
                    className="grid grid-cols-1 gap-2"
                    disabled={loadingCategories}
                  >
                    {loadingCategories ? (
                      <div className="text-center text-muted-foreground">
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
                            className="flex-1 cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground"
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
                <FormLabel>Condition (Optional)</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-2 md:grid-cols-3 gap-2"
                  >
                    {Object.entries(toolConditionLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={value}
                          id={`condition-${value}`}
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={`condition-${value}`}
                          className="flex-1 cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground text-center"
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

          <FormField
            control={form.control}
            name="powerSource"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Power Source (Optional)</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="grid grid-cols-2 md:grid-cols-3 gap-2"
                  >
                    {Object.entries(toolPowerSourceLabels).map(([value, label]) => (
                      <div key={value} className="flex items-center space-x-2">
                        <RadioGroupItem
                          value={value}
                          id={`power-${value}`}
                          className="peer sr-only"
                        />
                        <label
                          htmlFor={`power-${value}`}
                          className="flex-1 cursor-pointer rounded-lg border border-input bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground text-center"
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
          
          {/* Current Tool Image Preview (Batch Mode) */}
          {isBatchMode && toolDrafts.length > 0 && toolDrafts[currentDraftIndex]?.imagePreview && (
            <FormItem>
              <FormLabel>Tool Image</FormLabel>
              <div className="relative aspect-video overflow-hidden rounded-lg border">
                <img
                  src={toolDrafts[currentDraftIndex].imagePreview}
                  alt="Current tool preview"
                  className="h-full w-full object-contain bg-muted"
                />
              </div>
            </FormItem>
          )}
          
          {/* Tool Image Upload (Single Mode) */}
          {!isBatchMode && (
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
          )}
          
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
          
          {/* Button Section */}
          {isBatchMode && toolDrafts.length > 0 ? (
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsBatchMode(false);
                  setToolDrafts([]);
                  setCurrentDraftIndex(0);
                  form.reset();
                  toast({
                    title: "Batch mode cancelled",
                    description: "Previously saved tools are still in your inventory.",
                  });
                }}
                className="flex-1 text-sm"
              >
                Cancel Remaining ({toolDrafts.length})
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={skipCurrentTool}
                className="text-sm"
              >
                Skip This Tool
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 text-sm"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                  </>
                ) : toolDrafts.length === 1 ? (
                  "Save & Finish"
                ) : (
                  `Save & Next (${currentDraftIndex + 1}/${toolDrafts.length})`
                )}
              </Button>
            </div>
          ) : (
            <div className="flex gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate(-1)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isLoading || loadingCategories}
                className="flex-1"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Adding Tool...
                  </>
                ) : (
                  "Add Tool"
                )}
              </Button>
            </div>
          )}
        </form>
      </Form>
    </div>
  );
};

export default AddTool;
