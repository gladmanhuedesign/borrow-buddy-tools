import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestSchema = z.object({
      image: z.string()
        .min(1, "Image required")
        .max(10 * 1024 * 1024, "Image too large (max 10MB base64)")
        .refine(
          (val) => val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://'),
          "Must be a valid base64 image or image URL"
        )
    });

    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);

    if (!validationResult.success) {
      console.error('Validation failed:', validationResult.error.issues);
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          details: validationResult.error.issues.map(i => i.message).join(', ')
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { image } = validationResult.data;
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    console.log('Analyzing tool image with Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: 'Analyze this tool image and extract detailed structured information. Identify the tool, its brand, condition, power source, and write helpful sections that explain what the tool is for, how to use it, common projects, and safety tips. Keep the short_description to 1-2 sentences. Each list item should be a single concise phrase or sentence.'
              },
              {
                type: 'image_url',
                image_url: { url: image }
              }
            ]
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_tool',
              description: 'Extract structured information about a tool from an image',
              parameters: {
                type: 'object',
                properties: {
                  tool_name: {
                    type: 'string',
                    description: 'The specific name of the tool (e.g., "Cordless Drill", "Hammer", "Lawn Mower")'
                  },
                  short_description: {
                    type: 'string',
                    description: '1-2 sentence summary of what this tool is. Used in cards and search results.'
                  },
                  common_uses: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '3-6 typical tasks this tool is good for. Each item is a short phrase.'
                  },
                  how_to_use: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '3-7 ordered steps for safely operating this tool.'
                  },
                  common_projects: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '3-5 example projects or scenarios where this tool is commonly used.'
                  },
                  safety_tips: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '3-5 important safety considerations, PPE recommendations, or things to avoid.'
                  },
                  tips_and_tricks: {
                    type: 'array',
                    items: { type: 'string' },
                    description: '2-4 helpful tips for getting the best results with this tool.'
                  },
                  description: {
                    type: 'string',
                    description: 'Legacy combined description. Provide a paragraph summary covering features and uses for backward compatibility.'
                  },
                  category: {
                    type: 'string',
                    enum: ['Power Tools', 'Hand Tools', 'Garden & Outdoor', 'Ladders & Scaffolding', 'Measuring & Layout', 'Safety Equipment', 'Automotive', 'Cleaning', 'Other'],
                    description: 'The category that best matches this tool'
                  },
                  condition: {
                    type: 'string',
                    enum: ['new', 'excellent', 'good', 'fair', 'worn'],
                    description: 'Visual condition assessment'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score from 0-100 for the identification'
                  },
                  brand: {
                    type: 'string',
                    description: 'The brand or manufacturer name if visible (e.g., "DeWalt", "Milwaukee", "Bosch")'
                  },
                  power_source: {
                    type: 'string',
                    enum: ['battery', 'corded', 'gas', 'manual', 'pneumatic', 'hybrid'],
                    description: 'The power source type if identifiable'
                  }
                },
                required: ['tool_name', 'short_description', 'common_uses', 'how_to_use', 'description', 'category', 'condition', 'confidence']
              }
            }
          }
        ],
        tool_choice: {
          type: 'function',
          function: { name: 'analyze_tool' }
        }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limits exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Payment required. Please add credits to your Lovable AI workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const errorText = await response.text();
      console.error('AI gateway error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI analysis failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log('AI response:', JSON.stringify(data, null, 2));

    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(
        JSON.stringify({ error: 'No tool analysis data received' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const toolData = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        data: toolData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-tool-image:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
