import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface AnalysisResult {
  toolId: string;
  toolName: string;
  success: boolean;
  brand?: string;
  powerSource?: string;
  error?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate environment configuration
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing required environment variables');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Starting batch analysis for user:', user.id);

    // Fetch tools with images but missing brand or power_source, owned by the current user
    const { data: tools, error: fetchError } = await supabase
      .from('tools')
      .select('id, name, image_url, brand, power_source, owner_id')
      .eq('owner_id', user.id)
      .not('image_url', 'is', null)
      .or('brand.is.null,power_source.is.null');

    if (fetchError) {
      console.error('Error fetching tools:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch tools', details: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!tools || tools.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No tools found that need analysis',
          processed: 0,
          updated: 0,
          failed: 0,
          details: []
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Found ${tools.length} tools to analyze`);

    const results: AnalysisResult[] = [];
    let updated = 0;
    let failed = 0;

    // Process each tool
    for (const tool of tools) {
      try {
        console.log(`Analyzing tool: ${tool.name} (${tool.id})`);

        // Call the analyze-tool-image function
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke(
          'analyze-tool-image',
          {
            body: { image: tool.image_url }
          }
        );

        if (analysisError) {
          console.error(`Analysis failed for ${tool.name}:`, analysisError);
          failed++;
          results.push({
            toolId: tool.id,
            toolName: tool.name,
            success: false,
            error: analysisError.message
          });
          continue;
        }

        const { brand, power_source } = analysisData;

        // Update the tool with the new data
        const updateData: any = {};
        if (brand && !tool.brand) updateData.brand = brand;
        if (power_source && !tool.power_source) updateData.power_source = power_source;

        if (Object.keys(updateData).length > 0) {
          const { error: updateError } = await supabase
            .from('tools')
            .update(updateData)
            .eq('id', tool.id);

          if (updateError) {
            console.error(`Update failed for ${tool.name}:`, updateError);
            failed++;
            results.push({
              toolId: tool.id,
              toolName: tool.name,
              success: false,
              error: updateError.message
            });
          } else {
            console.log(`Successfully updated ${tool.name} with:`, updateData);
            updated++;
            results.push({
              toolId: tool.id,
              toolName: tool.name,
              success: true,
              brand: updateData.brand,
              powerSource: updateData.power_source
            });
          }
        } else {
          console.log(`No new data to update for ${tool.name}`);
          results.push({
            toolId: tool.id,
            toolName: tool.name,
            success: true,
            brand: tool.brand || 'Not detected',
            powerSource: tool.power_source || 'Not detected'
          });
        }

        // Add delay to avoid rate limiting (500ms between requests)
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (error) {
        console.error(`Error processing tool ${tool.name}:`, error);
        failed++;
        results.push({
          toolId: tool.id,
          toolName: tool.name,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    const summary = {
      message: 'Batch analysis completed',
      processed: tools.length,
      updated,
      failed,
      details: results
    };

    console.log('Batch analysis summary:', summary);

    return new Response(
      JSON.stringify(summary),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error in batch-analyze-tools:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
