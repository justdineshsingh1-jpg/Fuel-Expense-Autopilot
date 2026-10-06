import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // 1. Verify user exists
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email)
      .single();

    if (fetchError || !user) {
      // Return success even if not found to prevent email enumeration
      return NextResponse.json({ success: true });
    }

    // 2. Reset password to password123
    const salt = await bcrypt.genSalt(10);
    const new_password_hash = await bcrypt.hash('password123', salt);

    const { error: updateError } = await supabaseAdmin
      .from('users')
      .update({ password_hash: new_password_hash })
      .eq('id', user.id);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
