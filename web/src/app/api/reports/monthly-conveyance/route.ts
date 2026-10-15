import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get('userId');
  const month = searchParams.get('month') || new Date().toISOString().substring(0, 7); // Format: YYYY-MM
  const fuelPrice = Number(searchParams.get('fuelPrice')) || 106; // Standard Rs 106 / Liter

  try {
    const startDate = `${month}-01`;
    const endDate = `${month}-31`; 

    let targetUserId = userIdParam;

    // If userId is missing or 'ALL', locate first eligible user with trips in this month
    if (!targetUserId || targetUserId === 'ALL') {
      const { data: anyTrip } = await supabaseAdmin
        .from('trip_logs')
        .select('user_id')
        .gte('log_date', startDate)
        .lte('log_date', endDate)
        .limit(1);

      if (anyTrip && anyTrip.length > 0) {
        targetUserId = anyTrip[0].user_id;
      }
    }

    if (!targetUserId || targetUserId === 'ALL') {
      const { data: latestTrip } = await supabaseAdmin
        .from('trip_logs')
        .select('user_id')
        .order('created_at', { ascending: false })
        .limit(1);

      if (latestTrip && latestTrip.length > 0) {
        targetUserId = latestTrip[0].user_id;
      }
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'No trip records found for the requested period' }, { status: 404 });
    }

    // Fetch user details for the header
    let employeeName = 'Field Executive';
    let employeeCode = targetUserId.substring(0, 6).toUpperCase();
    let vehicleDetails = 'Own Bike';

    const { data: userData } = await supabaseAdmin
      .from('users')
      .select('full_name, employee_code, vehicle_details')
      .eq('id', targetUserId)
      .single();

    if (userData) {
      if (userData.full_name) employeeName = userData.full_name;
      if (userData.employee_code) employeeCode = userData.employee_code;
      if (userData.vehicle_details) vehicleDetails = userData.vehicle_details;
    }

    // Fetch trips for this user in this month
    const { data: logs, error } = await supabaseAdmin
      .from('trip_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });

    if (error) throw error;

    let totalKm = 0;
    let totalFuelAmount = 0;
    let recordedFuelLiters = 0;
    let totalMiscAmount = 0;
    let grandTotalAmount = 0;

    let rowsHtml = '';
    const defaultMode = 'Cash/ Bike';
    const defaultPurpose = 'Official Field Survey / Ops';

    if (logs && logs.length > 0) {
      logs.forEach(log => {
        const startR = Number(log.start_reading || 0);
        const endR = Number(log.end_reading || startR);
        const claimedDist = log.distance_km !== null && log.distance_km !== undefined 
          ? Number(log.distance_km) 
          : (endR >= startR ? endR - startR : 0);

        totalKm += claimedDist > 0 ? claimedDist : 0;
        
        const fuelCost = Number(log.fuel_amount || 0);
        const fuelLiters = Number(log.fuel_liters || 0);
        const miscCost = Number(log.misc_amount || 0);
        
        if (fuelCost > 0) totalFuelAmount += fuelCost;
        if (fuelLiters > 0) recordedFuelLiters += fuelLiters;
        if (miscCost > 0) totalMiscAmount += miscCost;

        // Date formatter (DD-MM-YYYY)
        const dateParts = log.log_date ? log.log_date.split('-') : [];
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : log.log_date;

        if (fuelCost > 0) {
          grandTotalAmount += fuelCost;
          rowsHtml += `
            <tr>
              <td class="text-center">${formattedDate}</td>
              <td>Fuel (Petrol) - Slip Ref</td>
              <td>${defaultMode}</td>
              <td>${defaultPurpose}</td>
              <td class="text-center">${fuelCost.toFixed(2)}</td>
              <td>Bill Attached</td>
            </tr>
          `;
        }

        if (miscCost > 0) {
          grandTotalAmount += miscCost;
          rowsHtml += `
            <tr>
              <td class="text-center">${formattedDate}</td>
              <td>${log.misc_particulars || 'Field Maintenance / Other Allowance'}</td>
              <td>${defaultMode}</td>
              <td>${defaultPurpose}</td>
              <td class="text-center">${miscCost.toFixed(2)}</td>
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
        <td>Mobile & Data Recharge Allowance</td>
        <td>Direct</td>
        <td>Official Communication</td>
        <td class="text-center">${FIXED_MOBILE_RECHARGE.toFixed(2)}</td>
        <td>Monthly Policy</td>
      </tr>
    `;

    // Calculate empty rows to maintain neat, printable standard A4 sheet alignment
    const currentRows = (rowsHtml.match(/<tr/g) || []).length;
    for (let i = currentRows; i < 14; i++) {
      rowsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    const monthName = new Date(startDate).toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
    
    // ----------------------------------------------------------------------------------
    // MILEAGE & PETROL USAGE CALCULATIONS
    // Formula:
    //   If Fuel Bill = Rs 2,500 and Fuel Price = Rs 106/L
    //   Petrol Usage = 2,500 / 106 = 23.59 L
    //   If Total Distance = 1,000 KM
    //   Mileage = 1,000 / (2,500 / 106) = 42.40 KM / Liter
    // ----------------------------------------------------------------------------------
    const petrolUsageLiters = totalFuelAmount > 0 
      ? Number((totalFuelAmount / fuelPrice).toFixed(2)) 
      : (recordedFuelLiters > 0 ? Number(recordedFuelLiters.toFixed(2)) : 0);

    let derivedMileage = 'N/A';
    if (totalKm > 0 && (totalFuelAmount > 0 || recordedFuelLiters > 0)) {
      const effectiveLiters = totalFuelAmount > 0 ? (totalFuelAmount / fuelPrice) : recordedFuelLiters;
      if (effectiveLiters > 0) {
        derivedMileage = (totalKm / effectiveLiters).toFixed(2);
      }
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Conveyance_Report_${employeeName.replace(/\s+/g, '_')}_${month}</title>
        <style>
          @page { size: A4 portrait; margin: 10mm; }
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif; font-size: 11px; margin: 0; padding: 0; color: #111; }
          .container { width: 100%; max-width: 820px; margin: 0 auto; box-sizing: border-box; }
          
          table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
          th, td { border: 1px solid #000; padding: 4.5px 6px; }
          th { font-weight: bold; text-align: center; background-color: #f1f5f9; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: bold; }
          .title-lg { font-size: 17px; font-weight: 800; padding: 6px; text-align: center; letter-spacing: 0.5px; }
          .title-md { font-size: 13px; font-weight: 700; padding: 4px; text-align: center; background: #e2e8f0; }
          .title-sm { font-size: 10.5px; padding: 3px; text-align: center; color: #333; }
          .meta-box { background: #f8fafc; font-size: 11.5px; }
          
          .audit-summary-box {
            margin-top: 14px;
            width: 100%;
            border: 1.5px solid #047857;
            background: #f0fdf4;
            border-radius: 4px;
            border-collapse: collapse;
          }
          .audit-summary-box td {
            border: 1px solid #a7f3d0;
            padding: 5px 8px;
          }

          .signatures-container {
            margin-top: 40px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
          }
          .sign-col {
            width: 30%;
            border-top: 1.5px solid #000;
            padding-top: 6px;
          }

          @media print {
            .no-print { display: none !important; }
            body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          }
        </style>
      </head>
      <body>
        <div class="container">
          
          <!-- Screen Action Bar -->
          <div class="no-print" style="margin-bottom: 15px; padding: 10px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Monthly Conveyance & Fuel Audit Sheet</strong> - Ready for Print / PDF Export
            </div>
            <div>
              <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 6px 14px; font-weight: bold; border-radius: 4px; cursor: pointer;">
                🖨️ Print / Save as PDF
              </button>
            </div>
          </div>

          <table>
            <!-- HEADER BLOCK -->
            <tr>
              <td colspan="6" class="title-lg">INDUSTRIAL SYSTEMS LLP</td>
            </tr>
            <tr>
              <td colspan="6" class="title-sm">KAY M PLAZA, 3RD FLOOR, G.S. ROAD, GANESHGURI, NEAR KAR BHAWAN, GUWAHATI - 781006</td>
            </tr>
            <tr>
              <td colspan="6" class="title-md">LOCAL CONVEYANCE & EXPENSES CLAIM SHEET</td>
            </tr>
            
            <!-- METADATA BLOCK -->
            <tr class="meta-box">
              <td colspan="3" class="font-bold">
                Employee Name: <span style="font-weight: 800; text-transform: uppercase;">${employeeName}</span> [Code: ${employeeCode}]
              </td>
              <td colspan="3" class="font-bold text-right">
                For the Month of: <span style="font-weight: 800;">${monthName}</span>
              </td>
            </tr>

            <!-- TABLE COLUMNS -->
            <tr>
              <th style="width: 12%">Date</th>
              <th style="width: 32%">Particulars</th>
              <th style="width: 12%">Mode</th>
              <th style="width: 20%">Purpose</th>
              <th style="width: 12%">Amount (₹)</th>
              <th style="width: 12%">Remarks</th>
            </tr>

            <!-- DYNAMIC EXPENSE DATA -->
            ${rowsHtml}

            <!-- FOOTER NOTE ROW WITH MILEAGE FORMULA -->
            <tr>
              <td class="font-bold">Note:</td>
              <td class="font-bold" colspan="2">${vehicleDetails} (Own Bike)</td>
              <td class="text-right font-bold">Month KM:</td>
              <td colspan="2" class="text-center font-bold" style="background: #f8fafc;">
                ${totalKm.toFixed(1)} KM
              </td>
            </tr>
            <tr>
              <td class="font-bold">Fuel Audit:</td>
              <td colspan="5" class="font-bold" style="background: #f0fdf4; color: #065f46;">
                Month Travel: ${totalKm.toFixed(1)} KM | Fuel Claimed: ₹${totalFuelAmount.toFixed(2)} | Petrol Usage: ${petrolUsageLiters} Litres (@ ₹${fuelPrice}/L) | Average Mileage: ${derivedMileage} KM/Liter
              </td>
            </tr>

            <!-- TOTAL CLAIM ROW -->
            <tr style="background: #f1f5f9;">
              <td colspan="3"></td>
              <td class="text-center font-bold" style="font-size: 13px;">GRAND TOTAL</td>
              <td class="text-center font-bold" style="font-size: 13px; color: #047857;">₹${grandTotalAmount.toFixed(2)}</td>
              <td></td>
            </tr>
          </table>

          <!-- DETAILED VEHICLE MILEAGE AUDIT CARD -->
          <table class="audit-summary-box">
            <tr>
              <td colspan="4" style="background: #dcfce7; font-weight: bold; text-align: center; padding: 6px; font-size: 11.5px; color: #166534; letter-spacing: 0.5px;">
                OFFICIAL FUEL USAGE & VEHICLE MILEAGE RECONCILIATION
              </td>
            </tr>
            <tr>
              <td style="width: 25%;"><strong>Total Distance (KM):</strong></td>
              <td style="width: 25%; font-weight: bold; font-size: 12px;">${totalKm.toFixed(1)} KM</td>
              <td style="width: 25%;"><strong>Fuel Price Benchmark:</strong></td>
              <td style="width: 25%; font-weight: bold; font-size: 12px;">₹${fuelPrice.toFixed(2)} / Litre</td>
            </tr>
            <tr>
              <td><strong>Total Fuel Expenses:</strong></td>
              <td style="font-weight: bold; font-size: 12px; color: #047857;">₹${totalFuelAmount.toFixed(2)}</td>
              <td><strong>Calculated Petrol Usage:</strong></td>
              <td style="font-weight: bold; font-size: 12px; color: #0284c7;">${petrolUsageLiters} Litres</td>
            </tr>
            <tr style="background: #d1fae5;">
              <td colspan="2" style="font-weight: bold; color: #065f46;">
                Registered Vehicle: ${vehicleDetails}
              </td>
              <td colspan="2" style="text-align: right; font-weight: bold; padding: 6px 10px;">
                <span style="font-size: 11px; color: #065f46; text-transform: uppercase;">Average Vehicle Mileage:</span>
                <span style="font-size: 15px; color: #047857; margin-left: 8px; font-weight: 900;">${derivedMileage} KM / Litre</span>
              </td>
            </tr>
          </table>

          <!-- SIGNATURE AUDIT BLOCKS -->
          <div class="signatures-container">
            <div class="sign-col">
              Employee Signature<br/>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">${employeeName}</span>
            </div>
            <div class="sign-col">
              Verified by Supervisor<br/>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">(Odometer & GPS Verified)</span>
            </div>
            <div class="sign-col">
              Approved by Accounts / MD<br/>
              <span style="font-size: 10px; font-weight: normal; color: #64748b;">(Sanctioned for Payment)</span>
            </div>
          </div>

        </div>
      </body>
      </html>
    `;

    return new NextResponse(htmlContent, {
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
      }
    });

  } catch (err: any) {
    console.error("Monthly report error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
