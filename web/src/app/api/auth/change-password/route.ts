import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, current_password, new_password } = body;

    if (!user_id || !current_password || !new_password) {
      return NextResponse.json({ detail: "Missing required fields." }, { status: 400 });
    }

    if (typeof new_password !== 'string' || new_password.trim().length < 6) {
      return NextResponse.json({ detail: "New password must be at least 6 characters long." }, { status: 400 });
    }

    // 1. Fetch user by id
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('id, password_hash, full_name, employee_code')
      .eq('id', user_id)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ detail: "User not found." }, { status: 404 });
    }

    const user = users[0];

    // 2. Verify current password
    const isCurrentValid = await bcrypt.compare(current_password, user.password_hash);
    if (!isCurrentValid) {
      return NextResponse.json({ detail: "Current password is incorrect." }, { status: 401 });
    }

    // 3. Hash new password
    const salt = await bcrypt.genSalt(10);
    const newHash = await bcrypt.hash(new_password.trim(), salt);

    // 4. Update in database
    const { error: updateErr } = await supabaseAdmin
      .from('users')
      .update({
        password_hash: newHash,
        updated_at: new Date().toISOString()
      })
      .eq('id', user_id);

    if (updateErr) {
      throw updateErr;
    }

    return NextResponse.json({
      success: true,
      message: "Password changed successfully."
    });

  } catch (err: any) {
    console.error("Change password error:", err);
    return NextResponse.json({ detail: err.message || "Failed to update password." }, { status: 500 });
  }
}
