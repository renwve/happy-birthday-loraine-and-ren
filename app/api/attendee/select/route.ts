import { NextResponse } from 'next/server';
import { ATTENDEES, type AttendeeName } from '@/lib/attendees';
import { attendeeCookieName, makeAttendeeToken } from '@/lib/attendee-cookie';
import { supabaseAdmin } from '@/lib/supabase-admin';

export async function POST(request: Request) {
  try {
    const body = await request.json() as { name?: string };
    const name = body.name;
    if (!name || !ATTENDEES.includes(name as AttendeeName)) return NextResponse.json({ error: 'Invalid attendee.' }, { status: 400 });
    const db = supabaseAdmin();
    const { data, error } = await db.from('attendees').select('id,name').eq('name', name).single();
    if (error || !data) return NextResponse.json({ error: 'Attendee is not configured in Supabase.' }, { status: 500 });
    const response = NextResponse.json({ ok: true, attendee: data });
    response.cookies.set(attendeeCookieName, makeAttendeeToken(name as AttendeeName), {
      httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 30,
    });
    return response;
  } catch {
    return NextResponse.json({ error: 'Could not select attendee.' }, { status: 500 });
  }
}