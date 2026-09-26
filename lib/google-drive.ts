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
    .replace(
      /\\/g,
      '\\\\'
    )
    .replace(
      /'/g,
      "\\'"
    );
}

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
    id: folderId,

    name:
      created.data.name ??
      attendee,
  };
}

export function safeDriveFileName(
  name: string
) {
  return name
    .replace(
      /[^\w.\- ()]/g,
      '_'
    )
    .replace(
      /\s+/g,
      ' '
    )
    .slice(
      0,
      180
    );
}

/**
 * Uploads a Node.js stream directly to Google Drive.
 *
 * IMPORTANT:
 *
 * The file bytes are streamed.
 * They are NOT converted to base64.
 * They are NOT stored in Supabase.
 *
 * The uploaded Google Drive content therefore
 * contains the same bytes as the original file.
 */
export async function uploadStreamToDrive(
  stream: Readable,
  {
    attendee,
    fileName,
    mimeType,
    fileSize,
  }: {
    attendee: string;
    fileName: string;
    mimeType: string;
    fileSize: number;
  }
) {
  const drive =
    getDrive();

  const folder =
    await getOrCreateAttendeeFolder(
      attendee
    );

  /*
   * Keep the original filename.
   *
   * We sanitize only characters that Google Drive
   * cannot safely accept through our application.
   */
  const finalName =
    safeDriveFileName(
      fileName ||
        'upload'
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
          mimeType ||
          'application/octet-stream',

        body:
          stream,
      },

      fields:
        'id,name,mimeType,size,webViewLink,webContentLink,parents',
    });

  const fileId =
    result.data.id;

  if (!fileId) {
    throw new Error(
      `Google Drive did not return a file ID for "${fileName}".`
    );
  }

  /*
   * Drive reports the size of the bytes it actually
   * received. This gives us a useful integrity check.
   */
  const driveSize =
    Number(
      result.data.size ??
        fileSize
    );

  if (
    Number.isFinite(fileSize) &&
    driveSize !== fileSize
  ) {
    throw new Error(
      `Google Drive received ${driveSize} bytes, but the original file was ${fileSize} bytes.`
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
      mimeType,

    size:
      driveSize,

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
 * Existing server-side File uploader.
 *
 * Kept for compatibility with anything else in the app
 * that might still call uploadToDrive().
 */
export async function uploadToDrive(
  file: File,
  attendee: string
) {
  const stream =
    Readable.fromWeb(
      file.stream() as any
    );

  return uploadStreamToDrive(
    stream,
    {
      attendee,

      fileName:
        file.name ||
        'upload',

      mimeType:
        file.type ||
        'application/octet-stream',

      fileSize:
        file.size,
    }
  );
}

export async function getDriveFile(
  fileId: string
) {
  const drive =
    getDrive();

  const result =
    await drive.files.get({
      fileId,

      fields:
        'id,name,mimeType,size,webViewLink,webContentLink,parents',
    });

  return result.data;
}

export async function deleteFromDrive(
  fileId: string
) {
  const drive =
    getDrive();

  await drive.files.delete({
    fileId,
  });
}