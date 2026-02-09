import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

function cors(h: Headers) {
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
  return h;
}

// Extract clean JSON from possible markdown fences or extra text
function sanitizeJSON(text: string): string {
  if (!text) return text;
  // Remove code fences ```json ... ``` or ``` ... ```
  const unfenced = text.replace(/```(?:json)?\n([\s\S]*?)```/gi, '$1');
  // Trim and find the first opening { and last closing }
  const first = unfenced.indexOf('{');
  const last = unfenced.lastIndexOf('}');
  if (first !== -1 && last !== -1 && last > first) {
    return unfenced.slice(first, last + 1);
  }
  return unfenced.trim();
}

serve(async (req) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(new Headers()) });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { 
      status: 405, 
      headers: cors(new Headers({"Content-Type":"application/json"})) 
    });
  }

  try {
    const body = await req.json();
    console.log('Request body:', body);
    
    const { context, questionCount, difficulty, systemPrompt } = body;

    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "Gemini API key not configured" }), {
        status: 500,
        headers: cors(new Headers({"Content-Type":"application/json"}))
      });
    }

    if (!context) {
      return new Response(JSON.stringify({ error: "No context provided" }), {
        status: 400,
        headers: cors(new Headers({"Content-Type":"application/json"}))
      });
    }

    // Use Gemini 1.5 Flash via Google API
    let fallbackUsed = false;

    const makeGeminiRequest = async () => {
      console.log('Making request to Gemini 1.5 Flash');
      const response = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                { text: `${systemPrompt}\n\nContext:\n${context}\n\nGenerate ${questionCount} practice questions with ${difficulty} difficulty.\n\nReturn valid JSON only; no code fences or prose.` }
              ]
            }
          ],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 4096,
          }
        }),
      });
      return response;
    };

    let response = await makeGeminiRequest();
    console.log(`Gemini response status: ${response.status}`);

    // Handle rate limiting with retry
    if (response.status === 429) {
      console.log('Rate limited, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      response = await makeGeminiRequest();
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', errorText);
      
      // Return specific error messages
      let errorMessage = `Gemini API error: ${response.status}`;
      try {
        const errorData = JSON.parse(errorText);
        if (errorData.error?.message) {
          errorMessage = `Gemini API error: ${errorData.error.message}`;
        }
      } catch {
        // Use default error message
      }
      
      return new Response(JSON.stringify({ error: errorMessage }), {
        status: 500,
        headers: cors(new Headers({"Content-Type":"application/json"}))
      });
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content generated");
    }

    console.log('Generated content length:', content.length);

    // Parse JSON response
    let practiceSet;
    try {
      practiceSet = JSON.parse(sanitizeJSON(content));
    } catch (parseError) {
      console.log('JSON parse failed, re-prompting...');
      // Re-prompt for valid JSON
      const retryMessages = [
        { role: "system", content: "Return valid JSON only; no prose." },
        { role: "user", content: `Fix this JSON and return only valid JSON:\n${content}` }
      ];
      
      const retryResponse = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: `Return valid JSON only; no prose.\n\nFix this JSON and return only valid JSON:\n${content}` }]
            }
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 4096,
          }
        }),
      });
      
      if (retryResponse.ok) {
        const retryData = await retryResponse.json();
        const retryContent = retryData.candidates?.[0]?.content?.parts?.[0]?.text;
        practiceSet = JSON.parse(sanitizeJSON(retryContent));
      } else {
        throw new Error("Failed to generate valid JSON");
      }
    }

    console.log('Practice set generated successfully');

    const headers = cors(new Headers({"Content-Type":"application/json"}));
    return new Response(JSON.stringify({ 
      practiceSet,
      fallbackModel: fallbackUsed ? "gemini-1.5-flash-fallback" : null
    }), { headers });

  } catch (error) {
    console.error("Practice generation error:", error);
    const headers = cors(new Headers({"Content-Type":"application/json"}));
    return new Response(JSON.stringify({ 
      error: error.message 
    }), { 
      status: 500, 
      headers 
    });
  }
});