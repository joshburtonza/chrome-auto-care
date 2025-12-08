import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
    const TWILIO_AUTH_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
    const TWILIO_WHATSAPP_NUMBER = Deno.env.get("TWILIO_WHATSAPP_NUMBER");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_WHATSAPP_NUMBER) {
      console.error("Missing Twilio credentials");
      return new Response(
        JSON.stringify({ error: "WhatsApp not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("Missing Supabase credentials");
      return new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
      console.log("No low stock items found");
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
      console.log("No managers found to notify");
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
      console.log("No managers with phone numbers found");
      return new Response(
        JSON.stringify({ success: true, message: "No managers with phone numbers", alerts_sent: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build alert message
    const itemsList = alertItems
      .map(item => `• ${item.name}: ${item.quantity}/${item.min_stock_level} units`)
      .join("\n");

    const message = `🚨 *Race Technik Low Stock Alert*\n\nThe following items are below minimum stock levels:\n\n${itemsList}\n\nPlease restock soon.`;

    console.log(`Sending alerts to ${managersWithPhones.length} managers for ${alertItems.length} low stock items`);

    // Send WhatsApp messages to all managers
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
    const whatsappFrom = `whatsapp:${TWILIO_WHATSAPP_NUMBER}`;
    
    const sendPromises = managersWithPhones.map(async (manager) => {
      const formattedPhone = manager.phone.startsWith("+") ? manager.phone : `+${manager.phone}`;
      const whatsappTo = `whatsapp:${formattedPhone}`;

      console.log(`Sending WhatsApp to ${manager.full_name} at ${whatsappTo}`);

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
          console.error(`Failed to send to ${manager.full_name}:`, result);
          return { success: false, phone: manager.phone, error: result.message };
        }

        console.log(`Successfully sent to ${manager.full_name}:`, result.sid);
        return { success: true, phone: manager.phone, sid: result.sid };
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Unknown error";
        console.error(`Error sending to ${manager.full_name}:`, err);
        return { success: false, phone: manager.phone, error: errorMessage };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`Sent ${successCount}/${results.length} WhatsApp alerts`);

    return new Response(
      JSON.stringify({
        success: true,
        alerts_sent: successCount,
        total_managers: results.length,
        low_stock_items: alertItems.length,
        results
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-inventory-alerts:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
