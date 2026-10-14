import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';
import { DELEGATION_LIMITS, VALIDATION_RULES } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      trip_ids, 
      action, 
      comment, 
      actor_role = 'team_leader', 
      actor_name = 'Supervisor',
      actor_id,
      approve_all_clean = false 
    } = body;

    let targetTripIds: string[] = [];

    // -------------------------------------------------------------------------
    // 1. "⚡ 1-Click Approve All Clean Claims"
    // -------------------------------------------------------------------------
    if (approve_all_clean || action === 'clean_pass') {
      // Find all pending/auto_validated trips for review
      let query = supabaseAdmin
        .from('trip_logs')
        .select('*');

      if (actor_role === 'team_leader' || actor_role === 'field_agent') {
        query = query.in('approval_status', ['pending', 'submitted', 'auto_validated']);
      } else if (actor_role === 'manager') {
        query = query.in('approval_status', ['supervisor_approved', 'pending', 'auto_validated']);
      } else if (actor_role === 'managing_director') {
        query = query.in('approval_status', ['manager_approved', 'supervisor_approved', 'pending']);
      } else if (actor_role === 'accounts') {
        query = query.in('approval_status', ['approved', 'md_approved', 'manager_approved']);
      } else {
        query = query.eq('approval_status', 'pending');
      }

      const { data: candidates, error: fetchErr } = await query;
      if (fetchErr) throw fetchErr;

      if (!candidates || candidates.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          message: 'No pending claims available for bulk processing.'
        });
      }

      // Filter only rigorously clean claims
      const cleanTrips = candidates.filter((trip) => {
        const startR = Number(trip.start_reading || 0);
        const endR = Number(trip.end_reading || startR);
        const dist = trip.distance_km !== null ? Number(trip.distance_km) : (endR - startR);
        const variance = Math.abs(Number(trip.variance_percent || 0));
        const flags = trip.fraud_flags || [];

        // Condition 1: Must have non-negative reading & valid distance
        if (endR < startR || dist <= 0 || dist > VALIDATION_RULES.MAX_DAILY_KM) {
          return false;
        }

        // Condition 2: Route variance within limit
        if (variance > VALIDATION_RULES.MAX_ROUTE_VARIANCE_PERCENT) {
          return false;
        }

        // Condition 3: No unresolved fraud flags
        if (Array.isArray(flags) && flags.length > 0) {
          return false;
        }

        // Condition 4: If fuel claimed, bill must be attached
        if (trip.fuel_amount > 0 && !trip.fuel_bill_url) {
          return false;
        }

        // Condition 5: Both odometer photos must exist
        if (!trip.start_odometer_image_url || !trip.end_odometer_image_url) {
          return false;
        }

        // Condition 6: Financial delegation limit check for bulk approval
        const totalAmount = (Number(trip.fuel_amount) || 0) + (Number(trip.misc_amount) || 0);
        if (actor_role === 'team_leader' && totalAmount > DELEGATION_LIMITS.supervisor) {
          // Exceeds supervisor delegation, requires manager approval
          return false;
        }
        if (actor_role === 'manager' && totalAmount > DELEGATION_LIMITS.manager) {
          // Exceeds manager delegation, requires MD approval
          return false;
        }

        return true;
      });

      targetTripIds = cleanTrips.map(t => t.id);

      if (targetTripIds.length === 0) {
        return NextResponse.json({
          success: true,
          count: 0,
          total_candidates: candidates.length,
          message: `All ${candidates.length} pending claims have exceptions or require higher authority review. None were auto-approved.`
        });
      }
    } else {
      if (!trip_ids || !Array.isArray(trip_ids) || trip_ids.length === 0) {
        return NextResponse.json({ error: 'Missing trip_ids' }, { status: 400 });
      }
      targetTripIds = trip_ids;
    }

    // -------------------------------------------------------------------------
    // 2. Determine target approval status based on role and action
    // -------------------------------------------------------------------------
    let targetStatus = 'approved';

    if (action === 'Reject' || action === 'rejected') {
      targetStatus = 'rejected';
    } else if (action === 'Return' || action === 'returned') {
      targetStatus = 'returned';
    } else if (action === 'Flag' || action === 'flagged') {
      targetStatus = 'flagged';
    } else {
      // Approval progression
      if (actor_role === 'team_leader') {
        targetStatus = 'supervisor_approved';
      } else if (actor_role === 'manager') {
        targetStatus = 'manager_approved';
      } else if (actor_role === 'managing_director') {
        targetStatus = 'md_approved';
      } else if (actor_role === 'accounts') {
        targetStatus = 'finance_settled';
      } else {
        targetStatus = 'approved';
      }
    }

    // -------------------------------------------------------------------------
    // 3. Perform batch update in Supabase
    // -------------------------------------------------------------------------
    const nowIso = new Date().toISOString();
    
    const { error: updateErr } = await supabaseAdmin
      .from('trip_logs')
      .update({
        approval_status: targetStatus,
        updated_at: nowIso
      })
      .in('id', targetTripIds);

    if (updateErr) throw updateErr;

    return NextResponse.json({
      success: true,
      count: targetTripIds.length,
      target_status: targetStatus,
      message: `Successfully updated ${targetTripIds.length} claims to "${targetStatus}".`
    });

  } catch (err: any) {
    console.error("Batch Approve Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
