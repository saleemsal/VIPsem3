-- Create model preferences table
CREATE TABLE IF NOT EXISTS model_preferences (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID,
  message_id UUID,
  model_a VARCHAR(50) NOT NULL,
  model_b VARCHAR(50) NOT NULL,
  response_a TEXT NOT NULL,
  response_b TEXT NOT NULL,
  preferred_model VARCHAR(50) NOT NULL,
  reasoning_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_model_preferences_user_id ON model_preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_model_preferences_created_at ON model_preferences(created_at);

-- Enable RLS
ALTER TABLE model_preferences ENABLE ROW LEVEL SECURITY;

-- Create RLS policy
CREATE POLICY "Users can view their own model preferences" ON model_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Create RLS policy for insert
CREATE POLICY "Users can insert their own model preferences" ON model_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);
