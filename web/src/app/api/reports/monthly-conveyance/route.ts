import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');
  const month = searchParams.get('month'); // Format: YYYY-MM
  
  if (!userId || !month) {
    return NextResponse.json({ error: 'Missing userId or month' }, { status: 400 });
  }

  try {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`; // Supabase handles date logic fine with simple strings

    const { data: logs, error } = await supabaseAdmin
      .from('trip_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });

    if (error) throw error;

    if (!logs || logs.length === 0) {
      return NextResponse.json({ error: 'No records found for this month.' }, { status: 404 });
    }

    // 1. Calculate the Rollup Metrics
    let totalKm = 0;
    let totalFuelCost = 0;
    let totalLiters = 0;
    let totalMiscCost = 0;

    const csvRows = [];
    // CSV Header matching their exact paper format
    csvRows.push(['Date', 'Particulars', 'Mode', 'Purpose', 'Remarks', 'Fuel Amount', 'Misc Amount', 'Claimed KM', 'Variance %', 'Status']);

    logs.forEach(log => {
      const claimedKm = (log.end_reading || 0) - (log.start_reading || log.end_reading || 0);
      totalKm += claimedKm > 0 ? claimedKm : 0;
      
      const fuelCost = Number(log.fuel_amount || 0);
      const fuelLiters = Number(log.fuel_liters || 0);
      const miscCost = Number(log.misc_amount || 0);
      
      totalFuelCost += fuelCost;
      totalLiters += fuelLiters;
      totalMiscCost += miscCost;

      // Ensure flags don't break CSV formatting
      const statusBadge = log.has_anomalies ? 'FLAGGED' : 'CLEAN';
      const variance = log.variance_percent ? `${log.variance_percent}%` : '0%';
      const purpose = 'Survey / Field Visit'; // Default based on their workflow
      
      let particulars = 'Fuel';
      if (miscCost > 0 && fuelCost === 0) particulars = log.misc_particulars || 'Other Allowance';
      if (miscCost > 0 && fuelCost > 0) particulars = `Fuel & ${log.misc_particulars || 'Misc'}`;

      csvRows.push([
        log.log_date,
        particulars,
        '2-Wheeler', // Standard mode
        purpose,
        log.remarks || '',
        fuelCost,
        miscCost,
        claimedKm > 0 ? claimedKm : 0,
        variance,
        statusBadge
      ]);
    });

    const derivedMileage = totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : 'N/A';
    const grandTotal = totalFuelCost + totalMiscCost;

    // 2. Append the Audit & Efficiency Footer
    csvRows.push([]);
    csvRows.push(['--- AUDIT & EFFICIENCY FOOTER ---']);
    csvRows.push(['Net Distance Traveled (Total KM)', totalKm]);
    csvRows.push(['Total Fuel Liters Consumed', totalLiters]);
    csvRows.push(['Derived Mileage (KM/Litre)', derivedMileage]);
    csvRows.push(['Total Fuel Payable', `Rs ${totalFuelCost}`]);
    csvRows.push(['Total Misc Payable', `Rs ${totalMiscCost}`]);
    csvRows.push(['GRAND TOTAL PAYABLE', `Rs ${grandTotal}`]);

    const csvContent = csvRows.map(e => e.join(',')).join('\n');

    // Return as CSV Download
    return new NextResponse(csvContent, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="Conveyance_Report_${userId}_${month}.csv"`
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
