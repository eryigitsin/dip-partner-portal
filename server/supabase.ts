import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.VITE_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

if (!supabaseUrl || !supabaseServiceKey) {
  console.warn('Missing Supabase environment variables for server')
}

// Server-side Supabase client with service role key for admin operations
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Helper function to verify and get user from Supabase token
export const verifySupabaseUser = async (accessToken: string) => {
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(accessToken)
    if (error) throw error
    return user
  } catch (error) {
    console.error('Error verifying Supabase user:', error)
    return null
  }
}