import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    if (!image) {
      return new Response(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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
                text: 'Analyze this tool image and extract detailed information. Identify the tool name, brand (if visible), provide a detailed description, determine the best matching category, estimate the condition based on visual appearance, and identify the power source type if visible from the image, labels, or visible features.'
              },
              {
                type: 'image_url',
                image_url: {
                  url: image
                }
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
                  description: {
                    type: 'string',
                    description: 'A detailed description of the tool including its features, specifications, and potential uses'
                  },
                  category: {
                    type: 'string',
                    enum: ['Power Tools', 'Hand Tools', 'Garden & Outdoor', 'Ladders & Scaffolding', 'Measuring & Layout', 'Safety Equipment', 'Automotive', 'Cleaning', 'Other'],
                    description: 'The category that best matches this tool'
                  },
                  condition: {
                    type: 'string',
                    enum: ['new', 'excellent', 'good', 'fair', 'worn'],
                    description: 'Visual condition assessment: new (unused), excellent (like new), good (minor wear), fair (visible wear), worn (significant wear)'
                  },
                  confidence: {
                    type: 'number',
                    description: 'Confidence score from 0-100 for the identification'
                  },
                  brand: {
                    type: 'string',
                    description: 'The brand or manufacturer name if visible on the tool (e.g., "DeWalt", "Milwaukee", "Bosch", "Craftsman")'
                  },
                  power_source: {
                    type: 'string',
                    enum: ['battery', 'corded', 'gas', 'manual', 'pneumatic', 'hybrid'],
                    description: 'The power source type if identifiable: battery (cordless/battery-powered), corded (electric with cord), gas (fuel-powered), manual (hand-powered), pneumatic (air-powered), hybrid (multiple power options)'
                  }
                },
                required: ['tool_name', 'description', 'category', 'condition', 'confidence']
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
