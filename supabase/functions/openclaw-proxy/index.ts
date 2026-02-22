import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate via API key
    const apiKey = req.headers.get('x-api-key');
    const expectedKey = Deno.env.get('OPENCLAW_API_KEY');

    if (!apiKey || apiKey !== expectedKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for full DB access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { action, table, data, filters, select, limit, order } = await req.json();

    if (!action || !table) {
      return new Response(
        JSON.stringify({ error: 'action and table are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Whitelist of allowed tables
    const allowedTables = [
      'services', 'bookings', 'booking_services', 'booking_stages',
      'vehicles', 'profiles', 'staff_profiles', 'user_roles',
      'leads', 'lead_activities', 'inventory', 'inventory_transactions',
      'merchandise', 'orders', 'order_items', 'gallery_items',
      'reviews', 'notifications', 'promo_codes', 'departments',
      'service_availability', 'process_templates', 'process_template_stages',
      'loyalty_points', 'loyalty_transactions', 'referrals',
      'booking_audit_log', 'booking_stage_images', 'addon_requests',
      'cart_items', 'whatsapp_alert_queue', 'notification_preferences',
      'staff_invitations', 'promo_code_redemptions', 'push_subscriptions',
    ];

    if (!allowedTables.includes(table)) {
      return new Response(
        JSON.stringify({ error: `Table '${table}' is not allowed` }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let result;

    switch (action) {
      case 'select': {
        let query = supabase.from(table).select(select || '*');
        if (filters) {
          for (const [key, value] of Object.entries(filters)) {
            query = query.eq(key, value);
          }
        }
        if (order) {
          query = query.order(order.column, { ascending: order.ascending ?? true });
        }
        if (limit) {
          query = query.limit(limit);
        }
        result = await query;
        break;
      }

      case 'insert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'data is required for insert' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await supabase.from(table).insert(data).select();
        break;
      }

      case 'update': {
        if (!data || !filters) {
          return new Response(
            JSON.stringify({ error: 'data and filters are required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        let updateQuery = supabase.from(table).update(data);
        for (const [key, value] of Object.entries(filters)) {
          updateQuery = updateQuery.eq(key, value);
        }
        result = await updateQuery.select();
        break;
      }

      case 'upsert': {
        if (!data) {
          return new Response(
            JSON.stringify({ error: 'data is required for upsert' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await supabase.from(table).upsert(data).select();
        break;
      }

      case 'delete': {
        if (!filters) {
          return new Response(
            JSON.stringify({ error: 'filters are required for delete (no mass deletes)' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        let deleteQuery = supabase.from(table).delete();
        for (const [key, value] of Object.entries(filters)) {
          deleteQuery = deleteQuery.eq(key, value);
        }
        result = await deleteQuery.select();
        break;
      }

      case 'rpc': {
        // Call a database function
        const { function_name, params } = data || {};
        if (!function_name) {
          return new Response(
            JSON.stringify({ error: 'data.function_name is required for rpc' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        const allowedRpcs = [
          'advance_booking_stage', 'generate_referral_code',
          'has_role', 'validate_staff_invitation',
        ];
        if (!allowedRpcs.includes(function_name)) {
          return new Response(
            JSON.stringify({ error: `RPC '${function_name}' is not allowed` }),
            { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        result = await supabase.rpc(function_name, params || {});
        break;
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}. Use select, insert, update, upsert, delete, or rpc` }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }

    if (result.error) {
      return new Response(
        JSON.stringify({ error: result.error.message, details: result.error }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ data: result.data, count: result.count }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('OpenClaw proxy error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', message: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
