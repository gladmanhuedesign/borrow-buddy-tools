export interface ToolDraft {
  id: string;
  file: File;
  imagePreview: string;
  aiSuggestion: {
    tool_name: string;
    description: string;
    category: string;
    condition: string;
    confidence: number;
    brand?: string;
    power_source?: string;
  } | null;
  formData: {
    name: string;
    description: string;
    categoryId: string;
    condition: string;
    instructions?: string;
    hiddenFromGroups?: string[];
    brand?: string;
    powerSource?: string;
  };
  status: 'pending' | 'analyzing' | 'analyzed' | 'edited' | 'error';
  error?: string;
}
