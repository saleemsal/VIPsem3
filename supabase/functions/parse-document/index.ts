import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Parse document request received');
    
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      throw new Error('No file provided');
    }

    console.log(`Processing file: ${file.name}, type: ${file.type}, size: ${file.size}`);

    let extractedText = '';

    // Handle different file types
    if (file.type === 'application/pdf') {
      // For PDFs, first check if it exists in our document_pages table
      try {
        const { data: documents, error: docError } = await supabase
          .from('documents')
          .select('id')
          .eq('name', file.name)
          .single();

        if (!docError && documents) {
          const { data: documentPages, error: pagesError } = await supabase
            .from('document_pages')
            .select('text, page')
            .eq('document_id', documents.id)
            .order('page');

          if (!pagesError && documentPages && documentPages.length > 0) {
            // Use content from database
            extractedText = documentPages
              .map(page => `Page ${page.page}: ${page.text}`)
              .join('\n\n')
              .trim();
            console.log(`Retrieved ${documentPages.length} pages from database`);
          }
        }
      } catch (dbError) {
        console.log('Database lookup failed, attempting direct parsing:', dbError);
      }

      // If no database content found, try basic text extraction
      if (!extractedText) {
        try {
          const arrayBuffer = await file.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          
          // Convert to string and look for readable text
          const textContent = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
          
          // Extract readable text using simple regex patterns
          const readableChunks = [];
          
          // Look for text within parentheses (common in PDF text objects)
          const textInParens = textContent.match(/\([^)]{2,}\)/g);
          if (textInParens) {
            textInParens.forEach(match => {
              const text = match.slice(1, -1); // Remove parentheses
              if (text.match(/[a-zA-Z]/)) { // Contains letters
                readableChunks.push(text);
              }
            });
          }
          
          // Look for words in the content
          const words = textContent.match(/[a-zA-Z]{3,}/g);
          if (words && words.length > 10) {
            readableChunks.push(...words.slice(0, 100)); // Limit to first 100 words
          }
          
          if (readableChunks.length > 0) {
            extractedText = readableChunks
              .join(' ')
              .replace(/\s+/g, ' ')
              .trim()
              .substring(0, 5000); // Limit length
          }
          
          if (!extractedText || extractedText.length < 20) {
            extractedText = `PDF file "${file.name}" has been uploaded. This PDF contains ${Math.round(file.size / 1024)}KB of data and appears to have complex formatting or scanned content that requires specialized parsing.`;
          }
          
        } catch (error) {
          console.error('PDF parsing error:', error);
          extractedText = `PDF file "${file.name}" uploaded successfully. The file contains ${Math.round(file.size / 1024)}KB of content but text extraction failed. You can still reference this document by name.`;
        }
      }
    } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      // Handle text files
      extractedText = await file.text();
    } else if (file.type.startsWith('image/')) {
      extractedText = `Image file "${file.name}" uploaded successfully. This is a ${file.type} image file that can be referenced in questions.`;
    } else {
      // Try to read as text
      try {
        extractedText = await file.text();
      } catch {
        extractedText = `File "${file.name}" uploaded successfully. This ${file.type} file may contain binary data.`;
      }
    }

    console.log(`Extracted text length: ${extractedText.length} characters`);

    return new Response(
      JSON.stringify({
        success: true,
        text: extractedText,
        filename: file.name,
        type: file.type,
        size: file.size
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Error in parse-document function:', error);
    
    return new Response(
      JSON.stringify({
        error: 'Failed to parse document',
        details: error.message
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});