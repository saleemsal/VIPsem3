import { useState } from "react";
import { Star } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface FeedbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (feedback: any) => void;
  isSubmitting?: boolean;
}

export function FeedbackDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting = false,
}: FeedbackDialogProps) {
  const [hoverKey, setHoverKey] = useState<string>("");
  const [hoverValue, setHoverValue] = useState<number | null>(null);

  const [form, setForm] = useState({
    rating: null as number | null,

    chatQuality: null as number | null,
    ragAccuracy: null as number | null,
    pdfParsing: null as number | null,
    speed: null as number | null,
    uiDesign: null as number | null,
    flashcards: null as number | null,
    practiceGenerator: null as number | null,
    planner: null as number | null,

    additional_feedback: "",
  });

  const features = [
    { key: "chatQuality", label: "Chat Quality" },
    { key: "ragAccuracy", label: "RAG Accuracy" },
    { key: "pdfParsing", label: "PDF Parsing Quality" },
    { key: "speed", label: "Speed & Performance" },
    { key: "uiDesign", label: "UI & Design" },
    { key: "flashcards", label: "Flashcards Feature" },
    { key: "practiceGenerator", label: "Practice Generator" },
    { key: "planner", label: "Study Planner" },
  ];

  const updateField = (key: string, value: any) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const displayRating = (key: string) => {
    if (hoverKey === key && hoverValue !== null) return hoverValue;
    return form[key as keyof typeof form] ?? 0;
  };

  const handleSubmit = () => {
    if (!form.rating) return;

    onSubmit({
      ...form,
      additional_feedback: form.additional_feedback.trim() || null,
    });

    setForm({
      rating: null,
      chatQuality: null,
      ragAccuracy: null,
      pdfParsing: null,
      speed: null,
      uiDesign: null,
      flashcards: null,
      practiceGenerator: null,
      planner: null,
      additional_feedback: "",
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center">How was your experience?</DialogTitle>
          <DialogDescription className="text-center">
            Your feedback helps make GT Study Buddy even better! 🐝💛
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">

          {/* --------- OVERALL RATING ---------- */}
          <div className="flex flex-col items-center gap-3">
            <p className="font-medium">Overall Rating</p>

            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => updateField("rating", star)}
                  onMouseEnter={() => { setHoverKey("rating"); setHoverValue(star); }}
                  onMouseLeave={() => { setHoverKey(""); setHoverValue(null); }}
                  className="transition-all hover:scale-110 focus:outline-none"
                >
                  <Star
                    className={cn(
                      "h-10 w-10 transition-colors",
                      star <= displayRating("rating")
                        ? "fill-gt-gold text-gt-gold"
                        : "text-muted-foreground/30"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* -------- FEATURE RATINGS -------- */}
          <div className="space-y-4">
            <p className="text-sm font-medium text-center">Rate Specific Features (optional)</p>

            {features.map((f) => (
              <div key={f.key} className="border-b pb-3">
                <label className="font-medium">{f.label}</label>

                <div className="flex gap-2 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => updateField(f.key, star)}
                      onMouseEnter={() => { setHoverKey(f.key); setHoverValue(star); }}
                      onMouseLeave={() => { setHoverKey(""); setHoverValue(null); }}
                      className="transition-all hover:scale-110 focus:outline-none"
                    >
                      <Star
                        className={cn(
                          "h-6 w-6 transition-colors",
                          star <= displayRating(f.key)
                            ? "fill-gt-gold text-gt-gold"
                            : "text-muted-foreground/30"
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* -------- TEXT FEEDBACK -------- */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional Comments</label>
            <Textarea
              value={form.additional_feedback}
              onChange={(e) => updateField("additional_feedback", e.target.value)}
              maxLength={500}
              className="min-h-[100px]"
              placeholder="Anything we can improve? Something you loved? 💬"
            />
            <p className="text-xs text-muted-foreground text-right">
              {form.additional_feedback.length}/500
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            Maybe later
          </Button>

          <Button
            variant="gt-gold"
            onClick={handleSubmit}
            disabled={!form.rating || isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting ? "Submitting..." : "Submit feedback"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
