import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.84.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface YocoWebhookPayload {
  type: string;
  payload: {
    id: string;
    status: string;
    metadata?: {
      bookingId?: string;
      orderId?: string;
      orderType?: string;
    };
    amount?: number;
    currency?: string;
    createdDate?: string;
  };
}

// Validate webhook payload structure
function validateWebhookPayload(data: unknown): data is YocoWebhookPayload {
  if (!data || typeof data !== 'object') return false;
  const d = data as Record<string, unknown>;
  if (typeof d.type !== 'string' || !d.type) return false;
  if (!d.payload || typeof d.payload !== 'object') return false;
  const p = d.payload as Record<string, unknown>;
  if (typeof p.id !== 'string' || !p.id) return false;
  if (typeof p.status !== 'string') return false;
  return true;
}

// Verify payment with Yoco API to prevent forged webhooks
async function verifyPaymentWithYoco(paymentId: string, secretKey: string): Promise<{ verified: boolean; status?: string; amount?: number }> {
  try {
    const response = await fetch(`https://payments.yoco.com/api/checkouts/${paymentId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secretKey}`,
      },
    });

    if (!response.ok) {
      console.error('Yoco verification failed:', response.status);
      return { verified: false };
    }

    const data = await response.json();
    return {
      verified: true,
      status: data.status,
      amount: data.amount,
    };
  } catch (error) {
    console.error('Error verifying payment with Yoco:', error);
    return { verified: false };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse and validate webhook payload
    const rawData = await req.json();
    if (!validateWebhookPayload(rawData)) {
      console.error('Invalid webhook payload structure');
      return new Response(
        JSON.stringify({ error: 'Invalid payload' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookData = rawData as YocoWebhookPayload;
    console.log('Received Yoco webhook:', webhookData.type, webhookData.payload.id);

    // Handle payment success events
    if (webhookData.type === 'payment.succeeded' || webhookData.type === 'checkout.succeeded') {
      const { payload } = webhookData;

      // Verify payment with Yoco API to prevent forged webhooks
      const yocoSecretKey = Deno.env.get('YOCO_SECRET_KEY');
      const yocoTestSecretKey = Deno.env.get('YOCO_TEST_SECRET_KEY');

      let verification = { verified: false, status: undefined as string | undefined, amount: undefined as number | undefined };
      
      // Try live key first, then test key
      if (yocoSecretKey) {
        verification = await verifyPaymentWithYoco(payload.id, yocoSecretKey);
      }
      if (!verification.verified && yocoTestSecretKey) {
        verification = await verifyPaymentWithYoco(payload.id, yocoTestSecretKey);
      }

      if (!verification.verified) {
        console.error('Payment verification failed - possible forged webhook for:', payload.id);
        return new Response(
          JSON.stringify({ error: 'Payment verification failed' }),
          { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Verify the payment status is actually successful
      if (verification.status !== 'completed' && verification.status !== 'succeeded') {
        console.error('Payment not actually completed. Status:', verification.status);
        return new Response(
          JSON.stringify({ error: 'Payment not completed' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Payment verified with Yoco API. Status:', verification.status);

      const bookingId = payload.metadata?.bookingId;
      const orderId = payload.metadata?.orderId;
      const orderType = payload.metadata?.orderType;

      // Handle merchandise orders
      if (orderType === 'merchandise' && orderId) {
        console.log('Processing verified payment for order:', orderId);

        const { data: order, error: updateError } = await supabase
          .from('orders')
          .update({
            payment_status: 'paid',
            yoco_payment_id: payload.id,
            payment_date: payload.createdDate || new Date().toISOString(),
            status: 'confirmed',
          })
          .eq('id', orderId)
          .select('*')
          .single();

        if (updateError) {
          console.error('Failed to update order:', updateError);
          return new Response(
            JSON.stringify({ error: 'Failed to update order' }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        await supabase.from('notifications').insert({
          recipient_uid: order.user_id,
          type: 'order_confirmed',
          title: 'Order Confirmed',
          message: `Your order has been confirmed! Payment received: R${(payload.amount! / 100).toFixed(2)}`,
          priority: 'high',
        });

        return new Response(
          JSON.stringify({ success: true, orderId }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Handle service bookings
      if (!bookingId) {
        console.error('No bookingId or orderId in webhook metadata');
        return new Response(
          JSON.stringify({ error: 'Missing booking or order ID in metadata' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Processing verified payment for booking:', bookingId);

      const { data: booking, error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          yoco_payment_id: payload.id,
          payment_date: payload.createdDate || new Date().toISOString(),
          status: 'confirmed',
        })
        .eq('id', bookingId)
        .select('*, vehicles(make, model)')
        .single();

      if (updateError) {
        console.error('Failed to update booking:', updateError);
        return new Response(
          JSON.stringify({ error: 'Failed to update booking' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const vehicleInfo = `${booking.vehicles?.make || ''} ${booking.vehicles?.model || ''}`.trim();
      await supabase.from('notifications').insert({
        recipient_uid: booking.user_id,
        booking_id: bookingId,
        vehicle_id: booking.vehicle_id,
        type: 'payment_confirmed',
        title: 'Payment Confirmed',
        message: `Your payment has been confirmed for ${vehicleInfo}. Your booking is now confirmed!`,
        priority: 'high',
      });

      const { data: staffUsers } = await supabase
        .from('user_roles')
        .select('user_id')
        .in('role', ['staff', 'admin']);

      if (staffUsers) {
        const staffNotifications = staffUsers.map(staff => ({
          recipient_uid: staff.user_id,
          booking_id: bookingId,
          vehicle_id: booking.vehicle_id,
          type: 'payment_received',
          title: 'Payment Received',
          message: `Payment received for booking ${vehicleInfo}. Amount: R${payload.amount ? (payload.amount / 100).toFixed(2) : 'N/A'}`,
          priority: 'normal',
        }));

        await supabase.from('notifications').insert(staffNotifications);
      }

      return new Response(
        JSON.stringify({ success: true, bookingId }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Handle payment failures
    if (webhookData.type === 'payment.failed' || webhookData.type === 'checkout.failed') {
      const { payload } = webhookData;
      const bookingId = payload.metadata?.bookingId;

      if (bookingId) {
        console.log('Processing failed payment for booking:', bookingId);

        await supabase
          .from('bookings')
          .update({ payment_status: 'failed' })
          .eq('id', bookingId);

        const { data: booking } = await supabase
          .from('bookings')
          .select('user_id, vehicle_id')
          .eq('id', bookingId)
          .single();

        if (booking) {
          await supabase.from('notifications').insert({
            recipient_uid: booking.user_id,
            booking_id: bookingId,
            vehicle_id: booking.vehicle_id,
            type: 'payment_failed',
            title: 'Payment Failed',
            message: 'Your payment could not be processed. Please try again or contact support.',
            priority: 'high',
            action_required: true,
          });
        }
      }

      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Webhook type not handled:', webhookData.type);
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in yoco-webhook:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
