import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const month = searchParams.get('month') || new Date().toISOString().substring(0, 7); // Format: YYYY-MM
  const fuelPriceParam = searchParams.get('fuelPrice') || '106';

  try {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`;

    // 1. Find all distinct users who have trips in this month
    const { data: userTrips, error: tripsErr } = await supabaseAdmin
      .from('trip_logs')
      .select('user_id')
      .gte('log_date', startDate)
      .lte('log_date', endDate);

    if (tripsErr) throw tripsErr;

    const uniqueUserIds = Array.from(new Set((userTrips || []).map(t => t.user_id).filter(Boolean)));

    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ error: `No employee trip records found for month ${month}` }, { status: 404 });
    }

    const zip = new JSZip();
    const folderName = `Conveyance_Reports_${month.replace('-', '_')}`;
    const reportFolder = zip.folder(folderName);

    // Protocol & Host to fetch HTML reports
    const urlObj = new URL(request.url);
    const origin = urlObj.origin;

    // Fetch and package each user's report
    for (const uId of uniqueUserIds) {
      try {
        const reportUrl = `${origin}/api/reports/monthly-conveyance?userId=${uId}&month=${month}&fuelPrice=${fuelPriceParam}`;
        const res = await fetch(reportUrl);
        if (res.ok) {
          const html = await res.text();
          
          // Get user metadata for filename
          const { data: userObj } = await supabaseAdmin
            .from('users')
            .select('employee_code, full_name')
            .eq('id', uId)
            .single();

          const code = userObj?.employee_code || uId.substring(0, 6).toUpperCase();
          const name = (userObj?.full_name || 'Agent').replace(/[^a-zA-Z0-9_-]/g, '_');
          const fileName = `${code}_${name}_${month}.html`;

          reportFolder?.file(fileName, html);
        }
      } catch (userErr) {
        console.error(`Error generating report for user ${uId}:`, userErr);
      }
    }

    const zipArrayBuffer = await zip.generateAsync({ type: 'arraybuffer', compression: 'DEFLATE' });

    return new Response(zipArrayBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="Conveyance_Reports_${month}.zip"`,
      }
    });

  } catch (err: any) {
    console.error("Monthwise ZIP error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
