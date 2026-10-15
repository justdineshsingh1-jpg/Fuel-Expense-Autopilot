import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export const dynamic = 'force-dynamic';

const CONFIG_PATH = 'config/fuel_settings.json';
const DEFAULT_CONFIG = {
  fuel_price: 106.0,
  conveyance_rate_km: 3.5,
  updated_at: new Date().toISOString(),
  updated_by: 'System Administrator',
  history: [
    {
      price: 106.0,
      effective_date: '2026-08-01',
      updated_by: 'Initial Setup'
    }
  ]
};

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin.storage
      .from('fuel-receipts')
      .download(CONFIG_PATH);

    if (error || !data) {
      // If file doesn't exist, return default configuration
      return NextResponse.json(DEFAULT_CONFIG);
    }

    const text = await data.text();
    const config = JSON.parse(text);
    return NextResponse.json(config);
  } catch (err: any) {
    return NextResponse.json(DEFAULT_CONFIG);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const newPrice = Number(body.fuel_price);
    const newConveyanceRate = body.conveyance_rate_km !== undefined ? Number(body.conveyance_rate_km) : 3.5;
    const updatedBy = body.updated_by || 'Admin';

    if (isNaN(newPrice) || newPrice <= 0) {
      return NextResponse.json({ error: 'Invalid fuel price. Must be a positive number.' }, { status: 400 });
    }

    // Read current config to append to history
    let currentConfig = { ...DEFAULT_CONFIG };
    try {
      const { data } = await supabaseAdmin.storage
        .from('fuel-receipts')
        .download(CONFIG_PATH);
      if (data) {
        const text = await data.text();
        currentConfig = JSON.parse(text);
      }
    } catch (readErr) {
      // Use default as base
    }

    const history = Array.isArray(currentConfig.history) ? currentConfig.history : [];
    
    // Add current price to history if it changed
    if (currentConfig.fuel_price !== newPrice) {
      history.unshift({
        price: currentConfig.fuel_price,
        effective_date: currentConfig.updated_at ? currentConfig.updated_at.split('T')[0] : new Date().toISOString().split('T')[0],
        updated_by: currentConfig.updated_by || 'Admin'
      });
    }

    const updatedConfig = {
      fuel_price: Number(newPrice.toFixed(2)),
      conveyance_rate_km: Number(newConveyanceRate.toFixed(2)),
      updated_at: new Date().toISOString(),
      updated_by: updatedBy,
      history: history.slice(0, 20) // Keep last 20 price changes
    };

    const { error: uploadErr } = await supabaseAdmin.storage
      .from('fuel-receipts')
      .upload(CONFIG_PATH, JSON.stringify(updatedConfig, null, 2), {
        contentType: 'application/json',
        upsert: true
      });

    if (uploadErr) throw uploadErr;

    return NextResponse.json({
      success: true,
      message: `Petrol benchmark rate successfully updated to ₹${newPrice.toFixed(2)}/L`,
      config: updatedConfig
    });

  } catch (err: any) {
    console.error("Fuel price update error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
