import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    const { data, error } = await supabaseAdmin.from('trip_logs').select('*').order('created_at', { ascending: false });
    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // SMART UPSERT LOGIC TO BYPASS SCHEMA CONSTRAINTS
    if (body.approval_status === 'active') {
      // CHECK-IN: Satisfy NOT NULL constraints by duplicating start values
      body.end_reading = body.start_reading;
      body.end_odometer_image_url = body.start_odometer_image_url;
      body.end_capture_timestamp = body.start_capture_timestamp;
      
      const { data, error } = await supabaseAdmin.from('trip_logs').insert([body]).select();
      if (error) throw error;
      return NextResponse.json(data[0]);
      
    } else if (body.approval_status === 'completed' || body.approval_status === 'pending') {
      // CHECK-OUT: Find the active trip for this user and UPDATE it
      const { data: activeTrips, error: fetchErr } = await supabaseAdmin
        .from('trip_logs')
        .select('id')
        .eq('user_id', body.user_id)
        .order('created_at', { ascending: false })
        .limit(1);
        
      if (fetchErr) throw fetchErr;
      
      let tripId = activeTrips && activeTrips.length > 0 ? activeTrips[0].id : null;

      // 1. Calculate Claimed Distance
      const claimedDistance = Number(body.end_reading) - Number(body.start_reading || body.end_reading);
      
      let osrmDistanceKm = 0;
      let variancePercent = 0;
      const fraudFlags: any[] = [];

      // 2. Fetch OSRM Road Distance if waypoints exist
      if (body.waypoints && body.waypoints.length >= 2) {
        // OSRM coordinates format: {lon},{lat};{lon},{lat}
        const coordsString = body.waypoints
          .map((pt: any) => `${pt.lng},${pt.lat}`)
          .join(';');

        const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=false`;
        try {
          const osrmRes = await fetch(osrmUrl);
          const osrmData = await osrmRes.json();

          if (osrmData.code === 'Ok' && osrmData.routes?.length > 0) {
            // OSRM returns distance in meters; convert to KM
            const distanceMeters = osrmData.routes[0].distance;
            osrmDistanceKm = Number((distanceMeters / 1000).toFixed(2));

            // 3. Compute Variance Percentage
            if (osrmDistanceKm > 0) {
              variancePercent = Number(
                (((claimedDistance - osrmDistanceKm) / osrmDistanceKm) * 100).toFixed(2)
              );
            }

            // 4. Fraud Flag Rules
            if (variancePercent > 10) {
              fraudFlags.push({
                id: Date.now().toString(),
                type: 'HIGH_ROUTE_VARIANCE',
                severity: variancePercent > 25 ? 'CRITICAL' : 'HIGH',
                description: `Claimed odometer (${claimedDistance} KM) exceeds map route (${osrmDistanceKm} KM) by ${variancePercent}%.`
              });
            }
          }
        } catch (e) {
          console.error("OSRM Error:", e);
        }
      }

      // Secondary Check: Verify Fuel Bill OCR against claimed fuel amount
      if (body.fuel_amount > 0 && body.ocr_data?.detected_amount) {
        const amountDiff = Math.abs(Number(body.fuel_amount) - Number(body.ocr_data.detected_amount));
        if (amountDiff > 5) { // Allowance for minor rounding
          fraudFlags.push({
            id: Date.now().toString() + '1',
            type: 'OCR_AMOUNT_MISMATCH',
            severity: 'HIGH',
            description: `Claimed ₹${body.fuel_amount}, but slip OCR scanned ₹${body.ocr_data.detected_amount}.`
          });
        }
      }

      const updateData = {
        ...body,
        osrm_calculated_km: osrmDistanceKm,
        variance_percent: variancePercent,
        fraud_flags: fraudFlags,
        distance_km: claimedDistance > 0 ? claimedDistance : 0,
        approval_status: 'pending'
      };
      
      // Ensure we don't send columns that might not exist yet if they didn't run DDL
      // The user provided the DDL, assuming they will run it. 

      if (tripId) {
        const { data, error } = await supabaseAdmin
          .from('trip_logs')
          .update(updateData)
          .eq('id', tripId)
          .select();
        if (error) throw error;
        return NextResponse.json(data[0]);
      } else {
        updateData.start_reading = updateData.start_reading || updateData.end_reading;
        updateData.start_odometer_image_url = updateData.start_odometer_image_url || updateData.end_odometer_image_url;
        updateData.start_capture_timestamp = updateData.start_capture_timestamp || updateData.end_capture_timestamp;
        
        const { data, error } = await supabaseAdmin.from('trip_logs').insert([updateData]).select();
        if (error) throw error;
        return NextResponse.json(data[0]);
      }
    }
    
    // Default fallback
    const { data, error } = await supabaseAdmin.from('trip_logs').insert([body]).select();
    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err: any) {
    console.error("Trip API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
