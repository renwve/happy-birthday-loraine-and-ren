import { NextResponse } from 'next/server';

import { currentAttendee } from '@/lib/attendee-cookie';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { uploadToDrive } from '@/lib/google-drive';

export const runtime = 'nodejs';

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB
const MAX_FILES = 30;

export async function POST(request: Request) {
  try {
    /*
     * Make sure a guest has been selected.
     */
    const attendee = await currentAttendee();

    if (!attendee) {
      return NextResponse.json(
        { error: 'Choose an attendee first.' },
        { status: 401 }
      );
    }

    const form = await request.formData();

    /*
     * The frontend will send:
     *
     * files = photo 1
     * files = photo 2
     * files = photo 3
     *
     * We use getAll() so multiple files are supported.
     *
     * We also accept the old "file" field so the route
     * remains compatible with the previous uploader.
     */
    let files = form
      .getAll('files')
      .filter((value): value is File => value instanceof File);

    if (files.length === 0) {
      const oldFile = form.get('file');

      if (oldFile instanceof File) {
        files = [oldFile];
      }
    }

    const caption = String(
      form.get('caption') ?? ''
    )
      .trim()
      .slice(0, 90);

    /*
     * Make sure at least one photo was supplied.
     */
    if (files.length === 0) {
      return NextResponse.json(
        { error: 'Please choose at least one photo.' },
        { status: 400 }
      );
    }

    /*
     * Protect the endpoint from accidentally receiving
     * an enormous number of files.
     */
    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error: `You can upload up to ${MAX_FILES} photos at once.`,
        },
        { status: 400 }
      );
    }

    /*
     * Validate every file BEFORE uploading anything.
     *
     * This prevents a situation where the first few photos
     * are uploaded and then a later invalid file causes
     * the request to fail.
     */
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return NextResponse.json(
          {
            error: `"${file.name}" is not an image.`,
          },
          { status: 400 }
        );
      }

      if (file.size > MAX_FILE_SIZE) {
        return NextResponse.json(
          {
            error: `"${file.name}" is too large. Please keep every photo under 15 MB.`,
          },
          { status: 400 }
        );
      }
    }

    const db = supabaseAdmin();

    /*
     * Find the attendee in Supabase.
     */
    const { data: person, error: personError } = await db
      .from('attendees')
      .select('id')
      .eq('name', attendee)
      .single();

    if (personError || !person) {
      return NextResponse.json(
        { error: 'Attendee is not configured.' },
        { status: 500 }
      );
    }

    /*
     * Upload the photos one at a time.
     *
     * uploadToDrive() automatically puts each photo
     * into this attendee's Google Drive subfolder.
     */
    const uploadedPhotos: Array<{
      id: string;
      name: string;
      url: string;
      folderId?: string;
      folderName?: string;
      originalName: string;
      caption: string | null;
    }> = [];

    for (const file of files) {
      const uploaded = await uploadToDrive(
        file,
        attendee
      );

      uploadedPhotos.push({
        id: uploaded.id,
        name: uploaded.name,
        url: uploaded.url,
        folderId: uploaded.folderId,
        folderName: uploaded.folderName,
        originalName: file.name,
        caption: caption || null,
      });
    }

    /*
     * Save all uploaded photos in Supabase.
     */
    const rows = uploadedPhotos.map((uploaded, index) => {
      const originalFile = files[index];

      return {
        attendee_id: person.id,
        caption: uploaded.caption,
        original_name: originalFile.name,
        mime_type:
          originalFile.type || 'image/jpeg',
        drive_file_id: uploaded.id,
        drive_file_url: uploaded.url,
      };
    });

    const { data, error } = await db
      .from('photos')
      .insert(rows)
      .select('id');

    if (error) {
      /*
       * At this point the files are already in Drive,
       * but their database records failed.
       *
       * We don't pretend the upload was completely
       * successful.
       */
      console.error(
        'SUPABASE PHOTO INSERT ERROR:',
        error
      );

      return NextResponse.json(
        {
          error:
            uploadedPhotos.length === 1
              ? 'Photo reached Drive but its database record could not be saved.'
              : `${uploadedPhotos.length} photos reached Drive but their database records could not be saved.`,
          uploadedToDrive: uploadedPhotos.map(
            (photo) => ({
              id: photo.id,
              name: photo.name,
            })
          ),
        },
        { status: 500 }
      );
    }

    /*
     * Everything succeeded.
     */
    return NextResponse.json({
      ok: true,
      count: uploadedPhotos.length,
      attendee,
      folder: {
        id: uploadedPhotos[0]?.folderId ?? null,
        name:
          uploadedPhotos[0]?.folderName ??
          attendee,
      },
      photos: data ?? [],
    });
  } catch (error) {
    console.error(
      'UPLOAD ERROR:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Upload failed.',
      },
      { status: 500 }
    );
  }
}