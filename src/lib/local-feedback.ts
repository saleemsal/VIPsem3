// This file is for client-side feedback submission only
// Server-side database operations are handled in api/feedback.ts

export interface FeedbackData {
  rating: number;
  additional_feedback?: string;
}

export interface FeedbackRecord {
  id: string;
  user_id?: string;
  conversation_id?: string;
  rating: number;
  additional_feedback?: string;
  created_at: string;
}

export class LocalFeedback {
  // Submit feedback via API
  static async submitFeedback(
    feedbackData: FeedbackData,
    userId?: string,
    conversationId?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = await fetch('http://localhost:8787/api/feedback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...feedbackData,
          userId,
          conversationId
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to submit feedback');
      }

      return { success: true };
    } catch (error: any) {
      console.error('Feedback submission error:', error);
      return { 
        success: false, 
        error: error.message || 'Failed to submit feedback' 
      };
    }
  }
  
  // Get feedback by user (placeholder - would need API endpoint)
  static async getFeedbackByUser(userId: string): Promise<FeedbackRecord[]> {
    // This would need a GET /api/feedback endpoint
    return [];
  }
  
  // Get all feedback (placeholder - would need API endpoint)
  static async getAllFeedback(): Promise<FeedbackRecord[]> {
    return [];
  }
  
  // Get feedback statistics (placeholder - would need API endpoint)
  static async getFeedbackStats(): Promise<{
    total: number;
    averageRating: number;
    ratingDistribution: Record<number, number>;
  }> {
    return {
      total: 0,
      averageRating: 0,
      ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    };
  }
}

export default LocalFeedback;
