import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import bcrypt from 'bcryptjs';

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get('content-type') || '';
    let email = '';
    let password = '';

    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      email = formData.get('username') as string;
      password = formData.get('password') as string;
    } else {
      const body = await request.json();
      email = body.username || body.email;
      password = body.password;
    }

    if (!email || !password) {
      return NextResponse.json({ detail: "Missing credentials" }, { status: 400 });
    }

    // Query Supabase
    const { data: users, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .limit(1);

    if (error || !users || users.length === 0) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }

    const user = users[0];
    const isValid = await bcrypt.compare(password, user.password_hash);

    if (!isValid) {
      return NextResponse.json({ detail: "Invalid credentials" }, { status: 401 });
    }

    return NextResponse.json({
      access_token: "fake-jwt-token-for-client",
      token_type: "bearer",
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        employee_code: user.employee_code,
        role: user.role,
        department: user.department
      }
    });

  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 500 });
  }
}
