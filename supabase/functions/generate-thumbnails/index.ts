import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.8";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Thumbnail sizes configuration
const SIZES = {
  thumbnail: 150,  // For grid tiles
  medium: 400,     // For detail views
  // Original is kept as-is
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { imagePath, bucket } = await req.json();

    if (!imagePath || !bucket) {
      return new Response(
        JSON.stringify({ error: 'Missing imagePath or bucket' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing thumbnails for: ${imagePath} in bucket: ${bucket}`);

    // Initialize Supabase client with service role for storage access
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Download the original image
    const { data: fileData, error: downloadError } = await supabase.storage
      .from(bucket)
      .download(imagePath);

    if (downloadError) {
      console.error('Download error:', downloadError);
      return new Response(
        JSON.stringify({ error: 'Failed to download original image', details: downloadError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Convert to array buffer for processing
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    // Get file extension and base path
    const pathParts = imagePath.split('/');
    const fileName = pathParts.pop()!;
    const basePath = pathParts.join('/');
    const fileNameWithoutExt = fileName.substring(0, fileName.lastIndexOf('.'));
    const fileExt = fileName.substring(fileName.lastIndexOf('.'));

    const thumbnailUrls: Record<string, string> = {};

    // Use image transformation via canvas API simulation
    // Since Deno doesn't have native image processing, we'll use a different approach:
    // We'll store the original and use URL-based sizing or resize on the client
    
    // For now, let's use a simpler approach: store multiple copies with metadata
    // In production, you might want to use a library like sharp via npm or an external service

    // Upload resized versions using the Lovable AI image editing capability
    for (const [sizeName, targetSize] of Object.entries(SIZES)) {
      try {
        // Create the thumbnail path
        const thumbnailPath = `${basePath}/${fileNameWithoutExt}_${sizeName}${fileExt}`;
        
        // For this implementation, we'll use the Lovable AI API to resize images
        const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
        
        if (!lovableApiKey) {
          console.error('LOVABLE_API_KEY not configured');
          continue;
        }

        // Convert image to base64 for the API
        const base64Image = btoa(String.fromCharCode(...uint8Array));
        const mimeType = fileExt.toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        // Use Lovable AI to resize the image
        const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${lovableApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash-image-preview',
            messages: [
              {
                role: 'user',
                content: [
                  {
                    type: 'text',
                    text: `Resize this image to ${targetSize}x${targetSize} pixels maximum dimension while maintaining aspect ratio. Keep the image quality high and maintain the original content exactly as it is. Do not add any effects, filters, or modifications other than resizing.`
                  },
                  {
                    type: 'image_url',
                    image_url: { url: dataUrl }
                  }
                ]
              }
            ],
            modalities: ['image', 'text']
          })
        });

        if (!response.ok) {
          console.error(`Failed to resize image for ${sizeName}:`, await response.text());
          continue;
        }

        const aiResult = await response.json();
        const resizedImageUrl = aiResult.choices?.[0]?.message?.images?.[0]?.image_url?.url;

        if (!resizedImageUrl) {
          console.error(`No resized image returned for ${sizeName}`);
          continue;
        }

        // Extract base64 data from the data URL
        const base64Data = resizedImageUrl.split(',')[1];
        const resizedBytes = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));

        // Upload the resized image
        const { error: uploadError } = await supabase.storage
          .from(bucket)
          .upload(thumbnailPath, resizedBytes, {
            contentType: mimeType,
            upsert: true
          });

        if (uploadError) {
          console.error(`Upload error for ${sizeName}:`, uploadError);
          continue;
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(bucket)
          .getPublicUrl(thumbnailPath);

        thumbnailUrls[sizeName] = urlData.publicUrl;
        console.log(`Created ${sizeName} thumbnail: ${thumbnailPath}`);

      } catch (sizeError) {
        console.error(`Error processing ${sizeName}:`, sizeError);
      }
    }

    // Get the original URL
    const { data: originalUrlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(imagePath);

    thumbnailUrls.original = originalUrlData.publicUrl;

    console.log('Thumbnail generation complete:', thumbnailUrls);

    return new Response(
      JSON.stringify({ 
        success: true, 
        urls: thumbnailUrls 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in generate-thumbnails:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
