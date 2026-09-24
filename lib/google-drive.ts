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

/**
 * Find an attendee's folder inside the main Google Drive folder.
 *
 * If the folder doesn't exist yet, create it.
 */
async function getOrCreateAttendeeFolder(attendee: string) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is missing.');
  }

  const api = drive();

  // Clean the attendee name so it can safely be used
  // as a Google Drive folder name.
  const folderName = attendee.trim();

  if (!folderName) {
    throw new Error('Attendee name is missing.');
  }

  /*
   * Search for an existing folder with this attendee name
   * directly inside the main site folder.
   *
   * mimeType = Google Drive folder
   * trashed = false = don't use deleted folders
   */
  const searchResponse = await api.files.list({
    q: [
      `'${folderId}' in parents`,
      `name = '${escapeDriveQueryString(folderName)}'`,
      `mimeType = 'application/vnd.google-apps.folder'`,
      `trashed = false`,
    ].join(' and '),

    fields: 'files(id,name,parents)',
    spaces: 'drive',
    pageSize: 1,
  });

  const existingFolder = searchResponse.data.files?.[0];

  if (existingFolder?.id) {
    return {
      id: existingFolder.id,
      name: existingFolder.name ?? folderName,
    };
  }

  /*
   * Folder doesn't exist, so create it.
   */
  const createdFolder = await api.files.create({
    requestBody: {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [folderId],
    },

    fields: 'id,name',
  });

  if (!createdFolder.data.id) {
    throw new Error(
      `Could not create Google Drive folder for ${folderName}.`
    );
  }

  return {
    id: createdFolder.data.id,
    name: createdFolder.data.name ?? folderName,
  };
}

/**
 * Escape a string before putting it into a Google Drive
 * files.list query.
 */
function escapeDriveQueryString(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

/**
 * Upload one photo to the selected attendee's Google Drive folder.
 *
 * The attendee folder lives inside GOOGLE_DRIVE_FOLDER_ID.
 */
export async function uploadToDrive(
  file: File,
  attendee: string
) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (!folderId) {
    throw new Error('GOOGLE_DRIVE_FOLDER_ID is missing.');
  }

  if (!attendee?.trim()) {
    throw new Error('Attendee is missing.');
  }

  const api = drive();

  /*
   * Get the attendee's subfolder.
   *
   * Example:
   *
   * Main Folder
   *   ├── Loraine
   *   ├── Ren
   *   └── Guest 3
   */
  const attendeeFolder = await getOrCreateAttendeeFolder(attendee);

  const buffer = Buffer.from(await file.arrayBuffer());

  /*
   * Clean the original filename.
   */
  const safe = file.name.replace(
    /[^a-zA-Z0-9._-]/g,
    '_'
  );

  /*
   * Timestamp prevents two uploads with the same filename
   * from accidentally having the same name.
   */
  const stamp = new Date()
    .toISOString()
    .replace(/[:.]/g, '-');

  const name = `${attendee} - ${stamp} - ${safe}`;

  try {
    const { data } = await api.files.create({
      requestBody: {
        name,

        /*
         * IMPORTANT:
         * This is now the attendee subfolder,
         * NOT the main site folder.
         */
        parents: [attendeeFolder.id],

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

      folderId: attendeeFolder.id,
      folderName: attendeeFolder.name,
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

/**
 * Delete a photo from Google Drive.
 */
export async function deleteFromDrive(
  fileId: string
) {
  if (!fileId) {
    throw new Error('Google Drive file ID is missing.');
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