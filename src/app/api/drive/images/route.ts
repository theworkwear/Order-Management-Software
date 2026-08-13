// ============================================
// Google Drive Images API
// Lists images from a Drive folder and returns viewable/downloadable URLs
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { google } from 'googleapis';

function getDriveAuth() {
  // Service Account credentials
  if (process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL && process.env.GOOGLE_PRIVATE_KEY) {
    let key = process.env.GOOGLE_PRIVATE_KEY;
    if (key.includes('\\n')) {
      key = key.replace(/\\n/g, '\n');
    }
    return new google.auth.JWT({
      email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      key,
      scopes: [
        'https://www.googleapis.com/auth/drive.readonly',
        'https://www.googleapis.com/auth/spreadsheets',
      ],
    });
  }

  // Full credentials JSON
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    try {
      const keys = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
      return google.auth.fromJSON(keys) as any;
    } catch (e) {
      console.error('Failed to parse GOOGLE_CREDENTIALS_JSON:', e);
    }
  }

  // OAuth2
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

// Extract folder ID from various Google Drive URL formats
function extractFolderId(urlOrId: string): string | null {
  if (!urlOrId) return null;

  // Already a raw ID (no slashes or dots)
  if (/^[a-zA-Z0-9_-]+$/.test(urlOrId) && urlOrId.length > 10) {
    return urlOrId;
  }

  // https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = urlOrId.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  // https://drive.google.com/open?id=FOLDER_ID
  const idMatch = urlOrId.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return null;
}

export interface DriveImage {
  id: string;
  name: string;
  mimeType: string;
  thumbnailUrl: string;
  viewUrl: string;
  downloadUrl: string;
  size: string;
  createdTime: string;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const folderUrl = searchParams.get('folderId') || searchParams.get('folderUrl') || '';

    if (!folderUrl) {
      return NextResponse.json({ error: 'folderId or folderUrl is required' }, { status: 400 });
    }

    const folderId = extractFolderId(folderUrl);
    if (!folderId) {
      return NextResponse.json({ error: 'Could not extract folder ID from URL' }, { status: 400 });
    }

    const auth = getDriveAuth();
    const drive = google.drive({ version: 'v3', auth: auth as any });

    // 1. List all items in the main folder (files and subfolders)
    const mainResponse = await drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, size, createdTime, thumbnailLink, webContentLink, webViewLink)',
      orderBy: 'createdTime desc',
      pageSize: 50,
    });

    const allMainItems = mainResponse.data.files || [];

    // Filter main folder images (Customer Artwork)
    const artworkFiles = allMainItems.filter(f => f.mimeType?.includes('image/'));
    
    // Look for subfolders (e.g. "Digitized Files" or "Digitized")
    const digitizedSubfolder = allMainItems.find(
      f => f.mimeType === 'application/vnd.google-apps.folder' && f.name?.toLowerCase().includes('digitiz')
    );

    let digitizedFiles: DriveImage[] = [];
    let digitizedFolderId: string | null = null;

    if (digitizedSubfolder && digitizedSubfolder.id) {
      digitizedFolderId = digitizedSubfolder.id;
      // List items in the Digitized Files subfolder
      const subResponse = await drive.files.list({
        q: `'${digitizedFolderId}' in parents and trashed = false`,
        fields: 'files(id, name, mimeType, size, createdTime, thumbnailLink, webContentLink, webViewLink)',
        orderBy: 'createdTime desc',
        pageSize: 50,
      });

      const subFiles = subResponse.data.files || [];
      digitizedFiles = subFiles.map(file => ({
        id: file.id || '',
        name: file.name || '',
        mimeType: file.mimeType || '',
        thumbnailUrl: `/api/drive/file?fileId=${file.id}`,
        viewUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
        downloadUrl: `/api/drive/file?fileId=${file.id}&download=true`,
        size: file.size || '0',
        createdTime: file.createdTime || '',
      }));
    }

    const images: DriveImage[] = artworkFiles.map(file => ({
      id: file.id || '',
      name: file.name || '',
      mimeType: file.mimeType || '',
      thumbnailUrl: `/api/drive/file?fileId=${file.id}`,
      viewUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
      downloadUrl: `/api/drive/file?fileId=${file.id}&download=true`,
      size: file.size || '0',
      createdTime: file.createdTime || '',
    }));

    return NextResponse.json({
      images,
      digitizedFiles,
      digitizedFolderId,
      digitizedFolderUrl: digitizedFolderId ? `https://drive.google.com/drive/folders/${digitizedFolderId}` : null,
      folderId,
    });
  } catch (error: any) {
    console.error('Drive images error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch images from Drive' },
      { status: 500 }
    );
  }
}
