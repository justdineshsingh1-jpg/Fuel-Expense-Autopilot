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
    const endDate = `${month}-31`; 

    // Fetch user details for the header
    let employeeName = 'Employee';
    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name')
      .eq('id', userId)
      .single();
    if (userData) employeeName = userData.full_name;

    // Fetch trips
    const { data: logs, error } = await supabaseAdmin
      .from('trip_logs')
      .select('*')
      .eq('user_id', userId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });

    if (error) throw error;

    let totalKm = 0;
    let totalLiters = 0;
    let grandTotalAmount = 0;

    let rowsHtml = '';
    
    // Default values matching standard format
    const defaultMode = 'Scooty';
    const defaultPurpose = 'GUCL Site Survey';

    
    if (logs) {
      logs.forEach(log => {
        const claimedKm = (log.end_reading || 0) - (log.start_reading || log.end_reading || 0);
        totalKm += claimedKm > 0 ? claimedKm : 0;
        
        const fuelCost = Number(log.fuel_amount || 0);
        const miscCost = Number(log.misc_amount || 0);
        const fuelLiters = Number(log.fuel_liters || 0);
        
        totalLiters += fuelLiters;
        grandTotalAmount += fuelCost + miscCost;

        const dateParts = log.log_date ? log.log_date.split('-') : [];
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0].substring(2)}` : log.log_date;

        const startR = log.start_reading || '';
        const endR = log.end_reading || '';
        const distStr = claimedKm > 0 ? claimedKm + ' KM' : '';
        
        // For locations, since the app uses automated GPS polygons, we reference the digital track
        // or print the agent's remarks if they typed any.
        const locationText = log.remarks ? log.remarks : 'Digital Route Tracked & Verified (OSRM)';
        
        let fuelRemarks = fuelCost > 0 ? `${fuelCost}.` : '';
        if (miscCost > 0) {
            fuelRemarks += ` (Misc: ${miscCost})`;
        }

        rowsHtml += `
          <tr>
            <td class="text-center">${formattedDate}</td>
            <td class="text-center">${startR}</td>
            <td class="text-center">${endR}</td>
            <td class="text-center">${distStr}</td>
            <td>${locationText}</td>
            <td class="text-center">${fuelRemarks}</td>
          </tr>
        `;
      });
    }


    // Add Fixed Monthly Mobile Recharge Allowance
    const FIXED_MOBILE_RECHARGE = 300;
    grandTotalAmount += FIXED_MOBILE_RECHARGE;
    
    rowsHtml += `
      <tr>
        <td class="text-center">End of Month</td>
        <td class="text-center">-</td>
        <td class="text-center">-</td>
        <td class="text-center">-</td>
        <td>Fixed Monthly Mobile Recharge Allowance</td>
        <td class="text-center">${FIXED_MOBILE_RECHARGE}/-</td>
      </tr>
    `;

    // Add empty rows to match paper layout height
    const minRows = 25;
    const currentRows = (rowsHtml.match(/<tr/g) || []).length;
    for(let i = currentRows; i < minRows; i++) {
        rowsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    const monthName = new Date(startDate).toLocaleString('default', { month: 'short' }).toUpperCase();
    const year = new Date(startDate).getFullYear();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Logbook_Report_${employeeName}_${monthName}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; font-size: 12px; margin: 0; padding: 0; }
          .container { width: 100%; max-width: 800px; margin: 0 auto; box-sizing: border-box; }
          
          .header-box { margin-bottom: 10px; font-weight: bold; font-size: 14px; text-decoration: underline;}
          
          table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
          th, td { border: 1px solid #000; padding: 6px 4px; }
          th { font-weight: bold; text-align: center; font-size: 11px; background-color: #f9f9f9; }
          .text-center { text-align: center; }
          
          .totals-row td { font-weight: bold; font-size: 14px; padding: 10px 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-box">
            Employee Name: ${employeeName}
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 10%">Date</th>
                <th style="width: 13%">Start Reading</th>
                <th style="width: 13%">End Reading</th>
                <th style="width: 13%">Distance in KM</th>
                <th style="width: 38%">Location</th>
                <th style="width: 13%">Fuel/Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
              <tr class="totals-row">
                <td colspan="3" class="text-center">Total -</td>
                <td class="text-center">${totalKm} KM</td>
                <td class="text-center">Total -</td>
                <td class="text-center">${grandTotalAmount}/-</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;
return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html',
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
