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
    };
    amount?: number;
    currency?: string;
    createdDate?: string;
  };
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Parse webhook payload
    const webhookData: YocoWebhookPayload = await req.json();
    console.log('Received Yoco webhook:', webhookData.type, webhookData.payload.id);

    // Handle payment notification events
    if (webhookData.type === 'payment.succeeded' || webhookData.type === 'checkout.succeeded') {
      const { payload } = webhookData;
      const bookingId = payload.metadata?.bookingId;

      if (!bookingId) {
        console.error('No bookingId in webhook metadata');
        return new Response(
          JSON.stringify({ error: 'Missing booking ID in metadata' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      console.log('Processing successful payment for booking:', bookingId);

      // Update booking with payment success
      const { data: booking, error: updateError } = await supabase
        .from('bookings')
        .update({
          payment_status: 'paid',
          yoco_payment_id: payload.id,
          payment_date: payload.createdDate || new Date().toISOString(),
          status: 'confirmed', // Automatically confirm booking on payment
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

      console.log('Booking updated successfully:', bookingId);

      // Create notification for customer
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

      // Create notification for staff
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
          .update({
            payment_status: 'failed',
          })
          .eq('id', bookingId);

        // Notify customer
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

    // Acknowledge other webhook types
    console.log('Webhook type not handled:', webhookData.type);
    return new Response(
      JSON.stringify({ success: true, message: 'Webhook received' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in yoco-webhook:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});