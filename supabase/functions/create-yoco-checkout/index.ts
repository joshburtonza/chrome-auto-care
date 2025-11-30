import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CheckoutRequest {
  bookingId: string;
  amount: number;
  currency?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  testMode?: boolean;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the appropriate API key based on test mode
    const { bookingId, amount, currency = 'ZAR', customerEmail, metadata, testMode = false }: CheckoutRequest = await req.json();
    
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

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Creating Yoco checkout in ${testMode ? 'TEST' : 'LIVE'} mode for booking:`, bookingId);

    // Verify booking exists and get details
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select(`
        *,
        services(title, category),
        vehicles(make, model, year)
      `)
      .eq('id', bookingId)
      .single();

    if (bookingError || !booking) {
      console.error('Booking not found:', bookingError);
      return new Response(
        JSON.stringify({ error: 'Booking not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create checkout session with Yoco
    const yocoResponse = await fetch('https://payments.yoco.com/api/checkouts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${yocoSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100), // Convert to cents
        currency: currency,
        cancelUrl: `${req.headers.get('origin')}/bookings`,
        successUrl: `${req.headers.get('origin')}/bookings?payment=success`,
        failureUrl: `${req.headers.get('origin')}/bookings?payment=failed`,
        metadata: {
          bookingId: bookingId,
          serviceName: booking.services?.title || 'Service',
          vehicleInfo: `${booking.vehicles?.year || ''} ${booking.vehicles?.make || ''} ${booking.vehicles?.model || ''}`.trim(),
          ...metadata,
        },
      }),
    });

    if (!yocoResponse.ok) {
      const errorData = await yocoResponse.text();
      console.error('Yoco API error:', errorData);
      return new Response(
        JSON.stringify({ error: 'Failed to create checkout session', details: errorData }),
        { status: yocoResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const checkoutData = await yocoResponse.json();
    console.log('Yoco checkout created:', checkoutData.id);

    // Update booking with checkout ID and amount
    const { error: updateError } = await supabase
      .from('bookings')
      .update({
        yoco_checkout_id: checkoutData.id,
        payment_amount: amount,
        payment_status: 'pending',
      })
      .eq('id', bookingId);

    if (updateError) {
      console.error('Failed to update booking:', updateError);
    }

    return new Response(
      JSON.stringify({
        checkoutId: checkoutData.id,
        redirectUrl: checkoutData.redirectUrl,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error in create-yoco-checkout:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});