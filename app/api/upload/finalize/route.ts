import { NextResponse } from 'next/server';

import {
  currentAttendee,
} from '@/lib/attendee-cookie';

import {
  supabaseAdmin,
} from '@/lib/supabase-client';

export const runtime =
  'nodejs';

const MAX_IMAGE_SIZE =
  15 * 1024 * 1024;

const MAX_VIDEO_SIZE =
  200 * 1024 * 1024;


  
function safeMediaType(
  mimeType: string
) {
  return mimeType.startsWith(
    'video/'
  )
    ? 'video'
    : 'image';
}

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
        {
          status: 401,
        }
      );
    }

    const body =
      await request.json();

    const fileId =
      String(
        body.fileId ?? ''
      ).trim();

    const fileName =
      String(
        body.fileName ?? ''
      ).trim();

    const mimeType =
      String(
        body.mimeType ?? ''
      ).trim();

    const fileSize =
      Number(
        body.fileSize ?? 0
      );

    const caption =
      String(
        body.caption ?? ''
      ).trim();

    if (
      !fileId ||
      !fileName ||
      !mimeType ||
      !Number.isFinite(
        fileSize
      ) ||
      fileSize <= 0
    ) {
      return NextResponse.json(
        {
          error:
            'Missing uploaded file information.',
        },
        {
          status: 400,
        }
      );
    }

    const isImage =
      mimeType.startsWith(
        'image/'
      );

    const isVideo =
      mimeType.startsWith(
        'video/'
      );

    if (
      !isImage &&
      !isVideo
    ) {
      return NextResponse.json(
        {
          error:
            'Only photos and videos can be saved.',
        },
        {
          status: 400,
        }
      );
    }

    const maxSize =
      isVideo
        ? MAX_VIDEO_SIZE
        : MAX_IMAGE_SIZE;

    if (
      fileSize >
      maxSize
    ) {
      return NextResponse.json(
        {
          error:
            isVideo
              ? 'Video is larger than 200 MB.'
              : 'Photo is larger than 15 MB.',
        },
        {
          status: 400,
        }
      );
    }

    

    const db =
      supabaseAdmin();

    /*
     * Find the attendee.
     */
    const {
      data: person,
      error: personError,
    } = await db
      .from('attendees')
      .select(
        'id,name'
      )
      .eq(
        'name',
        attendee
      )
      .single();

    if (
      personError ||
      !person
    ) {
      throw new Error(
        'Attendee is not configured.'
      );
    }

    const driveUrl =
      `https://drive.google.com/file/d/${encodeURIComponent(
        fileId
      )}/view`;

    /*
     * IMPORTANT:
     *
     * Only metadata is stored in Supabase.
     *
     * The actual photo/video remains in Google Drive.
     */
    const {
      data,
      error,
    } = await db
      .from('photos')
      .insert({
        caption:
          caption ||
          null,

        original_name:
          fileName,

        mime_type:
          mimeType,

        media_type:
          safeMediaType(
            mimeType
          ),

        drive_file_id:
          fileId,

        drive_file_url:
          driveUrl,

        attendee_id:
          person.id,
      })
      .select(`
        id,
        caption,
        original_name,
        mime_type,
        media_type,
        drive_file_id,
        drive_file_url,
        created_at,
        attendee_id
      `)
      .single();

    if (error) {
      console.error(
        'PHOTO DATABASE INSERT ERROR:',
        error
      );

      throw error;
    }

    return NextResponse.json({
      ok: true,

      photo: {
        id:
          data.id,

        caption:
          data.caption,

        originalName:
          data.original_name,

        mimeType:
          data.mime_type,

        mediaType:
          data.media_type,

        driveFileId:
          data.drive_file_id,

        driveUrl:
          data.drive_file_url,

        createdAt:
          data.created_at,

        attendeeId:
          data.attendee_id,

        from:
          person.name,
      },
    });
  } catch (error) {
    console.error(
      'UPLOAD FINALIZE ERROR:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not save the uploaded photo.',
      },
      {
        status: 500,
      }
    );
  }
}