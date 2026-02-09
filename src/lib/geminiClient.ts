import { API_BASE } from './runtime';

export async function* geminiStream({ prompt, system, context }: { 
  prompt: string; 
  system?: string; 
  context?: string; 
}) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s timeout
  
  try {
    const res = await fetch(API_BASE, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, system, context }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!res.ok || !res.body) {
      const errorText = await res.text();
      let errorMessage = `API error ${res.status}`;
      
      try {
        const errorJson = JSON.parse(errorText);
        if (errorJson.suggestion) {
          errorMessage = errorJson.suggestion;
        } else if (errorJson.error) {
          errorMessage = errorJson.error;
        }
      } catch {
        errorMessage = errorText || errorMessage;
      }
      
      // Return error with sentinel
      yield `[Error] ${errorMessage}\n`;
      yield JSON.stringify({
        done: true,
        citations: [],
        model: "Error",
        grounded: false
      });
      return;
    }
    
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      yield dec.decode(value, { stream: true });
    }
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      yield `[Error] Request timeout\n`;
    } else {
      yield `[Error] ${error.message}\n`;
    }
    yield JSON.stringify({
      done: true,
      citations: [],
      model: "Error",
      grounded: false
    });
  }
}