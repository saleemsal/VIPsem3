import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface StarRatingFeedbackProps {
  title?: string;
  description?: string;
  onSubmit: (feedback: { rating: number; additional_feedback: string | null }) => void;
  isSubmitting?: boolean;
  showTextFeedback?: boolean;
  textPlaceholder?: string;
  submitButtonText?: string;
  className?: string;
}

export function StarRatingFeedback({ 
  title = "How was your experience?",
  description = "We'd love to hear your feedback!",
  onSubmit,
  isSubmitting = false,
  showTextFeedback = true,
  textPlaceholder = "Any thoughts on what worked well or what could be better?",
  submitButtonText = "Submit feedback",
  className
}: StarRatingFeedbackProps) {
  const [rating, setRating] = useState<number | null>(null);
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [additionalFeedback, setAdditionalFeedback] = useState("");

  const handleSubmit = () => {
    if (rating) {
      onSubmit({
        rating,
        additional_feedback: additionalFeedback.trim() || null
      });
      // Reset form
      setRating(null);
      setAdditionalFeedback("");
    }
  };

  const displayRating = hoveredRating ?? rating ?? 0;

  return (
    <div className={cn("space-y-6 p-6", className)}>
      <div className="text-center space-y-2">
        <h3 className="text-lg font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>

      {/* Star Rating */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(null)}
              className={cn(
                "transition-all duration-200 hover:scale-110",
                "focus:outline-none focus:ring-2 focus:ring-gt-gold focus:ring-offset-2 rounded"
              )}
              disabled={isSubmitting}
            >
              <Star
                className={cn(
                  "h-10 w-10 transition-colors",
                  star <= displayRating
                    ? "fill-gt-gold text-gt-gold"
                    : "text-muted-foreground/30"
                )}
              />
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          1 = Not helpful • 5 = Super helpful!
        </p>
      </div>

      {/* Optional Text Feedback */}
      {showTextFeedback && (
        <div className="space-y-2">
          <label htmlFor="feedback-text" className="text-sm font-medium">
            Want to share more? (optional)
          </label>
          <Textarea
            id="feedback-text"
            placeholder={textPlaceholder}
            value={additionalFeedback}
            onChange={(e) => setAdditionalFeedback(e.target.value)}
            className="min-h-[100px] resize-none"
            disabled={isSubmitting}
            maxLength={500}
          />
          <p className="text-xs text-muted-foreground text-right">
            {additionalFeedback.length}/500
          </p>
        </div>
      )}

      {/* Submit Button */}
      <div className="flex justify-center">
        <Button
          variant="gt-gold"
          onClick={handleSubmit}
          disabled={!rating || isSubmitting}
          className="w-full sm:w-auto"
        >
          {isSubmitting ? "Submitting..." : submitButtonText}
        </Button>
      </div>
    </div>
  );
}
