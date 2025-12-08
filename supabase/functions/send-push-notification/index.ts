import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PushNotificationRequest {
  user_id: string;
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

// Web Push implementation for Deno
async function sendWebPush(
  subscription: { endpoint: string; p256dh_key: string; auth_key: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const encoder = new TextEncoder();
  
  // Create JWT for VAPID
  const header = { alg: "ES256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const claims = {
    aud: new URL(subscription.endpoint).origin,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: "mailto:notifications@racetechnik.com",
  };

  // Base64url encode
  const base64url = (data: Uint8Array | string): string => {
    const str = typeof data === "string" ? data : String.fromCharCode(...data);
    return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  };

  const headerB64 = base64url(JSON.stringify(header));
  const claimsB64 = base64url(JSON.stringify(claims));
  const unsignedToken = `${headerB64}.${claimsB64}`;

  // Import private key for signing
  const privateKeyData = Uint8Array.from(atob(vapidPrivateKey.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyData,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken)
  );

  const jwt = `${unsignedToken}.${base64url(new Uint8Array(signature))}`;

  // Send push notification
  const response = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
    },
    body: encoder.encode(payload),
  });

  return response;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "Push notifications not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { user_id, title, body, url, icon, badge, tag }: PushNotificationRequest = await req.json();

    if (!user_id || !title || !body) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_id, title, body" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check user's notification preferences
    const { data: prefs } = await supabase
      .from("notification_preferences")
      .select("push_enabled")
      .eq("user_id", user_id)
      .maybeSingle();

    if (prefs && !prefs.push_enabled) {
      console.log(`Push notifications disabled for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: "Push notifications disabled by user" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get user's push subscriptions
    const { data: subscriptions, error: subError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", user_id);

    if (subError) {
      console.error("Error fetching subscriptions:", subError);
      throw subError;
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log(`No push subscriptions found for user ${user_id}`);
      return new Response(
        JSON.stringify({ success: false, reason: "No push subscriptions found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title,
      body,
      icon: icon || "/pwa-192x192.png",
      badge: badge || "/pwa-192x192.png",
      tag: tag || "race-technik-notification",
      data: { url: url || "/" },
    });

    console.log(`Sending push notification to ${subscriptions.length} device(s) for user ${user_id}`);

    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          const response = await sendWebPush(
            {
              endpoint: sub.endpoint,
              p256dh_key: sub.p256dh_key,
              auth_key: sub.auth_key,
            },
            payload,
            vapidPublicKey,
            vapidPrivateKey
          );

          if (response.status === 410 || response.status === 404) {
            // Subscription expired, remove it
            console.log(`Removing expired subscription: ${sub.id}`);
            await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            return { success: false, reason: "Subscription expired" };
          }

          if (!response.ok) {
            const errorText = await response.text();
            console.error(`Push failed for ${sub.id}:`, response.status, errorText);
            return { success: false, reason: errorText };
          }

          return { success: true };
        } catch (error) {
          console.error(`Error sending to subscription ${sub.id}:`, error);
          return { success: false, reason: String(error) };
        }
      })
    );

    const successCount = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;

    console.log(`Push notification sent to ${successCount}/${subscriptions.length} devices`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in send-push-notification:", error);
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
