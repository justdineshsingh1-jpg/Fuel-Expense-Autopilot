import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const ALLOWED_COLUMNS = new Set([
  'id',
  'user_id',
  'log_date',
  'start_reading',
  'start_odometer_image_url',
  'start_reading_ocr',
  'start_capture_timestamp',
  'start_lat',
  'start_lng',
  'end_reading',
  'end_odometer_image_url',
  'end_reading_ocr',
  'end_capture_timestamp',
  'end_lat',
  'end_lng',
  'distance_km',
  'fuel_amount',
  'fuel_liters',
  'fuel_bill_url',
  'misc_amount',
  'misc_particulars',
  'misc_bill_url',
  'ocr_data',
  'osrm_distance_km',
  'osrm_calculated_km',
  'transit_km',
  'survey_cluster_km',
  'variance_percent',
  'fraud_flags',
  'has_anomalies',
  'approval_status',
  'submitted_at',
  'created_at',
  'updated_at'
]);

function sanitize(data: Record<string, any>) {
  const clean: Record<string, any> = {};
  for (const key of Object.keys(data)) {
    if (ALLOWED_COLUMNS.has(key)) {
      clean[key] = data[key];
    }
  }
  return clean;
}

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
    const tripTargetId = body.trip_id || body.id;
    
    // ----------------------------------------------------
    // 1. ACTIVE SHIFT LOGIC (Start Shift or Live Expense)
    // ----------------------------------------------------
    if (body.approval_status === 'active') {
      
      // If this is an EXPENSE submission during an active trip, update the trip row
      if (!body.start_reading && (body.fuel_amount || body.misc_amount)) {
        let activeQuery = supabaseAdmin
          .from('trip_logs')
          .select('id')
          .eq('user_id', body.user_id)
          .eq('approval_status', 'active');
          
        if (tripTargetId) {
          activeQuery = activeQuery.eq('id', tripTargetId);
        } else {
          activeQuery = activeQuery.order('created_at', { ascending: false }).limit(1);
        }
          
        const { data: activeTrips, error: fetchErr } = await activeQuery;
          
        if (!fetchErr && activeTrips && activeTrips.length > 0) {
          const updateExpenseData: Record<string, any> = {
            updated_at: new Date().toISOString()
          };
          if (body.fuel_amount !== undefined) updateExpenseData.fuel_amount = body.fuel_amount;
          if (body.fuel_liters !== undefined) updateExpenseData.fuel_liters = body.fuel_liters;
          if (body.fuel_bill_url !== undefined) updateExpenseData.fuel_bill_url = body.fuel_bill_url;
          if (body.misc_amount !== undefined) updateExpenseData.misc_amount = body.misc_amount;
          if (body.misc_particulars !== undefined) updateExpenseData.misc_particulars = body.misc_particulars;
          if (body.misc_bill_url !== undefined) updateExpenseData.misc_bill_url = body.misc_bill_url;

          const { data, error } = await supabaseAdmin
            .from('trip_logs')
            .update(sanitize(updateExpenseData))
            .eq('id', activeTrips[0].id)
            .select();
          if (error) throw error;
          return NextResponse.json(data[0]);
        }
      }

      // STANDARD CHECK-IN (START SHIFT): Satisfy NOT NULL constraints by duplicating start values
      const startData: Record<string, any> = {
        ...body,
        log_date: body.log_date || new Date().toISOString().split('T')[0],
        end_reading: body.start_reading,
        end_odometer_image_url: body.start_odometer_image_url,
        end_capture_timestamp: body.start_capture_timestamp || new Date().toISOString(),
        approval_status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabaseAdmin
        .from('trip_logs')
        .insert([sanitize(startData)])
        .select();
      if (error) throw error;
      return NextResponse.json(data[0]);
      
    // ----------------------------------------------------
    // 2. CHECK-OUT LOGIC (END SHIFT)
    // ----------------------------------------------------
    } else if (body.approval_status === 'completed' || body.approval_status === 'pending') {
      
      // Target existing active trip
      let existingTrip: any = null;
      if (tripTargetId) {
        const { data: found } = await supabaseAdmin
          .from('trip_logs')
          .select('*')
          .eq('id', tripTargetId)
          .single();
        existingTrip = found;
      }
      
      if (!existingTrip) {
        const { data: activeTrips } = await supabaseAdmin
          .from('trip_logs')
          .select('*')
          .eq('user_id', body.user_id)
          .eq('approval_status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);
        if (activeTrips && activeTrips.length > 0) {
          existingTrip = activeTrips[0];
        }
      }

      // Fallback: get most recent trip for user if none marked 'active'
      if (!existingTrip) {
        const { data: recentTrips } = await supabaseAdmin
          .from('trip_logs')
          .select('*')
          .eq('user_id', body.user_id)
          .order('created_at', { ascending: false })
          .limit(1);
        if (recentTrips && recentTrips.length > 0) {
          existingTrip = recentTrips[0];
        }
      }

      const startReading = Number(existingTrip?.start_reading || body.start_reading || 0);
      const endReading = Number(body.end_reading || startReading);
      const claimedDistance = endReading > startReading ? Number((endReading - startReading).toFixed(2)) : 0;
      
      let osrmDistanceKm = 0;
      let variancePercent = 0;
      const fraudFlags: any[] = [];
      let transitKm = 0;
      let surveyKm = 0;

      // GPS WAYPOINTS & ROUTE VALIDATION
      if (body.waypoints && body.waypoints.length >= 2) {
        const transitPoints = body.waypoints.filter((w: any) => w.mode === 'transit' || !w.mode);
        const surveyPoints = body.waypoints.filter((w: any) => w.mode === 'survey');

        // A. TRANSIT LEG -> OSRM Mapping
        if (transitPoints.length >= 2) {
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

        osrmDistanceKm = Number((transitKm + surveyKm).toFixed(2));

        if (osrmDistanceKm > 0 && claimedDistance > 0) {
          variancePercent = Number(
            (((claimedDistance - osrmDistanceKm) / osrmDistanceKm) * 100).toFixed(2)
          );
        }

        if (variancePercent > 18) {
          fraudFlags.push({
            id: Date.now().toString(),
            type: 'HIGH_ROUTE_VARIANCE',
            severity: variancePercent > 30 ? 'CRITICAL' : 'HIGH',
            description: `Claimed (${claimedDistance} KM) exceeds map route (${osrmDistanceKm} KM) by ${variancePercent}%. [Transit: ${transitKm} KM, Survey: ${surveyKm} KM]`
          });
        }

        // Save waypoints to Storage bucket for RouteMap rendering
        try {
          const logDate = existingTrip?.log_date || new Date().toISOString().split('T')[0];
          const mapPath = `map_history/${body.user_id}_${logDate}.json`;
          const mapBuffer = Buffer.from(JSON.stringify({ waypoints: body.waypoints }));
          await supabaseAdmin.storage
            .from('fuel-receipts')
            .upload(mapPath, mapBuffer, { contentType: 'application/json', upsert: true });
        } catch (storageErr) {
          console.error("Storage upload error for map_history:", storageErr);
        }
      }

      // Secondary Check: Verify Fuel Bill OCR
      if (body.fuel_amount > 0 && body.ocr_data?.detected_amount) {
        const amountDiff = Math.abs(Number(body.fuel_amount) - Number(body.ocr_data.detected_amount));
        if (amountDiff > 5) {
          fraudFlags.push({
            id: Date.now().toString() + '1',
            type: 'OCR_AMOUNT_MISMATCH',
            severity: 'HIGH',
            description: `Claimed ₹${body.fuel_amount}, but slip OCR scanned ₹${body.ocr_data.detected_amount}.`
          });
        }
      }

      const updateData: Record<string, any> = {
        end_reading: endReading,
        end_odometer_image_url: body.end_odometer_image_url || existingTrip?.end_odometer_image_url,
        end_capture_timestamp: body.end_capture_timestamp || new Date().toISOString(),
        distance_km: claimedDistance,
        osrm_calculated_km: osrmDistanceKm,
        osrm_distance_km: osrmDistanceKm,
        transit_km: transitKm,
        survey_cluster_km: surveyKm,
        variance_percent: variancePercent,
        fraud_flags: fraudFlags,
        has_anomalies: fraudFlags.length > 0,
        approval_status: 'pending',
        submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Only update expense fields if provided in this checkout or preserve existing
      if (body.fuel_amount !== undefined) updateData.fuel_amount = body.fuel_amount;
      if (body.fuel_liters !== undefined) updateData.fuel_liters = body.fuel_liters;
      if (body.fuel_bill_url !== undefined && body.fuel_bill_url !== null) updateData.fuel_bill_url = body.fuel_bill_url;
      if (body.misc_amount !== undefined) updateData.misc_amount = body.misc_amount;
      if (body.misc_bill_url !== undefined && body.misc_bill_url !== null) updateData.misc_bill_url = body.misc_bill_url;
      if (body.misc_particulars !== undefined) updateData.misc_particulars = body.misc_particulars;

      if (existingTrip) {
        // DO NOT overwrite start reading or start image with end values
        const { data, error } = await supabaseAdmin
          .from('trip_logs')
          .update(sanitize(updateData))
          .eq('id', existingTrip.id)
          .select();
        if (error) throw error;
        return NextResponse.json(data[0]);
      } else {
        // Fallback insert if no prior trip existed
        updateData.user_id = body.user_id;
        updateData.log_date = new Date().toISOString().split('T')[0];
        updateData.start_reading = body.start_reading || endReading;
        updateData.start_odometer_image_url = body.start_odometer_image_url || body.end_odometer_image_url;
        updateData.start_capture_timestamp = body.start_capture_timestamp || new Date().toISOString();
        
        const { data, error } = await supabaseAdmin
          .from('trip_logs')
          .insert([sanitize(updateData)])
          .select();
        if (error) throw error;
        return NextResponse.json(data[0]);
      }
    }
    
    // Default fallback
    const { data, error } = await supabaseAdmin
      .from('trip_logs')
      .insert([sanitize(body)])
      .select();
    if (error) throw error;
    return NextResponse.json(data[0]);
  } catch (err: any) {
    console.error("Trip API Error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
