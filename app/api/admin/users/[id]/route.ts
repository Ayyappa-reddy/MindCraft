import { NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase/admin'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminClient()
    const { id } = await params
    const userId = id
    const body = await request.json()

    const {
      firstName,
      lastName,
      displayName,
      dob,
      phone,
      personalEmail,
      role,
      name,
    } = body

    const updates: any = {}
    if (typeof name === 'string') updates.name = name
    if (typeof firstName === 'string') updates.first_name = firstName
    if (typeof lastName === 'string') updates.last_name = lastName
    if (typeof displayName === 'string') updates.display_name = displayName
    if (typeof dob === 'string') updates.dob = dob
    if (typeof phone === 'string') updates.phone = phone
    if (typeof personalEmail === 'string') updates.personal_email = personalEmail
    if (role === 'admin' || role === 'student') updates.role = role

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ ok: true })
    }

    const { error } = await admin.from('users').update(updates).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const admin = getAdminClient()
    const { id } = await params
    const userId = id

    // Delete auth user (will cascade to users table via FK)
    const { error } = await admin.auth.admin.deleteUser(userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ ok: true })
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Unexpected error' }, { status: 500 })
  }
}


