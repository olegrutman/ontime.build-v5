import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const email = 'olegrutman+owner@gmail.com'
    const password = 'Password1'

    // Check if user exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers()
    const existing = existingUsers?.users?.find((u: any) => u.email === email)

    let userId: string

    if (existing) {
      userId = existing.id
    } else {
      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authError) throw authError
      userId = authData.user.id
    }

    // Upsert profile
    await adminClient.from('profiles').upsert({
      user_id: userId,
      email,
      first_name: 'Oleg',
      last_name: 'Rutman',
      full_name: 'Oleg Rutman',
    }, { onConflict: 'user_id' })

    // Upsert platform_users
    const { data: existingPlatform } = await adminClient
      .from('platform_users')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle()

    if (existingPlatform) {
      await adminClient.from('platform_users').update({
        platform_role: 'PLATFORM_OWNER',
        two_factor_verified: true,
      }).eq('user_id', userId)
    } else {
      await adminClient.from('platform_users').insert({
        user_id: userId,
        platform_role: 'PLATFORM_OWNER',
        two_factor_verified: true,
      })
    }

    return new Response(JSON.stringify({ success: true, userId, email }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
