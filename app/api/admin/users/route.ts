import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const {
      email,
      password,
      firstName,
      lastName,
      dob,
      phone,
      personalEmail,
    } = body

    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const admin = getAdminClient()

    // Create auth user (confirmed)
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    if (authError || !authData?.user) {
      return NextResponse.json({ error: authError?.message || 'Auth error' }, { status: 400 })
    }

    const userId = authData.user.id

    // Insert profile row
    const displayName = `${firstName} ${lastName}`.trim()
    const { error: insertError } = await admin
      .from('users')
      .insert({
        id: userId,
        email,
        role: 'student',
        name: displayName,
        first_name: firstName,
        last_name: lastName,
        display_name: displayName,
        dob: dob || null,
        phone: phone || null,
        personal_email: personalEmail || null,
      })

    if (insertError) {
      // Best-effort cleanup
      await admin.auth.admin.deleteUser(userId).catch(() => {})
      return NextResponse.json({ error: insertError.message }, { status: 400 })
    }

    return NextResponse.json({ id: userId }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


