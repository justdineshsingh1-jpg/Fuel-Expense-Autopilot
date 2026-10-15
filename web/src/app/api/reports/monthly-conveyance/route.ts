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
    let vehicleDetails = 'Yamaha FzS';

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

    // ----------------------------------------------------------------------------------
    // 1. Fetch CURRENT month trips
    // ----------------------------------------------------------------------------------
    const { data: logs, error } = await supabaseAdmin
      .from('trip_logs')
      .select('*')
      .eq('user_id', targetUserId)
      .gte('log_date', startDate)
      .lte('log_date', endDate)
      .order('log_date', { ascending: true });

    if (error) throw error;

    let totalOdoKm = 0;
    let totalAppKm = 0;
    let totalFuelAmount = 0;
    let recordedFuelLiters = 0;
    let totalMiscAmount = 0;
    let grandTotalAmount = 0;

    let rowsHtml = '';
    const defaultMode = 'Cash/ Bike';
    const defaultPurpose = 'Official';

    if (logs && logs.length > 0) {
      logs.forEach(log => {
        const startR = Number(log.start_reading || 0);
        const endR = Number(log.end_reading || startR);
        const claimedDist = log.distance_km !== null && log.distance_km !== undefined 
          ? Number(log.distance_km) 
          : (endR >= startR ? endR - startR : 0);

        totalOdoKm += claimedDist > 0 ? claimedDist : 0;
        
        // App GPS / OSRM tracked distance
        const appDist = Number(log.osrm_calculated_km || log.osrm_distance_km || 0);
        if (appDist > 0) {
          totalAppKm += appDist;
        } else if (claimedDist > 0) {
          // If app distance wasn't recorded for this leg, use claimed
          totalAppKm += claimedDist;
        }

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
              <td>Fuel</td>
              <td>${defaultMode}</td>
              <td>${defaultPurpose}</td>
              <td class="text-center">${Math.round(fuelCost)}</td>
              <td>Bill Attached</td>
            </tr>
          `;
        }

        if (miscCost > 0) {
          grandTotalAmount += miscCost;
          rowsHtml += `
            <tr>
              <td class="text-center">${formattedDate}</td>
              <td>${log.misc_particulars || 'Bike servicing / parts'}</td>
              <td>${defaultMode}</td>
              <td>${defaultPurpose}</td>
              <td class="text-center">${Math.round(miscCost)}</td>
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

    // Empty rows padding to match the exact physical sheet height
    const currentRows = (rowsHtml.match(/<tr/g) || []).length;
    for (let i = currentRows; i < 16; i++) {
      rowsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    // ----------------------------------------------------------------------------------
    // 2. Fetch PREVIOUS month trips for historical comparison (e.g. July vs Aug)
    // ----------------------------------------------------------------------------------
    const [yearStr, monthStr] = month.split('-');
    const curYear = parseInt(yearStr);
    const curMonthNum = parseInt(monthStr);

    let prevYear = curYear;
    let prevMonthNum = curMonthNum - 1;
    if (prevMonthNum === 0) {
      prevMonthNum = 12;
      prevYear -= 1;
    }

    const prevMonthKey = `${prevYear}-${String(prevMonthNum).padStart(2, '0')}`;
    const prevStartDate = `${prevMonthKey}-01`;
    const prevEndDate = `${prevMonthKey}-31`;

    let prevTotalOdoKm = 0;
    let prevTotalFuel = 0;
    let prevFuelLiters = 0;

    try {
      const { data: prevLogs } = await supabaseAdmin
        .from('trip_logs')
        .select('distance_km, start_reading, end_reading, fuel_amount, fuel_liters')
        .eq('user_id', targetUserId)
        .gte('log_date', prevStartDate)
        .lte('log_date', prevEndDate);

      if (prevLogs && prevLogs.length > 0) {
        prevLogs.forEach(pl => {
          const sR = Number(pl.start_reading || 0);
          const eR = Number(pl.end_reading || sR);
          const dist = pl.distance_km !== null && pl.distance_km !== undefined ? Number(pl.distance_km) : (eR >= sR ? eR - sR : 0);
          prevTotalOdoKm += dist > 0 ? dist : 0;
          prevTotalFuel += Number(pl.fuel_amount || 0);
          prevFuelLiters += Number(pl.fuel_liters || 0);
        });
      }
    } catch (prevErr) {
      console.warn("Could not fetch previous month logs:", prevErr);
    }

    const curMonthNameLong = new Date(startDate).toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
    const curMonthNameShort = new Date(startDate).toLocaleString('default', { month: 'short' });
    const prevMonthNameShort = new Date(prevStartDate).toLocaleString('default', { month: 'short' });

    // ----------------------------------------------------------------------------------
    // 3. MILEAGE CALCULATIONS (Odometer & App GPS)
    // ----------------------------------------------------------------------------------
    const petrolUsageLiters = totalFuelAmount > 0 
      ? (totalFuelAmount / fuelPrice) 
      : recordedFuelLiters;

    const displayLiters = petrolUsageLiters > 0 ? petrolUsageLiters.toFixed(2) : '0.00';

    // A. Odometer Mileage (e.g. 1000 KM / 23.59 L = 42.40 KM/L)
    const odoMileage = (totalOdoKm > 0 && petrolUsageLiters > 0)
      ? (totalOdoKm / petrolUsageLiters).toFixed(2)
      : 'N/A';

    // B. App GPS Mileage (e.g. 950 KM / 23.59 L = 40.27 KM/L)
    const appMileage = (totalAppKm > 0 && petrolUsageLiters > 0)
      ? (totalAppKm / petrolUsageLiters).toFixed(2)
      : 'N/A';

    // C. Previous Month Mileage
    const prevPetrolUsage = prevTotalFuel > 0 ? (prevTotalFuel / fuelPrice) : prevFuelLiters;
    const prevMileage = (prevTotalOdoKm > 0 && prevPetrolUsage > 0)
      ? (prevTotalOdoKm / prevPetrolUsage).toFixed(2)
      : null;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Conveyance_Report_${employeeName.replace(/\s+/g, '_')}_${month}</title>
        <style>
          @page { size: A4 portrait; margin: 8mm; }
          body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; margin: 0; padding: 0; color: #000; }
          .container { width: 100%; max-width: 820px; margin: 0 auto; box-sizing: border-box; }
          
          table { width: 100%; border-collapse: collapse; border: 1.5px solid #000; }
          th, td { border: 1px solid #000; padding: 3.5px 5px; }
          th { font-weight: bold; text-align: center; background-color: #fff; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }
          .title-lg { font-size: 16px; font-weight: bold; padding: 5px; text-align: center; letter-spacing: 0.5px; }
          .title-md { font-size: 12px; font-weight: bold; padding: 3px; text-align: center; }
          .title-sm { font-size: 10px; font-weight: bold; padding: 2px; text-align: center; }
          
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
            margin-top: 36px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
          }
          .sign-col {
            width: 28%;
            border-top: 1.5px solid #000;
            padding-top: 5px;
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
          <div class="no-print" style="margin-bottom: 12px; padding: 8px 12px; background: #e0f2fe; border: 1px solid #bae6fd; border-radius: 6px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <strong>Monthly Local Conveyance Sheet</strong> (Official Format matching Accounts Scan)
            </div>
            <div>
              <button onclick="window.print()" style="background: #0284c7; color: white; border: none; padding: 5px 14px; font-weight: bold; border-radius: 4px; cursor: pointer; font-size: 12px;">
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
              <td colspan="6" class="title-sm">KAY M PLAZA,3RD FLOOR, G.S.ROAD, GANESHGURI, NEAR KAR BHAWAN, GHY -06</td>
            </tr>
            <tr>
              <td colspan="6" class="title-md">LOCAL CONVEYANCE EXPENSES SHEET</td>
            </tr>
            
            <!-- METADATA BLOCK -->
            <tr>
              <td colspan="3" class="font-bold">Name …${employeeName.toUpperCase()}…………..........................…………..……...</td>
              <td colspan="3" class="font-bold">For the month of ......${curMonthNameLong}………......................</td>
            </tr>

            <!-- TABLE COLUMNS -->
            <tr>
              <th style="width: 13%">Date</th>
              <th style="width: 31%">Particulars</th>
              <th style="width: 12%">Mode</th>
              <th style="width: 18%">Purpose</th>
              <th style="width: 12%">Amount</th>
              <th style="width: 14%">Remarks</th>
            </tr>

            <!-- DYNAMIC EXPENSE DATA & BLANK ROWS -->
            ${rowsHtml}

            <!-- FOOTER NOTE ROW WITH EXACT IMAGE LAYOUT & APP MILEAGE COMPARISON -->
            <tr>
              <td class="font-bold">Note:</td>
              <td class="font-bold">${vehicleDetails}</td>
              <td class="font-bold">Own Bike</td>
              <td></td>
              <td colspan="2" rowspan="6" style="vertical-align: top; padding: 5px 6px; font-weight: bold; font-size: 11px; line-height: 1.55;">
                <div>${curMonthNameShort}- Km-${Math.round(totalOdoKm)}, Avg/Mileage-${odoMileage}-S</div>
                <div style="padding-left: 28px; color: #0284c7;">${Math.round(totalAppKm)}-${appMileage}(app)</div>
                ${prevMileage ? `<div>${prevMonthNameShort}- Km-${Math.round(prevTotalOdoKm)}, Avg/Mileage-${prevMileage}</div>` : ''}
                
                <div style="margin-top: 4px; padding-top: 4px; border-top: 1px dashed #bbb; font-size: 9.5px; font-weight: normal; color: #333;">
                  Total Km-${Math.round(totalOdoKm)} Avg Mileage-${odoMileage}<br/>
                  App Total Km-${Math.round(totalAppKm)} Avg Milage-${appMileage}
                </div>
              </td>
            </tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>
            <tr><td>&nbsp;</td><td></td><td></td><td></td></tr>

            <!-- TOTAL CLAIM ROW -->
            <tr>
              <td colspan="3"></td>
              <td class="text-center font-bold">Total</td>
              <td class="text-center font-bold">${Math.round(grandTotalAmount)}</td>
              <td></td>
            </tr>
          </table>

          <!-- DETAILED VEHICLE MILEAGE AUDIT CARD -->
          <table class="audit-summary-box">
            <tr>
              <td colspan="4" style="background: #dcfce7; font-weight: bold; text-align: center; padding: 5px; font-size: 11px; color: #166534; letter-spacing: 0.5px;">
                MILEAGE RECONCILIATION SUMMARY (ODOMETER VS APP GPS TRACKING)
              </td>
            </tr>
            <tr>
              <td style="width: 25%;"><strong>Total Odometer Travel:</strong></td>
              <td style="width: 25%; font-weight: bold; font-size: 12px; color: #111;">${Math.round(totalOdoKm)} KM</td>
              <td style="width: 25%;"><strong>Odometer Avg Mileage:</strong></td>
              <td style="width: 25%; font-weight: bold; font-size: 13px; color: #047857;">${odoMileage} KM / Liter</td>
            </tr>
            <tr>
              <td><strong>App Tracked Route Distance:</strong></td>
              <td style="font-weight: bold; font-size: 12px; color: #0284c7;">${Math.round(totalAppKm)} KM</td>
              <td><strong>App GPS Avg Mileage:</strong></td>
              <td style="font-weight: bold; font-size: 13px; color: #0284c7;">${appMileage} KM / Liter</td>
            </tr>
            <tr style="background: #d1fae5;">
              <td colspan="2">
                <strong>Fuel Claimed:</strong> ₹${totalFuelAmount.toFixed(2)} (${displayLiters} L Petrol @ ₹${fuelPrice}/L)
              </td>
              <td colspan="2" style="text-align: right; font-weight: bold; padding: 5px 8px;">
                <span style="font-size: 10.5px; color: #065f46; text-transform: uppercase;">Route Variance:</span>
                <span style="font-size: 12px; color: ${Math.abs(totalOdoKm - totalAppKm) > (totalAppKm * 0.18) ? '#b91c1c' : '#047857'}; margin-left: 6px;">
                  ${totalAppKm > 0 ? (((totalOdoKm - totalAppKm) / totalAppKm) * 100).toFixed(1) : '0.0'}%
                </span>
              </td>
            </tr>
          </table>

          <!-- SIGNATURE AUDIT BLOCKS -->
          <div class="signatures-container">
            <div class="sign-col">
              Verified by TL<br/>
              <span style="font-size: 10px; font-weight: normal; color: #555;">(Team Leader)</span>
            </div>
            <div class="sign-col">
              Verified by Manager<br/>
              <span style="font-size: 10px; font-weight: normal; color: #555;">(Operations Manager)</span>
            </div>
            <div class="sign-col">
              Approved by MD<br/>
              <span style="font-size: 10px; font-weight: normal; color: #555;">(Managing Director)</span>
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
