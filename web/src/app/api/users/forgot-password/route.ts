import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { email: rawEmail } = await request.json();

    if (!rawEmail) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }
    
    const email = rawEmail.toLowerCase().trim();

    // 1. Verify user exists
    const { data: user, error: fetchError } = await supabaseAdmin
      .from('users')
      .select('id')
      .ilike('email', email)
      .single();

    if (fetchError || !user) {
      return NextResponse.json({ error: 'No user found with that email address' }, { status: 404 });
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
