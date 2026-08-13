// ============================================
// Google Drive File Upload API
// Uploads digitized files directly into the order's Digitized Files folder in Google Drive
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { google } from 'googleapis';
import { Readable } from 'stream';

function getDriveAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    let key = process.env.GOOGLE_PRIVATE_KEY;
    if (key.includes('\\n')) {
      key = key.replace(/\\n/g, '\n');
    }
    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key,
      scopes: [
        'https://www.googleapis.com/auth/drive',
        'https://www.googleapis.com/auth/drive.file',
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

function extractFolderId(urlOrId: string): string | null {
  if (!urlOrId) return null;
  if (/^[a-zA-Z0-9_-]+$/.test(urlOrId) && urlOrId.length > 10) {
    return urlOrId;
  }
  const folderMatch = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];
  const idMatch = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const folderUrl = (formData.get('folderUrl') || formData.get('digitizedFolderUrl') || formData.get('orderFolderUrl')) as string;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (!folderUrl) {
      return NextResponse.json({ error: 'Folder URL/ID is required' }, { status: 400 });
    }

    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json({ error: 'Invalid Google Drive folder URL or ID' }, { status: 400 });
    }

    const auth = getDriveAuth();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    // Convert Web File buffer to Node stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Upload to Google Drive
    const response = await drive.files.create({
      requestBody: {
        name: file.name,
        parents: [folderId],
      },
      media: {
        mimeType: file.type || 'application/octet-stream',
        body: stream,
      },
      fields: 'id, name, mimeType, size, webViewLink, webContentLink',
    });

    return NextResponse.json({
      success: true,
      file: response.data,
      message: `File "${file.name}" uploaded to Google Drive successfully!`,
    });
  } catch (error: any) {
    console.error('Drive upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file to Google Drive' },
      { status: 500 }
    );
  }
}
