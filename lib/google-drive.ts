import { google } from 'googleapis';
import { Readable } from 'node:stream';

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

  if (!clientId) {
    throw new Error('GOOGLE_CLIENT_ID is missing.');
  }

  if (!clientSecret) {
    throw new Error('GOOGLE_CLIENT_SECRET is missing.');
  }

  if (!redirectUri) {
    throw new Error('GOOGLE_REDIRECT_URI is missing.');
  }

  if (!refreshToken) {
    throw new Error(
      'GOOGLE_REFRESH_TOKEN is missing. Connect your Google Drive first.'
    );
  }

  const auth = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  auth.setCredentials({
    refresh_token: refreshToken,
  });

  return auth;
}

function drive() {
  const auth = getOAuthClient();

  return google.drive({
    version: 'v3',
    auth,
  });
}

export async function uploadToDrive(
  file: File,
  attendee: string
) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is missing.');
  }

  const api = drive();

  const buffer = Buffer.from(await file.arrayBuffer());

  const safe = file.name.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const name = `${attendee} - ${stamp} - ${safe}`;

  try {
    const { data } = await api.files.create({
      requestBody: {
        name,
        parents: [folderId],
        mimeType: file.type || 'image/jpeg',
      },

      media: {
        mimeType: file.type || 'image/jpeg',
        body: Readable.from(buffer),
      },

      fields: 'id,name,webViewLink,webContentLink',
    });

    if (!data.id) {
      throw new Error(
        'Google Drive did not return a file ID.'
      );
    }

    return {
      id: data.id,
      name: data.name ?? name,
      url:
        data.webViewLink ??
        `https://drive.google.com/file/d/${data.id}/view`,
    };
  } catch (error: any) {
    console.error(
      'GOOGLE DRIVE UPLOAD ERROR:',
      error?.response?.data || error
    );

    const googleMessage =
      error?.response?.data?.error?.message ||
      error?.message;

    throw new Error(
      googleMessage
        ? `Google Drive: ${googleMessage}`
        : 'Google Drive upload failed.'
    );
  }
}

export async function deleteFromDrive(
  fileId: string
) {
  try {
    await drive().files.delete({
      fileId,
    });
  } catch (error: any) {
    console.error(
      'GOOGLE DRIVE DELETE ERROR:',
      error?.response?.data || error
    );

    const googleMessage =
      error?.response?.data?.error?.message ||
      error?.message;

    throw new Error(
      googleMessage
        ? `Google Drive: ${googleMessage}`
        : 'Google Drive delete failed.'
    );
  }
}