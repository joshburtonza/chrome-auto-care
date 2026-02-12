import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const ALLOWED_EMAILS = ["farhaan.surtie@gmail.com"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;
    const callerEmail = claimsData.claims.email;

    // Check admin role or allowed email
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    const isAllowed =
      !!roleData || ALLOWED_EMAILS.includes(callerEmail as string);

    if (!isAllowed) {
      return new Response(
        JSON.stringify({ error: "Permission denied" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { full_name, phone, email, address } = await req.json();

    if (!full_name || typeof full_name !== "string" || full_name.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Full name is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Generate placeholder email if none provided
    const customerEmail =
      email && email.trim().length > 0
        ? email.trim().toLowerCase()
        : `walkin.${Date.now()}@racetechnik.local`;

    // Check if user with this email already exists
    const { data: existingUsers } =
      await adminClient.auth.admin.listUsers();

    const existingUser = existingUsers?.users?.find(
      (u) => u.email === customerEmail
    );

    if (existingUser) {
      // Update existing profile
      await adminClient
        .from("profiles")
        .update({
          full_name: full_name.trim(),
          phone: phone?.trim() || null,
          address: address?.trim() || null,
        })
        .eq("id", existingUser.id);

      return new Response(
        JSON.stringify({
          user_id: existingUser.id,
          existing: true,
          message: "Existing customer updated",
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create new auth user
    const randomPassword =
      crypto.randomUUID() + crypto.randomUUID().slice(0, 8);
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: customerEmail,
        password: randomPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name.trim() },
      });

    if (createError) {
      throw createError;
    }

    // Update profile with phone and address (trigger creates the profile)
    if (phone || address) {
      // Small delay to let trigger fire
      await new Promise((r) => setTimeout(r, 500));
      await adminClient
        .from("profiles")
        .update({
          phone: phone?.trim() || null,
          address: address?.trim() || null,
        })
        .eq("id", newUser.user.id);
    }

    return new Response(
      JSON.stringify({
        user_id: newUser.user.id,
        existing: false,
        message: "Walk-in customer created",
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
