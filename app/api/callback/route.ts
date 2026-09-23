import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';

export const runtime = 'nodejs';

export async function GET(
  request: NextRequest
) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return new NextResponse(
      'Google OAuth environment variables are missing.',
      { status: 500 }
    );
  }

  const code =
    request.nextUrl.searchParams.get('code');

  const returnedState =
    request.nextUrl.searchParams.get('state');

  const savedState =
    request.cookies.get(
      'google_oauth_state'
    )?.value;

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

  const oauth2Client =
    new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

  try {
    const { tokens } =
      await oauth2Client.getToken(code);

    if (!tokens.refresh_token) {
      return new NextResponse(
        `
          <h1>No refresh token received</h1>
          <p>
            Google did not return a refresh token.
          </p>
          <p>
            Revoke this app's access in your Google
            account and try connecting again.
          </p>
        `,
        {
          status: 400,
          headers: {
            'content-type': 'text/html',
          },
        }
      );
    }

    const refreshToken =
      tokens.refresh_token;

    return new NextResponse(
      `
      <!doctype html>
      <html>
        <head>
          <title>Google Drive Connected</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 60px auto;
              padding: 20px;
              line-height: 1.6;
            }

            code {
              display: block;
              padding: 16px;
              background: #f4f4f4;
              border-radius: 8px;
              word-break: break-all;
            }

            .warning {
              color: #a33;
              font-weight: bold;
            }
          </style>
        </head>

        <body>
          <h1>Google Drive connected ♡</h1>

          <p>
            Copy the refresh token below.
          </p>

          <code>${refreshToken}</code>

          <p>
            Put it into your
            <strong>.env.local</strong> file as:
          </p>

          <code>
GOOGLE_REFRESH_TOKEN=${refreshToken}
          </code>

          <p class="warning">
            Keep this token private. Do not put it
            into React/browser code or commit it
            to GitHub.
          </p>

          <p>
            After adding it to .env.local,
            restart your Next.js server.
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

    return new NextResponse(
      `
      <h1>Google OAuth failed</h1>
      <pre>${escapeHtml(
        error?.response?.data?.error_description ||
          error?.message ||
          'Unknown error'
      )}</pre>
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

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}