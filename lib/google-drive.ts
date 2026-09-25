import { google } from 'googleapis';
import { Readable } from 'node:stream';

function getDrive() {
  const clientId =
    process.env.GOOGLE_CLIENT_ID;

  const clientSecret =
    process.env.GOOGLE_CLIENT_SECRET;

  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI;

  const refreshToken =
    process.env.GOOGLE_REFRESH_TOKEN;

  if (
    !clientId ||
    !clientSecret ||
    !redirectUri ||
    !refreshToken
  ) {
    throw new Error(
      'Missing Google Drive environment variables.'
    );
  }

  const auth =
    new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

  auth.setCredentials({
    refresh_token:
      refreshToken,
  });

  return google.drive({
    version: 'v3',
    auth,
  });
}

function escapeDriveQuery(
  value: string
) {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'");
}

/**
 * Finds the attendee's folder directly inside
 * the main Google Drive birthday folder.
 *
 * Example:
 *
 * Birthday Photos/
 *   ├── Loraine/
 *   ├── Ren/
 *   ├── Alexa/
 *   └── ...
 *
 * No album folders are created.
 */
export async function getOrCreateAttendeeFolder(
  attendee: string
) {
  const drive =
    getDrive();

  const mainFolderId =
    process.env
      .GOOGLE_DRIVE_FOLDER_ID;

  if (!mainFolderId) {
    throw new Error(
      'GOOGLE_DRIVE_FOLDER_ID is missing.'
    );
  }

  const safeName =
    escapeDriveQuery(
      attendee
    );

  const response =
    await drive.files.list({
      q: [
        `'${mainFolderId}' in parents`,
        `name = '${safeName}'`,
        `mimeType = 'application/vnd.google-apps.folder'`,
        `trashed = false`,
      ].join(' and '),

      fields:
        'files(id,name)',

      pageSize: 1,
    });

  const existing =
    response.data
      .files?.[0];

  if (existing?.id) {
    return {
      id:
        existing.id,

      name:
        existing.name ??
        attendee,
    };
  }

  const created =
    await drive.files.create({
      requestBody: {
        name: attendee,

        mimeType:
          'application/vnd.google-apps.folder',

        parents: [
          mainFolderId,
        ],
      },

      fields:
        'id,name',
    });

  const folderId =
    created.data.id;

  if (!folderId) {
    throw new Error(
      `Could not create the Google Drive folder for ${attendee}.`
    );
  }

  return {
    id:
      folderId,

    name:
      created.data.name ??
      attendee,
  };
}

/**
 * Uploads a photo or video DIRECTLY
 * into the attendee's folder.
 *
 * NO album folder is created.
 */
export async function uploadToDrive(
  file: File,
  attendee: string
) {
  const drive =
    getDrive();

  const folder =
    await getOrCreateAttendeeFolder(
      attendee
    );

  const originalName =
    file.name ||
    'upload';

  const safeName =
    originalName
      .replace(
        /[^\w.\- ()]/g,
        '_'
      )
      .slice(0, 180);

  const timestamp =
    new Date()
      .toISOString()
      .replace(
        /[:.]/g,
        '-'
      );

  const finalName =
    `${attendee} - ${timestamp} - ${safeName}`;

  /*
   * Stream the file instead of manually
   * buffering the entire video.
   */
  const stream =
    Readable.fromWeb(
      file.stream() as any
    );

  const result =
    await drive.files.create({
      requestBody: {
        name:
          finalName,

        parents: [
          folder.id,
        ],
      },

      media: {
        mimeType:
          file.type ||
          'application/octet-stream',

        body:
          stream,
      },

      fields:
        'id,name,mimeType,webViewLink,webContentLink',
    });

  const fileId =
    result.data.id;

  if (!fileId) {
    throw new Error(
      `Google Drive did not return a file ID for "${originalName}".`
    );
  }

  return {
    id:
      fileId,

    name:
      result.data.name ??
      finalName,

    mimeType:
      result.data.mimeType ??
      file.type,

    url:
      result.data.webViewLink ??
      `https://drive.google.com/file/d/${fileId}/view`,

    folderId:
      folder.id,

    folderName:
      folder.name,
  };
}

/**
 * Deletes a photo/video from Google Drive.
 */
export async function deleteFromDrive(
  fileId: string
) {
  const drive =
    getDrive();

  await drive.files.delete({
    fileId,
  });
}