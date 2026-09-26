import { NextResponse } from 'next/server';

import {
  currentAttendee,
} from '@/lib/attendee-cookie';

export const runtime = 'nodejs';

const MAX_IMAGE_SIZE = 15 * 1024 * 1024;

const MAX_VIDEO_SIZE = 200 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const attendee = await currentAttendee();

    if (!attendee) {
      return NextResponse.json(
        { error: 'Choose an attendee first.' },
        { status: 401 }
      );
    }

    const body = await request.json();

    const fileName = String(body.fileName ?? '').trim();
    const mimeType = String(body.mimeType ?? '').trim();
    const fileSize = Number(body.fileSize ?? 0);

    if (
      !fileName ||
      !mimeType ||
      !Number.isFinite(fileSize) ||
      fileSize <= 0
    ) {
      return NextResponse.json(
        { error: 'Missing file information.' },
        { status: 400 }
      );
    }

    const isImage = mimeType.startsWith('image/');
    const isVideo = mimeType.startsWith('video/');

    if (!isImage && !isVideo) {
      return NextResponse.json(
        { error: `"${fileName}" is not a photo or video.` },
        { status: 400 }
      );
    }

    const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;

    if (fileSize > maxSize) {
      return NextResponse.json(
        {
          error: isVideo
            ? `"${fileName}" is too large. Keep videos under 200 MB.`
            : `"${fileName}" is too large. Keep photos under 15 MB.`,
        },
        { status: 400 }
      );
    }

    const uploadServiceUrl = process.env.GOOGLE_DRIVE_UPLOAD_SERVICE_URL;

    if (!uploadServiceUrl) {
      throw new Error('GOOGLE_DRIVE_UPLOAD_SERVICE_URL is not configured.');
    }

    const uploadServiceSecret = process.env.UPLOAD_SERVICE_SECRET;

    if (!uploadServiceSecret) {
      throw new Error('UPLOAD_SERVICE_SECRET is not configured.');
    }

    return NextResponse.json({
      ok: true,
      attendee,
      uploadServiceUrl: uploadServiceUrl.replace(/\/+$/, ''),
      uploadToken: uploadServiceSecret,
    });
  } catch (error) {
    console.error('UPLOAD PREP ERROR:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : 'Could not prepare the upload.',
      },
      { status: 500 }
    );
  }
}