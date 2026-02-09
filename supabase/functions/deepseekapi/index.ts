// deno-lint-ignore-file no-explicit-any
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("DEEPSEEK_API_KEY") || Deno.env.get("GEMINI_API_KEY");
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

function cors(h: Headers) {
  h.set("Access-Control-Allow-Origin", "*");
  h.set("Access-Control-Allow-Headers", "authorization, x-client-info, apikey, content-type");
  h.set("Access-Control-Allow-Methods", "POST, OPTIONS, GET");
  return h;
}

serve(async (req) => {
  console.log(`Request: ${req.method} ${req.url}`);
  
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors(new Headers()) });
  if (req.method === "GET") {
    const h = cors(new Headers({ "Content-Type": "application/json" }));
    return new Response(JSON.stringify({ ok: true, provider: "gemini-1.5-flash" }), { headers: h });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method Not Allowed" }), { 
      status: 405, 
      headers: cors(new Headers({"Content-Type":"application/json"})) 
    });
  }

  try {
    const body = await req.json();
    console.log('Request body received:', JSON.stringify(body, null, 2));
    
    const { prompt, system, context } = body;
    if (!prompt || typeof prompt !== "string") {
      console.log('Missing or invalid prompt:', prompt);
      return new Response(JSON.stringify({ error: "Missing prompt" }), { 
        status: 400, 
        headers: cors(new Headers({"Content-Type":"application/json"})) 
      });
    }

    // Build content for Gemini
    let content = prompt;
    if (system) {
      content = `${system}\n\n${content}`;
      console.log('Added system prompt to content');
    }
    if (context) {
      content = `Use ONLY this context; cite when possible:\n${context}\n\n${content}`;
      console.log('Added context to content, context length:', context.length);
    }

    console.log('Final content length:', content.length);
    console.log('Making request to Gemini API...');

    const upstream = await fetch(`${GEMINI_BASE}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: content }]
        }],
        generationConfig: {
          temperature: 0.3,
        }
      }),
    });

    console.log('Gemini response status:', upstream.status);

    if (!upstream.ok) {
      const errorText = await upstream.text();
      console.error('Gemini API error:', errorText);
      
      // Return error as stream with sentinel
      const enc = new TextEncoder();
      const errorStream = new ReadableStream({
        start(controller) {
          controller.enqueue(enc.encode(`[Error] Gemini API error: ${upstream.status}\n`));
          const sentinel = JSON.stringify({
            done: true,
            citations: [],
            model: "Gemini 1.5 Flash",
            grounded: false
          });
          controller.enqueue(enc.encode(sentinel));
          controller.close();
        }
      });
      
      const headers = cors(new Headers({
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      }));
      return new Response(errorStream, { headers });
    }

    const data = await upstream.json();
    console.log('Gemini API response data:', JSON.stringify(data, null, 2));
    
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    console.log('Extracted text length:', text.length);

    // Return the response as JSON with proper structure
    const responseData = {
      text: text,
      model: "Gemini 1.5 Flash",
      grounded: !!context,
      citations: context ? [] : undefined
    };

    console.log('Returning response:', JSON.stringify(responseData, null, 2));

    const headers = cors(new Headers({
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    }));
    
    return new Response(JSON.stringify(responseData), { headers });
    
  } catch (error) {
    console.error('Function error:', error);
    return new Response(JSON.stringify({ error: error.message }), { 
      status: 500, 
      headers: cors(new Headers({"Content-Type":"application/json"})) 
    });
  }
});