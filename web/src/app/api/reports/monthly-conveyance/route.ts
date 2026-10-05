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
      .select('full_name, vehicle_details')
      .eq('id', userId)
      .single();
    let vehicleDetails = 'Own Bike';
    if (userData) {
      employeeName = userData.full_name;
      if (userData.vehicle_details) vehicleDetails = userData.vehicle_details;
    }

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

    // Calculate how many empty rows we need to reach exactly 16 data rows (so the Note row is positioned like the image)
    const currentRows = (rowsHtml.match(/<tr/g) || []).length;
    for(let i = currentRows; i < 16; i++) {
        rowsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    const monthName = new Date(startDate).toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
    const derivedMileage = totalLiters > 0 ? (totalKm / totalLiters).toFixed(2) : 'N/A'; 

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Conveyance_Report_${employeeName}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: Arial, sans-serif; font-size: 11px; margin: 0; padding: 0; }
          .container { width: 100%; max-width: 800px; margin: 0 auto; box-sizing: border-box; }
          
          table { width: 100%; border-collapse: collapse; border: 1px solid #000; }
          th, td { border: 1px solid #000; padding: 4px; }
          th { font-weight: bold; text-align: center; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .title-lg { font-size: 16px; font-weight: bold; padding: 4px; text-align: center;}
          .title-md { font-size: 12px; font-weight: bold; padding: 3px; text-align: center;}
          .title-sm { font-size: 11px; font-weight: bold; padding: 2px; text-align: center;}
        </style>
      </head>
      <body>
        <div class="container">
          <table>
            <!-- HEADER BLOCK -->
            <tr>
              <td colspan="6" class="title-lg">INDUSTRIAL SYSTEMS LLP</td>
            </tr>
            <tr>
              <td colspan="6" class="title-sm">KAY M PLAZA,3RD FLOOR, G.S.ROAD, GANESHGURI, NEAR KAR BHAWAN, GHY -06</td>
            </tr>
            <tr>
              <td colspan="6" class="title-md">LOCAL CONVEYANCE EXPENSES SHEET</td>
            </tr>
            
            <!-- METADATA BLOCK -->
            <tr>
              <td colspan="3" class="font-bold">Name ...${employeeName.toUpperCase()}............................................................</td>
              <td colspan="3" class="font-bold">For the month of ......${monthName}...................</td>
            </tr>

            <!-- COLUMNS -->
            <tr>
              <th style="width: 12%">Date</th>
              <th style="width: 28%">Particulars</th>
              <th style="width: 12%">Mode</th>
              <th style="width: 20%">Purpose</th>
              <th style="width: 12%">Amount</th>
              <th style="width: 16%">Remarks</th>
            </tr>

            <!-- DYNAMIC DATA & EMPTY ROWS -->
            ${rowsHtml}

            <!-- FOOTER NOTE ROW -->
            <tr>
              <td class="font-bold">Note:</td>
              <td class="font-bold">${vehicleDetails}</td>
              <td class="font-bold">Own Bike</td>
              <td></td>
              <td colspan="2" class="text-center font-bold">Month- Km-${totalKm}, Avg/Mileage-${derivedMileage}</td>
            </tr>

            <!-- EXTRA EMPTY ROWS BELOW NOTE (Matches Image exactly) -->
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>

            <!-- TOTAL ROW -->
            <tr>
              <td colspan="3"></td>
              <td class="text-center font-bold">Total</td>
              <td class="text-center font-bold">${grandTotalAmount}</td>
              <td></td>
            </tr>
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
