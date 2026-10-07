import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ detail: "No file" }, { status: 400 });

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileName = `${Date.now()}_${file.name}`;
    
    const { data, error } = await supabaseAdmin.storage
      .from('fuel-receipts')
      .upload(`uploads/${fileName}`, buffer, {
        contentType: file.type,
        upsert: false
      });

    if (error) throw error;

    const { data: publicUrlData } = supabaseAdmin.storage.from('fuel-receipts').getPublicUrl(`uploads/${fileName}`);

    return NextResponse.json({ url: publicUrlData.publicUrl });
  } catch (e: any) {
    return NextResponse.json({ detail: e.message }, { status: 500 });
  }
}
