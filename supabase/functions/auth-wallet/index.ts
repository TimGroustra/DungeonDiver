import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { config } from "https://deno.land/x/dotenv@v3.2.2/mod.ts";

// Load environment variables from .env file (for local development)
// In Supabase Edge Functions, secrets are automatically available as Deno.env.get()
if (Deno.env.get("SUPABASE_URL") === undefined) {
  config({ export: true });
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS OPTIONS request
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { wallet_address } = await req.json();

    if (!wallet_address) {
      return new Response(JSON.stringify({ error: 'Wallet address is required' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Create a Supabase client with the service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    let userId: string;

    // 1. Check if a profile with this wallet_address already exists
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('wallet_address', wallet_address)
      .single();

    if (profileError && profileError.code !== 'PGRST116') { // PGRST116 means "no rows found"
      console.error("Error fetching profile:", profileError);
      throw new Error(`Failed to fetch profile: ${profileError.message}`);
    }

    if (profileData) {
      // Profile found, use existing user ID
      userId = profileData.id;
    } else {
      // No profile found, create a new user in auth.users
      const { data: userData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email: `${wallet_address}@wallet.supabase.com`, // Use wallet address as a unique "email"
        email_confirm: true, // Confirm email to make user active immediately
        user_metadata: { wallet_address: wallet_address },
      });

      if (createUserError) {
        console.error("Error creating user:", createUserError);
        throw new Error(`Failed to create user: ${createUserError.message}`);
      }

      userId = userData.user!.id;

      // Create a corresponding entry in the public.profiles table
      const { error: insertProfileError } = await supabaseAdmin
        .from('profiles')
        .insert({ id: userId, wallet_address: wallet_address });

      if (insertProfileError) {
        console.error("Error inserting profile:", insertProfileError);
        throw new Error(`Failed to insert profile: ${insertProfileError.message}`);
      }
    }

    // 2. Generate a JWT for the user
    const { data: tokenData, error: tokenError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink', // Using magiclink type to get a token
      email: `${wallet_address}@wallet.supabase.com`, // Must match the email used for user creation
    });

    if (tokenError) {
      console.error("Error generating token:", tokenError);
      throw new Error(`Failed to generate token: ${tokenError.message}`);
    }

    // Extract the access_token from the magiclink URL
    const url = new URL(tokenData.properties.action_link);
    const accessToken = url.searchParams.get('access_token');

    if (!accessToken) {
      throw new Error('Access token not found in generated link.');
    }

    return new Response(JSON.stringify({ access_token: accessToken }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("Edge Function error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});