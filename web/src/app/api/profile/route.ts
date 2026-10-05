import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { user_id, vehicle_details } = await request.json();
    
    if (!user_id || !vehicle_details) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .update({ vehicle_details })
      .eq('id', user_id)
      .select();

    if (error) throw error;
    return NextResponse.json({ success: true, user: data[0] });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
