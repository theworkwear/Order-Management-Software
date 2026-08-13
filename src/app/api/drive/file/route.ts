// ============================================
// Google Drive File Proxy API
// Streams files/images directly from Google Drive using Service Account
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { google } from 'googleapis';

function getDriveAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    let key = process.env.GOOGLE_PRIVATE_KEY.trim();
    if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
      key = key.slice(1, -1).trim();
    }
    key = key.replace(/\\n/g, '\n');

    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL.trim(),
      key,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });
  }

  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const keys = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return google.auth.fromJSON(keys) as any;
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
    }
  }

  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const auth = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    if (process.env.GOOGLE_REFRESH_TOKEN) {
      auth.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });
    }
    return auth;
  }

  throw new Error('No Google auth credentials configured');
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const fileId = searchParams.get('fileId') || '';
    const isDownload = searchParams.get('download') === 'true';

    if (!fileId) {
      return NextResponse.json({ error: 'fileId is required' }, { status: 400 });
    }

    const auth = getDriveAuth();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    // 1. Get file metadata (for mimeType and filename)
    const metaResponse = await drive.files.get({
      fileId,
      fields: 'id, name, mimeType, size',
    });
    const fileMeta = metaResponse.data;

    // 2. Fetch binary stream
    const mediaResponse = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    const stream = mediaResponse.data as unknown as ReadableStream;

    const disposition = isDownload
      ? `attachment; filename="${encodeURIComponent(fileMeta.name || 'download')}"`
      : 'inline';

    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': fileMeta.mimeType || 'application/octet-stream',
        'Content-Disposition': disposition,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    });
  } catch (error: any) {
    console.error('Drive file proxy error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch file from Google Drive' },
      { status: 500 }
    );
  }
}
