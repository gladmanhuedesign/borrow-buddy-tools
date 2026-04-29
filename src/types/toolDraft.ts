export interface ToolAISuggestion {
  tool_name: string;
  description: string;
  category: string;
  condition: string;
  confidence: number;
  brand?: string;
  power_source?: string;
  short_description?: string;
  common_uses?: string[];
  how_to_use?: string[];
  common_projects?: string[];
  safety_tips?: string[];
  tips_and_tricks?: string[];
}

export interface ToolDraft {
  id: string;
  file: File;
  imagePreview: string;
  aiSuggestion: ToolAISuggestion | null;
  formData: {
    name: string;
    description: string;
    categoryId: string;
    condition: string;
    instructions?: string;
    hiddenFromGroups?: string[];
    brand?: string;
    powerSource?: string;
    shortDescription?: string;
    commonUses?: string;
    howToUse?: string;
    commonProjects?: string;
    safetyTips?: string;
    whatsIncluded?: string;
    tipsAndTricks?: string;
  };
  status: 'pending' | 'analyzing' | 'analyzed' | 'edited' | 'error';
  error?: string;
}
