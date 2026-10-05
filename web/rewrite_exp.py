import os

path = r"c:\Users\MIS\OneDrive\Fuel Expense Autopilot\web\src\app\api\expenses\route.ts"
content = """import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function GET(request: Request) {
  try {
    // Read from storage instead of table
    const { data: files, error } = await supabaseAdmin.storage.from('fuel-receipts').list('expenses');
    if (error || !files) return NextResponse.json([]);
    
    const expenses = [];
    for (const file of files) {
      if (file.name.endsWith('.json')) {
        const { data } = await supabaseAdmin.storage.from('fuel-receipts').download(`expenses/${file.name}`);
        if (data) {
          const text = await data.text();
          try { expenses.push(JSON.parse(text)); } catch(e) {}
        }
      }
    }
    expenses.sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return NextResponse.json(expenses);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    body.id = 'EXP-' + Date.now();
    body.created_at = new Date().toISOString();
    
    const filename = `expenses/${body.agent_id}_${Date.now()}.json`;
    const { data, error } = await supabaseAdmin.storage.from('fuel-receipts').upload(filename, JSON.stringify(body), {
      contentType: 'application/json',
      upsert: true
    });
    if (error) throw error;
    return NextResponse.json(body);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
"""

with open(path, "w", encoding="utf8") as f:
    f.write(content)
print("Rewrote Expenses API to use Storage")
