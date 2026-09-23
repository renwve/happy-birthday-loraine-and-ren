import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

export async function GET(request: NextRequest) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return new NextResponse(
      'Google OAuth environment variables are missing.',
      { status: 500 }
    );
  }

  const code = request.nextUrl.searchParams.get('code');
  const returnedState =
    request.nextUrl.searchParams.get('state');

  const savedState =
    request.cookies.get('google_oauth_state')?.value;

  if (!code) {
    return new NextResponse(
      'Google did not return an authorization code.',
      { status: 400 }
    );
  }

  if (
    !returnedState ||
    !savedState ||
    returnedState !== savedState
  ) {
    return new NextResponse(
      'Invalid OAuth state.',
      { status: 400 }
    );
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  try {
    const { tokens } = await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        `
        <!doctype html>
        <html>
          <body style="font-family: sans-serif; padding: 40px;">
            <h1>No refresh token received</h1>
            <p>
              Google did not return a refresh token.
            </p>
            <p>
              Revoke this app's Drive access from your
              Google account and try again.
            </p>
          </body>
        </html>
        `,
        {
          status: 400,
          headers: {
            'content-type': 'text/html',
          },
        }
      );
    }

    const refreshToken = tokens.refresh_token;

    return new NextResponse(
      `
      <!doctype html>
      <html>
        <head>
          <title>Google Drive Connected</title>
        </head>

        <body
          style="
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 60px auto;
            padding: 20px;
            line-height: 1.6;
          "
        >
          <h1>Google Drive connected ♡</h1>

          <p>
            Copy this refresh token into your
            <strong>.env.local</strong> file:
          </p>

          <pre
            style="
              background: #f4f4f4;
              padding: 16px;
              border-radius: 8px;
              white-space: pre-wrap;
              word-break: break-all;
            "
          >${escapeHtml(refreshToken)}</pre>

          <p>
            Add:
          </p>

          <pre
            style="
              background: #f4f4f4;
              padding: 16px;
              border-radius: 8px;
            "
          >GOOGLE_REFRESH_TOKEN=${escapeHtml(refreshToken)}</pre>

          <p>
            Then restart your Next.js server.
          </p>

          <p style="color: #a33; font-weight: bold;">
            Keep this token private. Do not put it in
            frontend code or commit it to GitHub.
          </p>
        </body>
      </html>
      `,
      {
        status: 200,
        headers: {
          'content-type': 'text/html',
        },
      }
    );
  } catch (error: any) {
    console.error(
      'GOOGLE OAUTH CALLBACK ERROR:',
      error?.response?.data || error
    );

    const message =
      error?.response?.data?.error_description ||
      error?.message ||
      'Unknown Google OAuth error.';

    return new NextResponse(
      `
      <!doctype html>
      <html>
        <body style="font-family: sans-serif; padding: 40px;">
          <h1>Google OAuth failed</h1>
          <pre>${escapeHtml(message)}</pre>
        </body>
      </html>
      `,
      {
        status: 500,
        headers: {
          'content-type': 'text/html',
        },
      }
    );
  }
}