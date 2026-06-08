// @ts-nocheck
import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Missing Supabase environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');

    // Use anon key client to validate user JWT
    const supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${token}` }
      }
    });

    const { data: { user: requestingUser }, error: authError } = await supabaseClient.auth.getUser();

    if (authError || !requestingUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - Invalid token', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role client for admin operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('roles(permissions)')
      .eq('user_id', requestingUser.id)
      .eq('is_active', true)
      .maybeSingle();

    const permissions = userRoles?.roles?.permissions as Record<string, boolean> | null;

    if (!permissions || !permissions['users.create']) {
      return new Response(
        JSON.stringify({ error: 'You do not have permission to create users' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, password, full_name, phone } = await req.json();

    if (!email || !password || !full_name) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name,
        phone: phone || null,
      },
    });

    if (createError) {
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (authData.user) {
      const authUserId = authData.user.id;

      const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      let profile: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        const { data, error } = await supabaseAdmin
          .from('profiles')
          .select('id, email, full_name, phone, role')
          .eq('id', authUserId)
          .maybeSingle();

        if (!error && data) {
          profile = data;
          break;
        }
        await wait(200);
      }

      if (profile) {
        const updatePayload: Record<string, any> = {};

        if ((!profile.email || String(profile.email).trim() === '') && email) {
          updatePayload.email = email;
        }
        if ((!profile.full_name || String(profile.full_name).trim() === '') && full_name) {
          updatePayload.full_name = full_name;
        }
        if ((!profile.phone || String(profile.phone).trim() === '') && phone) {
          updatePayload.phone = phone;
        }
        if (!profile.role || String(profile.role).trim() === '') {
          updatePayload.role = 'customer';
        }

        if (Object.keys(updatePayload).length > 0) {
          const { error: updateError } = await supabaseAdmin
            .from('profiles')
            .update(updatePayload)
            .eq('id', authUserId);

          if (updateError) {
            console.error('Failed to update profile after auth user creation:', updateError);
          }
        }
      } else {
        console.log('Profile row not found after auth user creation (expected if trigger is delayed):', { auth_user_id: authUserId });
      }

      try {
        const emailResponse = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${supabaseServiceRoleKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            to: email,
            template_key: 'account_created',
            variables: {
              user_name: full_name,
              user_email: email,
              temp_password: password,
              login_url: `${Deno.env.get('SITE_URL') ?? 'https://thelockout.ae'}/login`,
              site_name: 'LockOut Escape Room',
            },
          }),
        });

        if (!emailResponse.ok) {
          console.error('Failed to send welcome email, but user was created');
        }
      } catch (emailError) {
        console.error('Error sending welcome email:', emailError);
      }
    }

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in create-user function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
