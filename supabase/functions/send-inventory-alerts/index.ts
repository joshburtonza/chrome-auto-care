import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify caller is authenticated and is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getUser(token);
    if (claimsError || !claimsData?.user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const callerId = claimsData.user.id;

    // Use service role client for admin check and data operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Verify caller is admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleData) {
      return new Response(
        JSON.stringify({ error: "Admin access required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get all active inventory items
    const { data: allItems, error: stockError } = await supabase
      .from("inventory")
      .select("id, name, quantity, min_stock_level, category")
      .eq("is_active", true);

    if (stockError) {
      console.error("Error fetching inventory:", stockError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch inventory" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter items actually below min stock
    const alertItems = (allItems || []).filter(
      item => item.quantity < item.min_stock_level
    );

    if (alertItems.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No low stock items", alerts_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get managers and directors with phone numbers
    const { data: managers, error: managerError } = await supabase
      .from("staff_profiles")
      .select("user_id, staff_role")
      .in("staff_role", ["manager", "director"]);

    if (managerError) {
      console.error("Error fetching managers:", managerError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch managers" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!managers || managers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No managers to notify", alerts_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get phone numbers from profiles
    const userIds = managers.map(m => m.user_id);
    const { data: profiles, error: profileError } = await supabase
      .from("profiles")
      .select("id, phone, full_name")
      .in("id", userIds)
      .not("phone", "is", null);

    if (profileError) {
      console.error("Error fetching profiles:", profileError);
    }

    const managersWithPhones = (profiles || []).filter(p => p.phone);

    if (managersWithPhones.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: "No managers with phone numbers", alerts_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build alert message
    const itemsList = alertItems
      .map(item => `• ${item.name}: ${item.quantity}/${item.min_stock_level} units`)
      .join("\n");

    const message = `🚨 *Low Stock Alert*\n\nThe following items are below minimum stock levels:\n\n${itemsList}\n\nPlease restock soon.`;

    console.log(`Sending alerts to ${managersWithPhones.length} managers for ${alertItems.length} low stock items`);

    // Send WhatsApp messages to all managers
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const whatsappFrom = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
    
    const sendPromises = managersWithPhones.map(async (manager) => {
      const formattedPhone = manager.phone.startsWith("+") ? manager.phone : `+${manager.phone}`;
      const whatsappTo = `whatsapp:${formattedPhone}`;

      const formData = new URLSearchParams();
      formData.append("To", whatsappTo);
      formData.append("From", whatsappFrom);
      formData.append("Body", message);

      try {
        const twilioResponse = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Authorization": `Basic ${btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)}`,
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: formData.toString(),
        });

        const result = await twilioResponse.json();

        if (!twilioResponse.ok) {
          console.error(`Failed to send to manager:`, result);
          return { success: false, error: result.message };
        }

        return { success: true, sid: result.sid };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error sending alert:`, err);
        return { success: false, error: errorMessage };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;

    return new Response(
      JSON.stringify({
        success: true,
        alerts_sent: successCount,
        total_managers: results.length,
        low_stock_items: alertItems.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in send-inventory-alerts:", error);
    return new Response(
      JSON.stringify({ error: "An unexpected error occurred" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
