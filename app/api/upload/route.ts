import { NextResponse } from 'next/server';

import { currentAttendee } from '@/lib/attendee-cookie';
import { supabaseAdmin } from '@/lib/supabase-admin';
import {
  createAlbumFolder,
  uploadToDrive,
} from '@/lib/google-drive';

export const runtime = 'nodejs';

const MAX_FILES = 200;

const MAX_IMAGE_SIZE =
  15 * 1024 * 1024;

const MAX_VIDEO_SIZE =
  200 * 1024 * 1024;

export async function POST(
  request: Request
) {
  try {
    const attendee =
      await currentAttendee();

    if (!attendee) {
      return NextResponse.json(
        {
          error:
            'Choose an attendee first.',
        },
        { status: 401 }
      );
    }

    const form =
      await request.formData();

    let files = form
      .getAll('files')
      .filter(
        (value): value is File =>
          value instanceof File
      );

    // Backwards compatibility.
    if (files.length === 0) {
      const oldFile =
        form.get('file');

      if (oldFile instanceof File) {
        files = [oldFile];
      }
    }

    const caption = String(
      form.get('caption') ?? ''
    )
      .trim()
      .slice(0, 90);

    if (files.length === 0) {
      return NextResponse.json(
        {
          error:
            'Please choose at least one photo or video.',
        },
        { status: 400 }
      );
    }

    if (files.length > MAX_FILES) {
      return NextResponse.json(
        {
          error:
            `You can upload up to ${MAX_FILES} items at once.`,
        },
        { status: 400 }
      );
    }

    /*
     * Validate everything BEFORE creating
     * the album or uploading anything.
     */
    for (const file of files) {
      const isImage =
        file.type.startsWith(
          'image/'
        );

      const isVideo =
        file.type.startsWith(
          'video/'
        );

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

    const db =
      supabaseAdmin();

    const {
      data: person,
      error: personError,
    } = await db
      .from('attendees')
      .select('id')
      .eq('name', attendee)
      .single();

    if (
      personError ||
      !person
    ) {
      return NextResponse.json(
        {
          error:
            'Attendee is not configured.',
        },
        { status: 500 }
      );
    }

    /*
     * Create ONE album ID.
     */
    const {
      data: album,
      error: albumError,
    } = await db
      .from('albums')
      .insert({
        attendee_id:
          person.id,

        caption:
          caption || null,
      })
      .select(
        'id'
      )
      .single();

    if (
      albumError ||
      !album
    ) {
      console.error(
        'ALBUM CREATE ERROR:',
        albumError
      );

      return NextResponse.json(
        {
          error:
            'Could not create the album.',
        },
        { status: 500 }
      );
    }

    /*
     * Create the matching Google Drive
     * album folder.
     */
    const driveAlbum =
      await createAlbumFolder(
        attendee,
        album.id
      );

    /*
     * Save the Drive folder ID.
     */
    const {
      error:
        albumFolderError,
    } = await db
      .from('albums')
      .update({
        drive_folder_id:
          driveAlbum.id,
      })
      .eq(
        'id',
        album.id
      );

    if (albumFolderError) {
      console.error(
        'ALBUM FOLDER SAVE ERROR:',
        albumFolderError
      );
    }

    const uploaded = [];

    /*
     * Upload every item into the SAME
     * Drive album folder.
     */
    for (
      const file of files
    ) {
      const driveFile =
        await uploadToDrive(
          file,
          attendee,
          driveAlbum.id
        );

      uploaded.push({
        driveFile,
        file,
      });
    }

    /*
     * Create all Supabase photo/media records.
     */
    const rows =
      uploaded.map(
        ({
          driveFile,
          file,
        }) => ({
          album_id:
            album.id,

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

      albumId:
        album.id,

      albumFolderId:
        driveAlbum.id,

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