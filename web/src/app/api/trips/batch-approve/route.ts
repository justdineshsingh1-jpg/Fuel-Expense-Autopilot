import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const { trip_ids, action } = await request.json();
    
    if (!trip_ids || !Array.isArray(trip_ids) || trip_ids.length === 0) {
      return NextResponse.json({ error: 'Missing trip_ids' }, { status: 400 });
    }

    // action should be 'approved' or 'rejected'
    const status = action === 'Reject' ? 'rejected' : 'approved';

    const { error } = await supabaseAdmin
      .from('trip_logs')
      .update({ approval_status: status })
      .in('id', trip_ids);

    if (error) throw error;
    
    return NextResponse.json({ success: true, message: `Successfully ${status} ${trip_ids.length} claims` });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
