import { NextResponse } from 'next/server';
import { currentAttendee } from '@/lib/attendee-cookie';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { uploadToDrive } from '@/lib/google-drive';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const attendee = await currentAttendee();
    if (!attendee) return NextResponse.json({ error: 'Choose an attendee first.' }, { status: 401 });
    const form = await request.formData();
    const file = form.get('file');
    const caption = String(form.get('caption') ?? '').trim().slice(0, 90);
    if (!(file instanceof File) || !file.type.startsWith('image/')) return NextResponse.json({ error: 'Please upload an image.' }, { status: 400 });
    if (file.size > 15 * 1024 * 1024) return NextResponse.json({ error: 'That photo is too large. Please keep it under 15 MB.' }, { status: 400 });
    const db = supabaseAdmin();
    const { data: person, error: personError } = await db.from('attendees').select('id').eq('name', attendee).single();
    if (personError || !person) return NextResponse.json({ error: 'Attendee is not configured.' }, { status: 500 });
    const uploaded = await uploadToDrive(file, attendee);
    const { data, error } = await db.from('photos').insert({
      attendee_id: person.id, caption: caption || null, original_name: file.name,
      mime_type: file.type || 'image/jpeg', drive_file_id: uploaded.id, drive_file_url: uploaded.url,
    }).select('id').single();
    if (error) {
      try { const { google } = await import('googleapis'); void google; } catch {}
      return NextResponse.json({ error: 'Photo reached Drive but its database record could not be saved.' }, { status: 500 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Upload failed.' }, { status: 500 });
  }
}