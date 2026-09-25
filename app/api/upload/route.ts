import { NextResponse } from 'next/server';

import { currentAttendee } from '@/lib/attendee-cookie';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { uploadToDrive } from '@/lib/google-drive';

export const runtime = 'nodejs';

/*
 * IMPORTANT:
 * This is the maximum number of files PER UPLOAD.
 *
 * There is NO total/lifetime limit on how many
 * photos or videos an attendee can add.
 */
const MAX_FILES_PER_UPLOAD = 200;

const MAX_IMAGE_SIZE =
  15 * 1024 * 1024; // 15 MB

const MAX_VIDEO_SIZE =
  200 * 1024 * 1024; // 200 MB

export async function POST(request: Request) {
  try {
    /*
     * The attendee is stored in the attendee cookie.
     */
    const attendee = await currentAttendee();

    if (!attendee) {
      return NextResponse.json(
        {
          error: 'Choose an attendee first.',
        },
        { status: 401 }
      );
    }

    /*
     * Read the multipart form.
     */
    const form = await request.formData();

    /*
     * New uploader:
     *
     * form.append('files', file)
     *
     * This lets the user upload up to 200
     * photos/videos in one upload.
     */
    let files = form
      .getAll('files')
      .filter(
        (value): value is File =>
          value instanceof File
      );

    /*
     * Backwards compatibility with the older
     * single-file uploader.
     */
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
     * Require at least one file.
     */
    if (files.length === 0) {
      return NextResponse.json(
        {
          error:
            'Please choose at least one photo or video.',
        },
        { status: 400 }
      );
    }

    /*
     * 200 IS ONLY THE PER-UPLOAD LIMIT.
     *
     * There is deliberately no check against the
     * number of files already on the wall.
     */
    if (files.length > MAX_FILES_PER_UPLOAD) {
      return NextResponse.json(
        {
          error:
            `You can upload up to ${MAX_FILES_PER_UPLOAD} photos or videos at once.`,
        },
        { status: 400 }
      );
    }

    /*
     * Validate EVERYTHING before uploading anything.
     *
     * This prevents a half-uploaded batch if one
     * of the selected files is invalid.
     */
    for (const file of files) {
      const isImage =
        file.type.startsWith('image/');

      const isVideo =
        file.type.startsWith('video/');

      if (!isImage && !isVideo) {
        return NextResponse.json(
          {
            error:
              `"${file.name}" is not a photo or video.`,
          },
          { status: 400 }
        );
      }

      const maxSize = isVideo
        ? MAX_VIDEO_SIZE
        : MAX_IMAGE_SIZE;

      if (file.size > maxSize) {
        return NextResponse.json(
          {
            error: isVideo
              ? `"${file.name}" is too large. Keep videos under 200 MB.`
              : `"${file.name}" is too large. Keep photos under 15 MB.`,
          },
          { status: 400 }
        );
      }
    }

    /*
     * Find the attendee in Supabase.
     */
    const db = supabaseAdmin();

    const {
      data: person,
      error: personError,
    } = await db
      .from('attendees')
      .select('id')
      .eq('name', attendee)
      .single();

    if (personError || !person) {
      return NextResponse.json(
        {
          error:
            'Attendee is not configured.',
        },
        { status: 500 }
      );
    }

    /*
     * IMPORTANT:
     *
     * There is NO album creation here.
     *
     * Every file is uploaded directly into:
     *
     * Google Drive
     *   └── Main Birthday Folder
     *       └── Loraine
     *           ├── photo.jpg
     *           ├── video.mp4
     *           └── photo2.jpg
     *
     * or:
     *
     *       └── Ren
     *           ├── photo.jpg
     *           └── video.mp4
     */

    const uploaded = [];

    for (const file of files) {
      const driveFile =
        await uploadToDrive(
          file,
          attendee
        );

      uploaded.push({
        driveFile,
        file,
      });
    }

    /*
     * Save every uploaded item to Supabase.
     *
     * NO album_id is created.
     */
    const rows = uploaded.map(
      ({
        driveFile,
        file,
      }) => ({
        attendee_id:
          person.id,

        caption:
          caption || null,

        original_name:
          file.name,

        mime_type:
          file.type,

        media_type:
          file.type.startsWith(
            'video/'
          )
            ? 'video'
            : 'image',

        drive_file_id:
          driveFile.id,

        drive_file_url:
          driveFile.url,
      })
    );

    const {
      data,
      error,
    } = await db
      .from('photos')
      .insert(rows)
      .select('id');

    if (error) {
      console.error(
        'SUPABASE MEDIA INSERT ERROR:',
        error
      );

      return NextResponse.json(
        {
          error:
            'The files reached Google Drive, but their database records could not be saved.',
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      ok: true,

      count:
        uploaded.length,

      attendee,

      photos:
        data ?? [],
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