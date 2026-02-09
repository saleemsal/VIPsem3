import { useState } from 'react';
import { LocalFeedback } from '@/lib/local-feedback';
import { useToast } from '@/hooks/use-toast';

export function useFeedback() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const submitFeedback = async (
    feedbackData: any,
    conversationId?: string | null
  ) => {
    setIsSubmitting(true);
    try {
      // Dummy user ID for now
      const userId = 'demo-user';

      // 🔴 IMPORTANT: spread ALL fields from feedbackData
      const result = await LocalFeedback.submitFeedback(
        {
          ...feedbackData,
          // ensure this is undefined instead of empty string/null if not provided
          additional_feedback: feedbackData.additional_feedback || undefined,
        },
        userId,
        conversationId || undefined
      );

      if (!result.success) {
        console.error('Feedback submission error:', result.error);
        toast({
          title: "Oops!",
          description: "Couldn't submit your feedback. Mind trying again?",
          variant: "destructive"
        });
        return false;
      }

      toast({
        title: "Thanks for the feedback! 🎉",
        description: "Your input helps make GT Study Buddy even better!",
      });
      return true;
    } catch (error) {
      console.error('Unexpected error submitting feedback:', error);
      toast({
        title: "Something went wrong",
        description: "Please try again later",
        variant: "destructive"
      });
      return false;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    submitFeedback,
    isSubmitting
  };
}
