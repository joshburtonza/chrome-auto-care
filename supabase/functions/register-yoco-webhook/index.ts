import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const secretKey = Deno.env.get('YOCO_SECRET_KEY')!;
    
    const webhookUrl = `${supabaseUrl}/functions/v1/yoco-webhook`;
    
    console.log('Registering Yoco webhook at:', webhookUrl);
    console.log('Using secret key:', secretKey.substring(0, 10) + '...');

    const response = await fetch('https://payments.yoco.com/api/webhooks', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'race-technik-webhook',
        url: webhookUrl,
      }),
    });

    const responseText = await response.text();
    console.log('Yoco response status:', response.status);
    console.log('Yoco response:', responseText);

    if (!response.ok) {
      return new Response(
        JSON.stringify({ 
          error: 'Failed to register webhook', 
          status: response.status,
          details: responseText 
        }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = JSON.parse(responseText);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Webhook registered successfully',
        webhookUrl,
        webhookId: data.id,
        data 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error registering webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
