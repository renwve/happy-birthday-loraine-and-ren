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
  return google.drive({
    version: 'v3',
    auth: getOAuthClient(),
  });
}

function escapeDriveQueryString(value: string) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

/**
 * Find or create the guest's folder.
 */
export async function getOrCreateAttendeeFolder(
  attendee: string
) {
  const parentId =
    process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!parentId) {
    throw new Error(
      'GOOGLE_DRIVE_FOLDER_ID is missing.'
    );
  }

  const folderName = attendee.trim();

  if (!folderName) {
    throw new Error(
      'Attendee name is missing.'
    );
  }

  const api = drive();

  const search = await api.files.list({
    q: [
      `'${parentId}' in parents`,
      `name = '${escapeDriveQueryString(folderName)}'`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      `trashed = false`,
    ].join(' and '),

    fields: 'files(id,name)',
    spaces: 'drive',
    pageSize: 1,
  });

  const existing = search.data.files?.[0];

  if (existing?.id) {
    return {
      id: existing.id,
      name: existing.name ?? folderName,
    };
  }

  const created = await api.files.create({
    requestBody: {
      name: folderName,
      mimeType:
        'application/vnd.google-apps.folder',
      parents: [parentId],
    },

    fields: 'id,name',
  });

  if (!created.data.id) {
    throw new Error(
      `Could not create Google Drive folder for ${folderName}.`
    );
  }

  return {
    id: created.data.id,
    name:
      created.data.name ?? folderName,
  };
}

/**
 * Create one album folder inside a guest folder.
 */
export async function createAlbumFolder(
  attendee: string,
  albumId: string
) {
  const attendeeFolder =
    await getOrCreateAttendeeFolder(attendee);

  const api = drive();

  const albumName = `Album ${albumId}`;

  const created = await api.files.create({
    requestBody: {
      name: albumName,
      mimeType:
        'application/vnd.google-apps.folder',
      parents: [attendeeFolder.id],
    },

    fields: 'id,name',
  });

  if (!created.data.id) {
    throw new Error(
      'Google Drive could not create the album folder.'
    );
  }

  return {
    id: created.data.id,
    name:
      created.data.name ?? albumName,
    attendeeFolderId:
      attendeeFolder.id,
  };
}

/**
 * Upload one image or video into an album folder.
 */
export async function uploadToDrive(
  file: File,
  attendee: string,
  albumFolderId: string
) {
  if (!albumFolderId) {
    throw new Error(
      'Album folder is missing.'
    );
  }

  if (!file.type.startsWith('image/') &&
      !file.type.startsWith('video/')) {
    throw new Error(
      `"${file.name}" is not an image or video.`
    );
  }

  const api = drive();

  const buffer = Buffer.from(
    await file.arrayBuffer()
  );

  const safe = file.name.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );

  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const name =
    `${attendee} - ${stamp} - ${safe}`;

  try {
    const { data } =
      await api.files.create({
        requestBody: {
          name,
          parents: [albumFolderId],
          mimeType:
            file.type ||
            'application/octet-stream',
        },

        media: {
          mimeType:
            file.type ||
            'application/octet-stream',

          body: Readable.from(buffer),
        },

        fields:
          'id,name,webViewLink,webContentLink',
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

      contentUrl:
        data.webContentLink ??
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
  if (!fileId) {
    throw new Error(
      'Google Drive file ID is missing.'
    );
  }

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