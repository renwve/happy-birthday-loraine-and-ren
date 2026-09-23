import { google } from 'googleapis';
import { Readable } from 'node:stream';

function drive() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (!email || !key) throw new Error('Missing Google Drive service-account credentials.');
  const auth = new google.auth.JWT({ email, key, scopes: ['https://www.googleapis.com/auth/drive'] });
  return google.drive({ version: 'v3', auth });
}

export async function uploadToDrive(file: File, attendee: string) {
  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!folderId) throw new Error('GOOGLE_DRIVE_FOLDER_ID is missing.');
  const api = drive();
  const buffer = Buffer.from(await file.arrayBuffer());
  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const name = `${attendee} - ${stamp} - ${safe}`;
  const { data } = await api.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: file.type || 'image/jpeg', body: Readable.from(buffer) },
    fields: 'id,name,webViewLink,webContentLink',
  });
  if (!data.id) throw new Error('Google Drive did not return a file ID.');
  return {
    id: data.id,
    name: data.name ?? name,
    url: data.webViewLink ?? `https://drive.google.com/file/d/${data.id}/view`,
  };
}

export async function deleteFromDrive(fileId: string) {
  await drive().files.delete({ fileId });
}