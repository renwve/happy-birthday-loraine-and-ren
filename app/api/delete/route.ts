import { NextResponse } from 'next/server';
import { currentAttendee } from '@/lib/attendee-cookie';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { deleteFromDrive } from '@/lib/google-drive';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const attendee = await currentAttendee();
    if (!attendee) return NextResponse.json({ error: 'Choose an attendee first.' }, { status: 401 });
    const { id } = await request.json() as { id?: string };
    if (!id) return NextResponse.json({ error: 'Missing photo ID.' }, { status: 400 });
    const db = supabaseAdmin();
    const { data: person } = await db.from('attendees').select('id').eq('name', attendee).single();
    if (!person) return NextResponse.json({ error: 'Attendee not found.' }, { status: 404 });
    const { data: photo, error } = await db.from('photos').select('id,drive_file_id,attendee_id').eq('id', id).single();
    if (error || !photo) return NextResponse.json({ error: 'Photo not found.' }, { status: 404 });
    if (photo.attendee_id !== person.id) return NextResponse.json({ error: 'You can only remove your own photos.' }, { status: 403 });
    await deleteFromDrive(photo.drive_file_id);
    const { error: deleteError } = await db.from('photos').delete().eq('id', id);
    if (deleteError) return NextResponse.json({ error: 'Drive file removed, but database cleanup failed.' }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Delete failed.' }, { status: 500 });
  }
}