import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X, CheckCircle } from "lucide-react";
import { ToolDraft } from "@/types/toolDraft";

interface ToolReviewCarouselProps {
  drafts: ToolDraft[];
  currentIndex: number;
  onNext: () => void;
  onPrevious: () => void;
  onRemove: (index: number) => void;
  totalDrafts: number;
}

export const ToolReviewCarousel = ({
  drafts,
  currentIndex,
  onNext,
  onPrevious,
  onRemove,
  totalDrafts,
}: ToolReviewCarouselProps) => {
  const currentDraft = drafts[currentIndex];
  
  if (!currentDraft) return null;

  const getStatusColor = (status: ToolDraft['status']) => {
    switch (status) {
      case 'analyzed':
        return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'edited':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'error':
        return 'bg-destructive/10 text-destructive border-destructive/20';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusText = (status: ToolDraft['status']) => {
    switch (status) {
      case 'analyzed':
        return 'AI Analyzed';
      case 'edited':
        return 'Modified';
      case 'error':
        return 'Error';
      default:
        return 'Pending';
    }
  };

  return (
    <Card className="p-6 border-primary/20">
      {/* Header with navigation */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h3 className="font-semibold text-lg">
            Review Tool {currentIndex + 1} of {totalDrafts}
          </h3>
          <Badge variant="outline" className={getStatusColor(currentDraft.status)}>
            {getStatusText(currentDraft.status)}
          </Badge>
          {currentDraft.aiSuggestion && (
            <Badge variant="secondary" className="text-xs">
              {currentDraft.aiSuggestion.confidence}% confidence
            </Badge>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onRemove(currentIndex)}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Image Preview */}
      <div className="mb-4">
        <div className="relative aspect-video overflow-hidden rounded-lg border bg-muted">
          <img
            src={currentDraft.imagePreview}
            alt={`Tool ${currentIndex + 1} preview`}
            className="h-full w-full object-contain"
          />
        </div>
      </div>

      {/* AI Detection Info */}
      {currentDraft.aiSuggestion && (
        <div className="bg-primary/5 rounded-lg p-4 mb-4 space-y-2 border border-primary/10">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">
              AI Detected: {currentDraft.aiSuggestion.tool_name}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {currentDraft.aiSuggestion.description.substring(0, 120)}...
          </p>
        </div>
      )}

      {currentDraft.error && (
        <div className="bg-destructive/5 rounded-lg p-4 mb-4 border border-destructive/20">
          <p className="text-sm text-destructive">{currentDraft.error}</p>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4 pt-4 border-t">
        <Button
          variant="outline"
          onClick={onPrevious}
          disabled={currentIndex === 0}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="h-4 w-4" />
          Previous
        </Button>

        <div className="flex gap-1">
          {drafts.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentIndex
                  ? 'bg-primary'
                  : index < currentIndex
                  ? 'bg-primary/50'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        <Button
          variant="outline"
          onClick={onNext}
          disabled={currentIndex >= totalDrafts - 1}
          className="flex items-center gap-2"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
};
