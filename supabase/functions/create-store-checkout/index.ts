import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Input validation
function validateStoreCheckoutRequest(data: unknown): { valid: boolean; error?: string; parsed?: { orderId: string; amount: number; currency: string; testMode: boolean } } {
  if (!data || typeof data !== 'object') return { valid: false, error: 'Invalid request body' };
  const d = data as Record<string, unknown>;
  
  if (typeof d.orderId !== 'string' || !d.orderId || d.orderId.length > 100) {
    return { valid: false, error: 'Invalid orderId' };
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(d.orderId)) {
    return { valid: false, error: 'orderId must be a valid UUID' };
  }
  if (typeof d.amount !== 'number' || d.amount <= 0 || d.amount > 1000000 || !isFinite(d.amount)) {
    return { valid: false, error: 'Invalid amount' };
  }
  const currency = typeof d.currency === 'string' ? d.currency : 'ZAR';
  if (currency !== 'ZAR') {
    return { valid: false, error: 'Only ZAR currency supported' };
  }
  const testMode = typeof d.testMode === 'boolean' ? d.testMode : false;

  return { valid: true, parsed: { orderId: d.orderId, amount: d.amount, currency, testMode } };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const rawBody = await req.json();
    const validation = validateStoreCheckoutRequest(rawBody);
    
    if (!validation.valid || !validation.parsed) {
      return new Response(
        JSON.stringify({ error: validation.error || 'Invalid request' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { orderId, amount, currency, testMode } = validation.parsed;
    
    const yocoSecretKey = testMode 
      ? Deno.env.get('YOCO_TEST_SECRET_KEY')
      : Deno.env.get('YOCO_SECRET_KEY');
    
    if (!yocoSecretKey) {
      console.error(`${testMode ? 'Test' : 'Live'} YOCO_SECRET_KEY not configured`);
      return new Response(
        JSON.stringify({ error: 'Payment gateway not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Creating Yoco checkout in ${testMode ? 'TEST' : 'LIVE'} mode for order:`, orderId);

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (orderError || !order) {
      console.error('Order not found:', orderError);
      return new Response(
        JSON.stringify({ error: 'Order not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const yocoResponse = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: currency,
        cancelUrl: `${req.headers.get('origin')}/store`,
        successUrl: `${req.headers.get('origin')}/store?payment=success`,
        failureUrl: `${req.headers.get('origin')}/store?payment=failed`,
        metadata: {
          orderId: orderId,
          orderType: 'merchandise',
        },
      }),
    });

    if (!yocoResponse.ok) {
      const errorData = await yocoResponse.text();
      console.error('Yoco API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session' }),
        { status: yocoResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkoutData = await yocoResponse.json();
    console.log('Yoco checkout created:', checkoutData.id);

    const { error: updateError } = await supabase
      .from('orders')
      .update({
        yoco_checkout_id: checkoutData.id,
        payment_status: 'pending',
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Failed to update order:', updateError);
    }

    return new Response(
      JSON.stringify({
        checkoutId: checkoutData.id,
        redirectUrl: checkoutData.redirectUrl,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-store-checkout:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
