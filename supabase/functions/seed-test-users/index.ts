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
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    // --- Auth: require valid JWT from a PLATFORM_OWNER ---
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders,
      })
    }

    const token = authHeader.replace('Bearer ', '')
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token)
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: corsHeaders,
      })
    }

    const callerId = claimsData.claims.sub as string

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Verify caller is PLATFORM_OWNER
    const { data: roleData } = await adminClient.rpc('get_platform_role', { _user_id: callerId })
    if (roleData !== 'PLATFORM_OWNER') {
      return new Response(JSON.stringify({ error: 'Forbidden — PLATFORM_OWNER required' }), {
        status: 403, headers: corsHeaders,
      })
    }

    const users = [
      {
        email: 'gc1@test.com',
        password: 'Test1234!',
        first_name: 'Greg',
        last_name: 'Clark',
        org_id: '96a802b8-72a4-42e5-aa00-b7c675a9bb62',
        role: 'GC_PM',
      },
      {
        email: 'tc1@test.com',
        password: 'Test1234!',
        first_name: 'Tom',
        last_name: 'Carter',
        org_id: 'ab07e031-1ea7-4ee9-be15-8c1d7a19dcd6',
        role: 'TC_PM',
      },
      {
        email: 'fc1@test.com',
        password: 'Test1234!',
        first_name: 'Frank',
        last_name: 'Coleman',
        org_id: '6e563ffc-32f1-4f52-a8f9-95e274cad56f',
        role: 'FC_PM',
      },
    ]

    const results = []

    for (const u of users) {
      // Check if user already exists
      const { data: existingUsers } = await adminClient.auth.admin.listUsers()
      const existing = existingUsers?.users?.find((eu: any) => eu.email === u.email)
      
      let userId: string

      if (existing) {
        userId = existing.id
        results.push({ email: u.email, status: 'already_exists', userId })
      } else {
        // Create auth user
        const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
          email: u.email,
          password: u.password,
          email_confirm: true,
        })

        if (authError) {
          results.push({ email: u.email, status: 'auth_error', error: authError.message })
          continue
        }

        userId = authData.user.id
        results.push({ email: u.email, status: 'created', userId })
      }

      // Upsert profile
      const { error: profileError } = await adminClient
        .from('profiles')
        .upsert({
          user_id: userId,
          email: u.email,
          first_name: u.first_name,
          last_name: u.last_name,
          full_name: `${u.first_name} ${u.last_name}`,
        }, { onConflict: 'user_id' })

      if (profileError) {
        results.push({ email: u.email, step: 'profile', error: profileError.message })
      }

      // Check if org role already exists
      const { data: existingRole } = await adminClient
        .from('user_org_roles')
        .select('id')
        .eq('user_id', userId)
        .eq('organization_id', u.org_id)
        .maybeSingle()

      if (!existingRole) {
        const { error: roleError } = await adminClient
          .from('user_org_roles')
          .insert({
            user_id: userId,
            organization_id: u.org_id,
            role: u.role,
            is_admin: false,
          })

        if (roleError) {
          results.push({ email: u.email, step: 'org_role', error: roleError.message })
        }
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    const err = error as Error;
    return new Response(JSON.stringify({ error: err?.message ?? String(error) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
