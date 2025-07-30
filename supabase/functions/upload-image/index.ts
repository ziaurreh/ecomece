import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const CLOUDINARY_CLOUD_NAME = Deno.env.get("CLOUDINARY_CLOUD_NAME");
const CLOUDINARY_API_KEY = Deno.env.get("CLOUDINARY_API_KEY");
const CLOUDINARY_API_SECRET = Deno.env.get("CLOUDINARY_API_SECRET");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error('Cloudinary credentials not configured');
    }

    const formData = await req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'ecommerce';

    if (!file) {
      throw new Error('No file provided');
    }

    // Create a new FormData for Cloudinary
    const cloudinaryFormData = new FormData();
    cloudinaryFormData.append('file', file);
    cloudinaryFormData.append('folder', folder);
    cloudinaryFormData.append('api_key', CLOUDINARY_API_KEY);

    // Generate timestamp and signature for authentication
    const timestamp = Math.round(Date.now() / 1000);
    cloudinaryFormData.append('timestamp', timestamp.toString());

    // Create signature string
    const signatureString = `folder=${folder}&timestamp=${timestamp}${CLOUDINARY_API_SECRET}`;
    
    // Generate SHA-1 hash
    const encoder = new TextEncoder();
    const data = encoder.encode(signatureString);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const signature = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    cloudinaryFormData.append('signature', signature);

    // Upload to Cloudinary
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
      {
        method: 'POST',
        body: cloudinaryFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Cloudinary error:', errorText);
      throw new Error(`Cloudinary upload failed: ${response.status}`);
    }

    const result = await response.json();
    
    return new Response(
      JSON.stringify({
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Upload error:', error);
    
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Upload failed' 
      }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});