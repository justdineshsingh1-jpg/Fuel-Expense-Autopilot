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
    
    // Default values matching standard format from image
    const defaultMode = 'Cash/ Bike';
    const defaultPurpose = 'Official';

    if (logs) {
      logs.forEach(log => {
        const claimedKm = (log.end_reading || 0) - (log.start_reading || log.end_reading || 0);
        totalKm += claimedKm > 0 ? claimedKm : 0;
        
        const fuelCost = Number(log.fuel_amount || 0);
        const fuelLiters = Number(log.fuel_liters || 0);
        const miscCost = Number(log.misc_amount || 0);
        
        totalLiters += fuelLiters;

        // Date formatter (DD-MM-YYYY)
        const dateParts = log.log_date ? log.log_date.split('-') : [];
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : log.log_date;

        // 1. Render Fuel Row if exists
        if (fuelCost > 0) {
          grandTotalAmount += fuelCost;
          rowsHtml += `
            <tr>
              <td class="text-center">${formattedDate}</td>
              <td>Fuel</td>
              <td>${defaultMode}</td>
              <td>${defaultPurpose}</td>
              <td class="text-center">${fuelCost}</td>
              <td>Bill Attached</td>
            </tr>
          `;
        }

        // 2. Render Misc Row if exists
        if (miscCost > 0) {
          grandTotalAmount += miscCost;
          rowsHtml += `
            <tr>
              <td class="text-center">${formattedDate}</td>
              <td>${log.misc_particulars || 'Other Allowance'}</td>
              <td>${defaultMode}</td>
              <td>${defaultPurpose}</td>
              <td class="text-center">${miscCost}</td>
              <td>Bill Attached</td>
            </tr>
          `;
        }
      });
    }

    // Add Fixed Monthly Mobile Recharge Allowance
    const FIXED_MOBILE_RECHARGE = 300;
    grandTotalAmount += FIXED_MOBILE_RECHARGE;
    
    rowsHtml += `
      <tr>
        <td class="text-center"></td>
        <td>Mobile Recharge</td>
        <td></td>
        <td></td>
        <td class="text-center">${FIXED_MOBILE_RECHARGE}</td>
        <td></td>
      </tr>
    `;

    // Add empty rows to match paper layout height
    const minRows = 25;
    const currentRows = (rowsHtml.match(/<tr/g) || []).length;
    for(let i = currentRows; i < minRows; i++) {
        rowsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    const monthName = new Date(startDate).toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
    const derivedMileage = totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : 'N/A';

    // HTML Template matching physical format precisely
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Conveyance_Report_${employeeName}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 0; }
          .container { width: 100%; max-width: 800px; margin: 0 auto; box-sizing: border-box; }
          
          .header-box { text-align: center; border: 1px solid #000; border-bottom: none;}
          .company-name { font-size: 16px; font-weight: bold; border-bottom: 1px solid #000; padding: 4px; }
          .address { font-size: 11px; font-weight: bold; border-bottom: 1px solid #000; padding: 2px; }
          .sheet-title { font-size: 12px; font-weight: bold; padding: 3px; border-bottom: 1px solid #000;}
          
          .metadata { display: flex; justify-content: space-between; padding: 5px 10px; font-weight: bold; border: 1px solid #000; border-bottom: none; border-top: none;}
          
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 4px; }
          th { font-weight: bold; text-align: center; }
          .text-center { text-align: center; }
          
          .footer-notes { border-top: 1px solid #000; }
          .footer-grid { display: grid; grid-template-columns: 2fr 1fr 2fr; }
          .note-cell { padding: 5px; font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; border-left: 1px solid #000; }
          
          .totals-row { display: grid; grid-template-columns: 4.8fr 1.2fr 1fr; }
          .total-label { text-align: right; padding: 5px 10px; font-weight: bold; border-right: 1px solid #000; border-bottom: 1px solid #000; border-left: 1px solid #000; }
          .total-amount { text-align: center; font-weight: bold; padding: 5px; border-right: 1px solid #000; border-bottom: 1px solid #000;}
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header-box">
            <div class="company-name">INDUSTRIAL SYSTEMS LLP</div>
            <div class="address">KAY M PLAZA,3RD FLOOR, G.S.ROAD, GANESHGURI, NEAR KAR BHAWAN, GHY -06</div>
            <div class="sheet-title">LOCAL CONVEYANCE EXPENSES SHEET</div>
          </div>
          
          <div class="metadata">
            <div>Name ...${employeeName.toUpperCase()}............................................................</div>
            <div>For the month of ......${monthName}...................</div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 12%">Date</th>
                <th style="width: 28%">Particulars</th>
                <th style="width: 12%">Mode</th>
                <th style="width: 20%">Purpose</th>
                <th style="width: 12%">Amount</th>
                <th style="width: 16%">Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${rowsHtml}
            </tbody>
          </table>

          <div class="footer-grid">
            <div class="note-cell">Note: Own Bike</div>
            <div class="note-cell">Own Bike</div>
            <div class="note-cell" style="border-right: 1px solid #000; text-align: center; line-height: 1.4;">
              Month- Km-${totalKm}, Avg/Mileage-${derivedMileage} <br/>
            </div>
          </div>

          <div class="totals-row">
            <div class="total-label">Total</div>
            <div class="total-amount">${grandTotalAmount}</div>
            <div style="border-bottom: 1px solid #000; border-right: 1px solid #000;"></div>
          </div>

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
