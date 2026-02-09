// Gemini API integration utility

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface StreamChatOptions {
  system?: string;
  messages: ChatMessage[];
  model: "gemini-1.5-flash" | "gemini-1.5-pro";
  response_format?: "text" | "json_object";
  max_tokens?: number;
  temperature?: number;
}

export interface ChatResponse {
  content: string;
  citations?: Array<{
    source: string;
    page: number;
    confidence: number;
    snippet: string;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class GeminiClient {
  private apiKey: string;
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async streamChat(options: StreamChatOptions): Promise<ReadableStream<string>> {
    const { system, messages, model, response_format = "text", max_tokens = 4000, temperature = 0.7 } = options;

    const requestBody = {
      model,
      messages: system ? [{ role: "system", content: system }, ...messages] : messages,
      stream: true,
      max_tokens,
      temperature,
      ...(response_format === "json_object" && { response_format: { type: "json_object" } })
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error("Failed to get response reader");
    }

    return new ReadableStream({
      start(controller) {
        function pump(): any {
          return reader.read().then(({ done, value }) => {
            if (done) {
              controller.close();
              return;
            }

            // Parse SSE data
            const chunk = new TextDecoder().decode(value);
            const lines = chunk.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data.trim() === '[DONE]') {
                  controller.close();
                  return;
                }
                
                try {
                  const parsed = JSON.parse(data);
                  const content = parsed.choices?.[0]?.delta?.content;
                  if (content) {
                    controller.enqueue(content);
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }

            return pump();
          });
        }

        return pump();
      }
    });
  }

  async chat(options: StreamChatOptions): Promise<ChatResponse> {
    const { system, messages, model, response_format = "text", max_tokens = 4000, temperature = 0.7 } = options;

    const requestBody = {
      model,
      messages: system ? [{ role: "system", content: system }, ...messages] : messages,
      stream: false,
      max_tokens,
      temperature,
      ...(response_format === "json_object" && { response_format: { type: "json_object" } })
    };

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices?.[0]?.message?.content || "",
      usage: data.usage
    };
  }
}

// Utility function to get Gemini client (would read from environment in real app)
export function getGeminiClient(): GeminiClient {
  const apiKey = process.env.GEMINI_API_KEY || "mock-api-key";
  return new GeminiClient(apiKey);
}