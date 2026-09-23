import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import crypto from 'node:crypto';

export const runtime = 'nodejs';

export async function GET() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return NextResponse.json(
      {
        error:
          'Google OAuth environment variables are missing.',
      },
      { status: 500 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  const state = crypto
    .randomBytes(32)
    .toString('hex');

  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [
      'https://www.googleapis.com/auth/drive',
    ],
    state,
  });

  const response = NextResponse.redirect(authUrl);

  response.cookies.set(
    'google_oauth_state',
    state,
    {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 10 * 60,
      path: '/',
    }
  );

  return response;
}