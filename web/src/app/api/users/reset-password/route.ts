import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const { user_id, new_password = 'password123' } = await request.json();
    
    if (!user_id) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const salt = await bcrypt.genSalt(10);
    const password_hash = await bcrypt.hash(new_password, salt);

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password_hash })
      .eq('id', user_id);

    if (error) throw error;
    
    return NextResponse.json({ success: true, message: 'Password reset successfully' });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
