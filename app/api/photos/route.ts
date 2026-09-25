import { NextResponse } from 'next/server';

import {
  supabaseAdmin,
} from '@/lib/supabase-admin';

import {
  currentAttendee,
} from '@/lib/attendee-cookie';

export async function GET() {
  try {
    const db =
      supabaseAdmin();

    const {
      data,
      error,
    } = await db
      .from('photos')
      .select(`
        id,
        caption,
        original_name,
        mime_type,
        media_type,
        drive_file_id,
        drive_file_url,
        created_at,
        attendee_id,
        attendees(name)
      `)
      .order(
        'created_at',
        {
          ascending: false,
        }
      )
      .limit(5000);

    if (error) {
      throw error;
    }

    const attendee =
      await currentAttendee();

    return NextResponse.json({
      attendee,

      photos:
        (data ?? []).map(
          (p: any) => ({
            id:
              p.id,

            caption:
              p.caption,

            originalName:
              p.original_name,

            mimeType:
              p.mime_type,

            mediaType:
              p.media_type ||
              (
                p.mime_type?.startsWith(
                  'video/'
                )
                  ? 'video'
                  : 'image'
              ),

            driveFileId:
              p.drive_file_id,

            driveUrl:
              p.drive_file_url,

            createdAt:
              p.created_at,

            attendeeId:
              p.attendee_id,

            from:
              Array.isArray(
                p.attendees
              )
                ? p.attendees[0]?.name
                : p.attendees?.name,
          })
        ),
    });
  } catch (error) {
    console.error(
      'PHOTOS LOAD ERROR:',
      error
    );

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not load photos.',
      },
      { status: 500 }
    );
  }
}