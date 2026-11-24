import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

function getLastDayOfMonth(yearMonth: string): string {
  const parts = yearMonth.split('-');
  const y = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  const lastDay = new Date(y, m, 0).getDate();
  return `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const userIdParam = searchParams.get('userId');
  const month = searchParams.get('month') || new Date().toISOString().substring(0, 7); // Format: YYYY-MM
  let fuelPrice = Number(searchParams.get('fuelPrice'));

  if (!fuelPrice || isNaN(fuelPrice)) {
    try {
      const { data: configData } = await supabaseAdmin.storage
        .from('fuel-receipts')
        .download('config/fuel_settings.json');
      if (configData) {
        const text = await configData.text();
        const conf = JSON.parse(text);
        if (conf.fuel_price) fuelPrice = Number(conf.fuel_price);
      }
    } catch (e) {}
  }
  if (!fuelPrice || isNaN(fuelPrice)) {
    fuelPrice = 106; // Default Rs 106 / Liter
  }

  try {
    const startDate = `${month}-01`;
    const endDate = getLastDayOfMonth(month); 

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

    // Fetch user details
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

    const defaultMode = 'Cash/ Bike';
    const defaultPurpose = 'Official';

    interface BillItem {
      type: string;
      date: string;
      amount: number;
      startReading: number;
      endReading: number;
      distance: number;
      location: string;
      imageUrl: string;
    }

    const billsList: BillItem[] = [];
    let travelRowsHtml = '';
    let expenseRowsHtml = '';

    let firstDate = '';
    let lastDate = '';

    if (logs && logs.length > 0) {
      for (const log of logs) {
        const startR = Number(log.start_reading || 0);
        const endR = Number(log.end_reading || startR);
        const claimedDist = log.distance_km !== null && log.distance_km !== undefined 
          ? Number(log.distance_km) 
          : (endR >= startR ? endR - startR : 0);

        totalOdoKm += claimedDist > 0 ? claimedDist : 0;
        
        const appDist = Number(log.osrm_calculated_km || log.osrm_distance_km || 0);
        if (appDist > 0) {
          totalAppKm += appDist;
        } else if (claimedDist > 0) {
          totalAppKm += claimedDist;
        }

        const fuelCost = Number(log.fuel_amount || 0);
        const fuelLiters = Number(log.fuel_liters || 0);
        const miscCost = Number(log.misc_amount || 0);
        
        if (fuelCost > 0) totalFuelAmount += fuelCost;
        if (fuelLiters > 0) recordedFuelLiters += fuelLiters;
        if (miscCost > 0) totalMiscAmount += miscCost;

        // Date formatting (DD-MM-YYYY)
        const dateParts = log.log_date ? log.log_date.split('-') : [];
        const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : log.log_date;
        if (!firstDate) firstDate = formattedDate;
        lastDate = formattedDate;

        // Determine Location for this trip
        let locString = (log.misc_particulars && !log.misc_particulars.includes('Ended via app'))
          ? log.misc_particulars.trim()
          : '';

        // If not specified, try reading addresses from map_history JSON
        if (!locString) {
          try {
            const { data: mapData } = await supabaseAdmin.storage
              .from('fuel-receipts')
              .download(`map_history/${log.id}.json`);
            if (mapData) {
              const text = await mapData.text();
              const parsed = JSON.parse(text);
              if (parsed.waypoints && Array.isArray(parsed.waypoints)) {
                const addrs = parsed.waypoints
                  .map((w: any) => w.address)
                  .filter((a: any) => a && typeof a === 'string' && a.length > 2);
                const unique = Array.from(new Set(addrs));
                if (unique.length > 0) {
                  locString = unique.slice(0, 4).join(', ');
                }
              }
            }
          } catch (_) {}
        }

        if (!locString) {
          locString = 'Boragaon, Maligaon, Pandu, Field Operations';
        }

        // Section 1: Travel Log row
        const fuelRemarkText = fuelCost > 0 ? `Fuel: Rs.${Math.round(fuelCost)}` : '-';
        travelRowsHtml += `
          <tr>
            <td style="border: 1px solid #000; padding: 4.5px 6px; text-align: center;">${formattedDate}</td>
            <td style="border: 1px solid #000; padding: 4.5px 6px; text-align: center;">${Math.round(startR)}</td>
            <td style="border: 1px solid #000; padding: 4.5px 6px; text-align: center;">${Math.round(endR)}</td>
            <td style="border: 1px solid #000; padding: 4.5px 6px; text-align: center; font-weight: bold;">${Math.round(claimedDist)}</td>
            <td style="border: 1px solid #000; padding: 4.5px 6px; font-size: 10px;">${locString}</td>
            <td style="border: 1px solid #000; padding: 4.5px 6px; font-size: 10.5px; font-weight: ${fuelCost > 0 ? 'bold' : 'normal'};">${fuelRemarkText}</td>
          </tr>
        `;

        // Section 2: Expense Sheet row
        if (fuelCost > 0) {
          grandTotalAmount += fuelCost;
          expenseRowsHtml += `
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
          expenseRowsHtml += `
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

        // Section 3: Collect bills for the Gallery
        if (log.fuel_bill_url && log.fuel_bill_url.startsWith('http')) {
          billsList.push({
            type: 'Fuel bill',
            date: formattedDate,
            amount: Math.round(fuelCost),
            startReading: Math.round(startR),
            endReading: Math.round(endR),
            distance: Math.round(claimedDist),
            location: locString,
            imageUrl: log.fuel_bill_url
          });
        }

        if (log.misc_bill_url && log.misc_bill_url.startsWith('http')) {
          billsList.push({
            type: 'Servicing bill',
            date: formattedDate,
            amount: Math.round(miscCost),
            startReading: Math.round(startR),
            endReading: Math.round(endR),
            distance: Math.round(claimedDist),
            location: locString,
            imageUrl: log.misc_bill_url
          });
        }
      }
    }

    // Default period string
    const periodString = firstDate && lastDate ? `${firstDate} to ${lastDate}` : `01-${month.split('-')[1]}-${month.split('-')[0]} to 30-${month.split('-')[1]}-${month.split('-')[0]}`;

    // Fill minimum empty rows in travel table
    const currentTravelRows = (travelRowsHtml.match(/<tr/g) || []).length;
    for (let i = currentTravelRows; i < 14; i++) {
      travelRowsHtml += `<tr><td style="border: 1px solid #000; padding: 4.5px 6px;">&nbsp;</td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td><td style="border: 1px solid #000;"></td></tr>`;
    }

    // Expense sheet: Mobile recharge
    const FIXED_MOBILE_RECHARGE = 300;
    grandTotalAmount += FIXED_MOBILE_RECHARGE;
    expenseRowsHtml += `
      <tr>
        <td class="text-center"></td>
        <td>Mobile Recharge</td>
        <td></td>
        <td></td>
        <td class="text-center">${FIXED_MOBILE_RECHARGE}</td>
        <td></td>
      </tr>
    `;

    // Fill minimum empty rows in expense table
    const currentExpenseRows = (expenseRowsHtml.match(/<tr/g) || []).length;
    for (let i = currentExpenseRows; i < 15; i++) {
      expenseRowsHtml += `<tr><td>&nbsp;</td><td></td><td></td><td></td><td></td><td></td></tr>`;
    }

    // ----------------------------------------------------------------------------------
    // 2. Fetch PREVIOUS month trips for historical comparison
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
    const prevEndDate = getLastDayOfMonth(prevMonthKey);

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
    } catch (_) {}

    const curMonthNameLong = new Date(startDate).toLocaleString('default', { month: 'short', year: 'numeric' }).toUpperCase();
    const curMonthNameShort = new Date(startDate).toLocaleString('default', { month: 'short' });
    const prevMonthNameShort = new Date(prevStartDate).toLocaleString('default', { month: 'short' });

    // ----------------------------------------------------------------------------------
    // 3. MILEAGE CALCULATIONS
    // ----------------------------------------------------------------------------------
    const petrolUsageLiters = totalFuelAmount > 0 
      ? (totalFuelAmount / fuelPrice) 
      : recordedFuelLiters;

    const displayLiters = petrolUsageLiters > 0 ? petrolUsageLiters.toFixed(2) : '0.00';

    const odoMileage = (totalOdoKm > 0 && petrolUsageLiters > 0)
      ? (totalOdoKm / petrolUsageLiters).toFixed(2)
      : 'N/A';

    const appMileage = (totalAppKm > 0 && petrolUsageLiters > 0)
      ? (totalAppKm / petrolUsageLiters).toFixed(2)
      : 'N/A';

    const prevPetrolUsage = prevTotalFuel > 0 ? (prevTotalFuel / fuelPrice) : prevFuelLiters;
    const prevMileage = (prevTotalOdoKm > 0 && prevPetrolUsage > 0)
      ? (prevTotalOdoKm / prevPetrolUsage).toFixed(2)
      : null;

    // ----------------------------------------------------------------------------------
    // 4. SECTION 3: BILLS & RECEIPTS GALLERY (4 per page in 2x2 grid)
    // ----------------------------------------------------------------------------------
    const billChunks: BillItem[][] = [];
    for (let i = 0; i < billsList.length; i += 4) {
      billChunks.push(billsList.slice(i, i + 4));
    }

    let billPagesHtml = '';
    const totalBillPages = billChunks.length > 0 ? billChunks.length : 1;

    if (billChunks.length === 0) {
      billPagesHtml = `
        <div class="report-page page-break">
          <div class="bills-header">
            Bills - ${employeeName.toUpperCase()} - ${curMonthNameLong} (Page 1 of 1)
          </div>
          <div style="padding: 40px; text-align: center; color: #64748b; font-size: 13px; border: 1px dashed #cbd5e1; border-radius: 8px; margin-top: 20px;">
            No original bill slips attached for this period.
          </div>
        </div>
      `;
    } else {
      billChunks.forEach((chunk, pageIdx) => {
        const cardsHtml = chunk.map(b => `
          <div class="bill-card">
            <div class="bill-title">${b.type} - ${b.date} - Rs.${b.amount}</div>
            <div class="bill-meta">Km: ${b.distance} (Reading ${b.startReading} to ${b.endReading})</div>
            <div class="bill-meta" style="color: #475569;">Location: ${b.location}</div>
            <div class="bill-img-box">
              <img src="${b.imageUrl}" alt="${b.type}" crossorigin="anonymous" />
            </div>
          </div>
        `).join('');

        billPagesHtml += `
          <div class="report-page page-break">
            <div class="bills-header">
              Bills - ${employeeName.toUpperCase()} - ${curMonthNameLong} (Page ${pageIdx + 1} of ${totalBillPages})
            </div>
            <div class="bills-grid">
              ${cardsHtml}
            </div>
          </div>
        `;
      });
    }

    // ----------------------------------------------------------------------------------
    // FULL COMBINED HTML DOSSIER
    // ----------------------------------------------------------------------------------
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>${employeeCode}_${employeeName.replace(/\s+/g, '_')}_${month}_Complete_Report</title>
        <style>
          @page {
            size: A4 portrait;
            margin: 8mm 10mm;
          }
          * { box-sizing: border-box; }
          body {
            font-family: Arial, Helvetica, sans-serif;
            font-size: 11px;
            margin: 0;
            padding: 0;
            color: #000;
            background: #f1f5f9;
          }
          .dossier-container {
            width: 100%;
            max-width: 860px;
            margin: 0 auto;
          }
          .report-page {
            background: #ffffff;
            padding: 18px 20px;
            margin-bottom: 24px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.06);
            border: 1px solid #e2e8f0;
          }
          
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #000; padding: 4px 5px; }
          th { font-weight: bold; text-align: center; background-color: #fff; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .text-left { text-align: left; }
          .font-bold { font-weight: bold; }

          .title-lg { font-size: 16px; font-weight: bold; padding: 4px; text-align: center; letter-spacing: 0.5px; }
          .title-md { font-size: 12px; font-weight: bold; padding: 3px; text-align: center; }
          .title-sm { font-size: 10px; font-weight: bold; padding: 2px; text-align: center; }

          .signatures-container {
            margin-top: 32px;
            display: flex;
            justify-content: space-between;
            text-align: center;
            font-size: 11px;
            font-weight: bold;
          }
          .sign-col {
            width: 29%;
            border-top: 1.5px solid #000;
            padding-top: 6px;
          }

          /* Bills Gallery Styles */
          .bills-header {
            font-size: 13px;
            font-weight: bold;
            color: #0f172a;
            border-bottom: 1.5px solid #000;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          .bills-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
          }
          .bill-card {
            border: 1px solid #000;
            padding: 8px;
            background: #fff;
            display: flex;
            flex-direction: column;
            height: 480px;
          }
          .bill-title {
            font-size: 11px;
            font-weight: bold;
            color: #000;
            margin-bottom: 2px;
          }
          .bill-meta {
            font-size: 9.5px;
            color: #111;
            margin-bottom: 2px;
            line-height: 1.25;
          }
          .bill-img-box {
            flex: 1;
            margin-top: 4px;
            border: 1px solid #ccc;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #fafafa;
            overflow: hidden;
          }
          .bill-img-box img {
            max-width: 100%;
            max-height: 400px;
            object-fit: contain;
          }

          @media print {
            body { background: transparent; font-size: 10.5px; }
            .no-print { display: none !important; }
            .report-page {
              padding: 0;
              margin: 0;
              box-shadow: none;
              border: none;
              page-break-after: always;
              break-after: page;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
          }
        </style>
      </head>
      <body>
        <div class="dossier-container">
          
          <!-- Top Action Bar (hidden in print) -->
          <div class="no-print" style="margin: 16px 0 20px; padding: 12px 18px; background: #ffffff; border: 1px solid #cbd5e1; border-radius: 8px; display: flex; flex-wrap: wrap; justify-content: space-between; align-items: center; gap: 10px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
            <div>
              <div style="font-weight: bold; font-size: 15px; color: #0f172a;">${employeeName} (${employeeCode})</div>
              <div style="font-size: 12px; color: #64748b;">Complete Monthwise Dossier (Travel Log + Conveyance Sheet + Attached Bills)</div>
            </div>
            <div style="display: flex; gap: 8px;">
              <button onclick="window.print()" style="background: #1d5bb5; color: white; border: none; padding: 8px 16px; font-weight: bold; border-radius: 6px; cursor: pointer; font-size: 13px; display: flex; align-items: center; gap: 6px;">
                🖨️ Print / Save as PDF (All Pages)
              </button>
            </div>
          </div>

          <!-- ====================================================================== -->
          <!-- PAGE 1: DAILY TRAVEL & ODOMETER DETAIL LOG (Exact Match to Sample 1)  -->
          <!-- ====================================================================== -->
          <div class="report-page page-break">
            <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; margin-bottom: 0;">
              <tr>
                <td style="font-weight: bold; font-size: 12.5px; padding: 6px 10px; width: 60%; border: 1.5px solid #000;">
                  Employee Name: <span style="font-size: 13.5px; text-transform: uppercase;">${employeeName}</span>
                </td>
                <td style="font-weight: bold; font-size: 12px; padding: 6px 10px; text-align: right; width: 40%; border: 1.5px solid #000;">
                  Period: <span style="font-size: 12.5px;">${periodString}</span>
                </td>
              </tr>
            </table>

            <table style="width: 100%; border-collapse: collapse; border: 1.5px solid #000; border-top: none;">
              <thead>
                <tr style="background-color: #ffffff;">
                  <th style="border: 1px solid #000; padding: 5px; width: 12%; text-align: center;">Date</th>
                  <th style="border: 1px solid #000; padding: 5px; width: 14%; text-align: center;">Start Reading</th>
                  <th style="border: 1px solid #000; padding: 5px; width: 14%; text-align: center;">End Reading</th>
                  <th style="border: 1px solid #000; padding: 5px; width: 14%; text-align: center;">Distance in KM</th>
                  <th style="border: 1px solid #000; padding: 5px; width: 30%; text-align: left;">Location</th>
                  <th style="border: 1px solid #000; padding: 5px; width: 16%; text-align: left;">Fuel/Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${travelRowsHtml}
                <!-- Total summary row -->
                <tr style="font-weight: bold;">
                  <td style="border: 1px solid #000; padding: 6px; text-align: center;" colspan="3">Total</td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: center; font-size: 12px;">${Math.round(totalOdoKm)}</td>
                  <td style="border: 1px solid #000; padding: 6px;"></td>
                  <td style="border: 1px solid #000; padding: 6px; text-align: left; font-size: 11.5px;">Total Fuel: Rs.${totalFuelAmount.toFixed(2)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ====================================================================== -->
          <!-- PAGE 2: LOCAL CONVEYANCE EXPENSES SHEET (Exact Match to Sample 2)     -->
          <!-- ====================================================================== -->
          <div class="report-page page-break">
            <table style="width: 100%; border: 1.5px solid #000;">
              <!-- COMPANY HEADER -->
              <tr>
                <td colspan="6" class="title-lg">INDUSTRIAL SYSTEMS LLP</td>
              </tr>
              <tr>
                <td colspan="6" class="title-sm">KAY M PLAZA,3RD FLOOR, G.S.ROAD, GANESHGURI, NEAR KAR BHAWAN, GHY -06</td>
              </tr>
              <tr>
                <td colspan="6" class="title-md">LOCAL CONVEYANCE EXPENSES SHEET</td>
              </tr>
              
              <!-- EMPLOYEE & MONTH -->
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

              <!-- EXPENSE ROWS -->
              ${expenseRowsHtml}

              <!-- NOTES & VEHICLE MILEAGE BOX -->
              <tr>
                <td class="font-bold">Note:</td>
                <td class="font-bold">${vehicleDetails}</td>
                <td class="font-bold">Own Bike</td>
                <td></td>
                <td colspan="2" rowspan="6" style="vertical-align: top; padding: 5px 6px; font-weight: bold; font-size: 11px; line-height: 1.55;">
                  <div>${curMonthNameShort}- Km-${Math.round(totalOdoKm)}, Avg/Mileage-${odoMileage}-S</div>
                  <div style="padding-left: 28px; color: #0284c7;">App km - ${totalAppKm > 0 ? `${Math.round(totalAppKm)}` : 'no data'}</div>
                  ${prevMileage ? `<div>${prevMonthNameShort}- Km-${Math.round(prevTotalOdoKm)}, Avg/Mileage-${prevMileage}</div>` : ''}
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

            <!-- SIGNATURE AUDIT BLOCKS -->
            <div class="signatures-container">
              <div class="sign-col">
                Verified by TL<br/>
                <span style="font-size: 9.5px; font-weight: normal; color: #555;">(Checked Odometer & GPS)</span>
              </div>
              <div class="sign-col">
                Verified by Manager<br/>
                <span style="font-size: 9.5px; font-weight: normal; color: #555;">(Checked Tour & Operations)</span>
              </div>
              <div class="sign-col">
                Approved by MD<br/>
                <span style="font-size: 9.5px; font-weight: normal; color: #555;">(Sanctioned for Payment)</span>
              </div>
            </div>
          </div>

          <!-- ====================================================================== -->
          <!-- PAGE 3+: BILLS & RECEIPTS GALLERY (2x2 Grid with Captions)              -->
          <!-- ====================================================================== -->
          ${billPagesHtml}

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
