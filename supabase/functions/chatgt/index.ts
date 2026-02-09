import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const geminiApiKey = Deno.env.get('DEEPSEEK_API_KEY') || Deno.env.get('GEMINI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ChatRequest {
  message: string;
  fileContext?: string;
  files?: Array<{ name: string; type: string }>;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('ChatGT request received');
    
    if (!geminiApiKey) {
      throw new Error('Gemini API key not configured');
    }

    const { message, fileContext, files = [] }: ChatRequest = await req.json();
    console.log('Request data:', { message, filesCount: files.length });

    // Build the context for Gemini
    let systemPrompt = `You are ChatGT, a helpful AI assistant powered by the AI Makerspace. You are designed to help users with questions and provide accurate, helpful responses.

When answering questions:
1. Be concise but thorough
2. Use markdown formatting for better readability
3. If you reference information from uploaded files, cite them by name
4. Be friendly and professional`;

    let userPrompt = message;

    // Add file context if available
    if (fileContext && fileContext.trim()) {
      systemPrompt += `\n\nYou have access to the following uploaded files and their content:\n${fileContext}`;
      userPrompt += `\n\nPlease consider the uploaded files when answering this question.`;
    }

    // Prepare the request to Gemini API
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`;
    
    const requestBody = {
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }]
      },
      contents: [
        {
          role: "user",
          parts: [{ text: userPrompt }]
        }
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      }
    };

    console.log('Making request to Gemini API...');
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      // Handle quota exceeded specifically
      if (response.status === 429) {
        throw new Error('Gemini API quota exceeded. Please try again later.');
      }
      
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('Gemini API response received');

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Invalid Gemini response structure:', data);
      throw new Error('Invalid response from Gemini API');
    }

    const aiResponse = data.candidates[0].content.parts[0].text;
    
    // Extract sources from the response if files were referenced
    const sources: string[] = [];
    if (files.length > 0) {
      // Simple source extraction - look for file names mentioned in the response
      files.forEach(file => {
        if (aiResponse.toLowerCase().includes(file.name.toLowerCase())) {
          sources.push(file.name);
        }
      });
    }

    console.log('Returning response with sources:', sources);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        sources: sources,
        model: 'Gemini 1.5 Flash'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in ChatGT function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to process request',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});