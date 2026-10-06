import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    let query = supabaseAdmin
      .from('trip_logs')
      .select('*, users (full_name, employee_code, department)')
      .order('created_at', { ascending: false });
      
    if (id) {
      query = query.eq('id', id);
    }

    const { data, error } = await query;
    if (error) throw error;
    
    return NextResponse.json(id ? (data[0] || null) : data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // SMART UPSERT LOGIC TO BYPASS SCHEMA CONSTRAINTS
    if (body.approval_status === 'active') {
      
      // If this is an EXPENSE submission during an active trip, update the trip row instead of creating a new check-in
      if (!body.start_reading && (body.fuel_amount || body.misc_amount)) {
         const { data: activeTrips, error: fetchErr } = await supabaseAdmin
          .from('trip_logs')
          .select('id')
          .eq('user_id', body.user_id)
          .eq('approval_status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
          
         if (!fetchErr && activeTrips && activeTrips.length > 0) {
            const { data, error } = await supabaseAdmin
              .from('trip_logs')
              .update({
                fuel_amount: body.fuel_amount,
                fuel_liters: body.fuel_liters,
                fuel_bill_url: body.fuel_bill_url,
                misc_amount: body.misc_amount,
                misc_particulars: body.misc_particulars,
                misc_bill_url: body.misc_bill_url
              })
              .eq('id', activeTrips[0].id)
              .select();
            if (error) throw error;
            return NextResponse.json(data[0]);
         }
      }

      // STANDARD CHECK-IN: Satisfy NOT NULL constraints by duplicating start values
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

      // 2. SEGMENTED VALIDATION (GUWAHATI ADAPTIVE ENGINE)
      let transitKm = 0;
      let surveyKm = 0;

      if (body.waypoints && body.waypoints.length >= 2) {
        
        // Split waypoints into contiguous segments based on mode
        const transitPoints = body.waypoints.filter((w: any) => w.mode === 'transit' || !w.mode);
        const surveyPoints = body.waypoints.filter((w: any) => w.mode === 'survey');

        // A. TRANSIT LEG -> OSRM Mapping
        if (transitPoints.length >= 2) {
          // OSRM coordinates format: {lon},{lat};{lon},{lat}
          // Note: Standard OSRM URL max length is ~8000 chars. For long trips, chunking is needed.
          // For now, we take up to 200 sparse points to prevent URL length crashes.
          const sparseTransit = transitPoints.filter((_: any, i: number) => i % Math.ceil(transitPoints.length / 150) === 0);
          const coordsString = sparseTransit.map((pt: any) => `${pt.lng},${pt.lat}`).join(';');
          
          try {
            const osrmUrl = `https://router.project-osrm.org/route/v1/driving/${coordsString}?overview=false`;
            const osrmRes = await fetch(osrmUrl);
            const osrmData = await osrmRes.json();
            if (osrmData.code === 'Ok' && osrmData.routes?.length > 0) {
              transitKm = Number((osrmData.routes[0].distance / 1000).toFixed(2));
            }
          } catch (e) {
            console.error("OSRM Transit Error:", e);
          }
        }

        // B. SURVEY CLUSTER -> Haversine Accumulation
        if (surveyPoints.length >= 2) {
          const R = 6371; // km
          let rawDistance = 0;
          for (let i = 1; i < surveyPoints.length; i++) {
            const p1 = surveyPoints[i-1];
            const p2 = surveyPoints[i];
            const dLat = (p2.lat - p1.lat) * Math.PI / 180;
            const dLon = (p2.lng - p1.lng) * Math.PI / 180;
            const a = 
              Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(p1.lat * Math.PI / 180) * Math.cos(p2.lat * Math.PI / 180) * 
              Math.sin(dLon/2) * Math.sin(dLon/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            rawDistance += R * c;
          }
          surveyKm = Number(rawDistance.toFixed(2));
        }

        osrmDistanceKm = transitKm + surveyKm; // Total Validated Distance

        // 3. Compute Variance Percentage (18% Guwahati Buffer)
        if (osrmDistanceKm > 0) {
          variancePercent = Number(
            (((claimedDistance - osrmDistanceKm) / osrmDistanceKm) * 100).toFixed(2)
          );
        }

        // 4. Fraud Flag Rules (<= 18% is CLEAN)
        if (variancePercent > 18) {
          fraudFlags.push({
            id: Date.now().toString(),
            type: 'HIGH_ROUTE_VARIANCE',
            severity: variancePercent > 30 ? 'CRITICAL' : 'HIGH',
            description: `Claimed (${claimedDistance} KM) exceeds map route (${osrmDistanceKm} KM) by ${variancePercent}%. [Transit: ${transitKm} KM, Survey: ${surveyKm} KM]`
          });
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
        transit_km: transitKm,
        survey_cluster_km: surveyKm,
        variance_percent: variancePercent,
        fraud_flags: fraudFlags,
        has_anomalies: fraudFlags.length > 0, // 18% Buffer Check explicitly flagged here
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
