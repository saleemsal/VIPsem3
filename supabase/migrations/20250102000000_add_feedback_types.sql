-- Add feedback_type column to support different types of feedback
ALTER TABLE public.feedback 
ADD COLUMN feedback_type TEXT DEFAULT 'chatbot' CHECK (feedback_type IN ('chatbot', 'practice_quiz', 'flashcards'));

-- Add context_id column to store related IDs (quiz ID, flashcard deck ID, etc.)
ALTER TABLE public.feedback 
ADD COLUMN context_id TEXT;

-- Update existing feedback records to have 'chatbot' type
UPDATE public.feedback 
SET feedback_type = 'chatbot' 
WHERE feedback_type IS NULL;

-- Create index for faster queries by feedback type
CREATE INDEX idx_feedback_type ON public.feedback(feedback_type);
CREATE INDEX idx_feedback_context_id ON public.feedback(context_id);
