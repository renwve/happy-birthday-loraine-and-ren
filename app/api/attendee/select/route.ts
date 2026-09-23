import { NextResponse } from 'next/server';
import { ATTENDEES, type AttendeeName } from '@/lib/attendees';
import { attendeeCookieName, makeAttendeeToken } from '@/lib/attendee-cookie';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const name = body?.name;

    if (typeof name !== 'string' || !ATTENDEES.includes(name as AttendeeName)) {
      return NextResponse.json(
        { error: 'Please choose one of the available guests.' },
        { status: 400 }
      );
    }

    const response = NextResponse.json({ ok: true, attendee: name });

    response.cookies.set({
      name: attendeeCookieName,
      value: makeAttendeeToken(name as AttendeeName),
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (error) {
    console.error('Attendee selection error:', error);
    return NextResponse.json(
      { error: 'Could not save your guest selection. Please try again.' },
      { status: 500 }
    );
  }
}
