export async function readSSE(
  response: Response,
  onToken: (token: string) => void,
  onDone?: (finalJson?: any) => void
): Promise<void> {
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('Failed to get response reader');
  }

  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep the last incomplete line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.trim()) {
          // Check if line is JSON (final data)
          if (line.startsWith('{') && line.endsWith('}')) {
            try {
              const finalJson = JSON.parse(line);
              onDone?.(finalJson);
              return;
            } catch (e) {
              // Not valid JSON, treat as token
              onToken(line);
            }
          } else {
            // Regular token
            onToken(line);
          }
        }
      }
    }

    // Process any remaining buffer
    if (buffer.trim()) {
      if (buffer.startsWith('{') && buffer.endsWith('}')) {
        try {
          const finalJson = JSON.parse(buffer);
          onDone?.(finalJson);
        } catch (e) {
          onToken(buffer);
        }
      } else {
        onToken(buffer);
      }
    }

    onDone?.();
  } catch (error) {
    throw error;
  }
}
