import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Only these users can create walk-in customers
const ALLOWED_EMAILS = [
  'farhaan.surtie@gmail.com',
];

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify the requesting user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user: requestingUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is admin OR in the allowed emails list
    const { data: roleData } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', requestingUser.id)
      .in('role', ['admin', 'staff']);

    const isAdmin = roleData?.some(r => r.role === 'admin');
    const isAllowedEmail = ALLOWED_EMAILS.includes(requestingUser.email?.toLowerCase() || '');

    if (!isAdmin && !isAllowedEmail) {
      return new Response(
        JSON.stringify({ error: 'Admin access or manager permission required' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { full_name, phone, email, address } = await req.json();

    if (!full_name) {
      return new Response(
        JSON.stringify({ error: 'Customer name is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate email if not provided (walkin+timestamp@racetechnik.local)
    const customerEmail = email?.trim() || `walkin.${Date.now()}@racetechnik.local`;

    // Check if email already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(
      u => u.email?.toLowerCase() === customerEmail.toLowerCase()
    );

    if (existingUser) {
      // Return existing user - they're already a customer
      // Update their profile with any new info
      const updates: Record<string, string> = {};
      if (phone) updates.phone = phone;
      if (address) updates.address = address;
      if (full_name) updates.full_name = full_name;

      if (Object.keys(updates).length > 0) {
        await supabaseAdmin
          .from('profiles')
          .update(updates)
          .eq('id', existingUser.id);
      }

      return new Response(
        JSON.stringify({
          success: true,
          customer_id: existingUser.id,
          existing: true,
          message: 'Existing customer found and updated'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create new auth user with random password (they can reset later if needed)
    const randomPassword = crypto.randomUUID() + '!Aa1';

    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: customerEmail,
      password: randomPassword,
      email_confirm: true, // Auto-confirm so no verification email
      user_metadata: {
        full_name: full_name,
      },
    });

    if (createError) {
      console.error('Error creating user:', createError);
      return new Response(
        JSON.stringify({ error: 'Failed to create customer: ' + createError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // The handle_new_user trigger creates the profile and client role automatically.
    // Now update the profile with phone and address.
    const profileUpdates: Record<string, string> = {};
    if (phone) profileUpdates.phone = phone;
    if (address) profileUpdates.address = address;
    if (full_name) profileUpdates.full_name = full_name;

    if (Object.keys(profileUpdates).length > 0) {
      // Small delay to let trigger complete
      await new Promise(resolve => setTimeout(resolve, 500));

      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update(profileUpdates)
        .eq('id', newUser.user.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Don't fail — user was created, profile just needs manual update
      }
    }

    console.log(`Walk-in customer created: ${full_name} (${customerEmail}) by ${requestingUser.email}`);

    return new Response(
      JSON.stringify({
        success: true,
        customer_id: newUser.user.id,
        existing: false,
        message: `Customer "${full_name}" created successfully`
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in create-walkin-customer:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
