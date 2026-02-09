// Intent classification for chat routing
export type UserIntent = 'meta' | 'study' | 'navigation';

export function classifyIntent(prompt: string): UserIntent {
  const lowerPrompt = prompt.toLowerCase().trim();
  
  // Meta/product queries - about GT Study Buddy itself
  const metaPatterns = [
    /^(hello|hi|hey)/,
    /what are you/,
    /who are you/,
    /tell me about yourself/,
    /what can you do/,
    /how do you work/,
    /what is this/,
    /help me understand/,
    /introduce yourself/,
    /capabilities/,
    /features/,
    /how does this work/
  ];
  
  // Navigation/upload guidance
  const navPatterns = [
    /upload/,
    /file/,
    /document/,
    /attach/,
    /open/,
    /load/,
    /import/,
    /how do i add/,
    /how to upload/
  ];
  
  // Check meta patterns first (higher priority)
  if (metaPatterns.some(pattern => pattern.test(lowerPrompt))) {
    return 'meta';
  }
  
  // Check navigation patterns
  if (navPatterns.some(pattern => pattern.test(lowerPrompt))) {
    return 'navigation';
  }
  
  // Default to study query
  return 'study';
}