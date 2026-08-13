// ============================================
// Settings API — GET/PATCH
// ============================================
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getSettings, updateSettings } from '@/lib/store/config';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const settings = getSettings();
    const isEnvConnected = !!process.env.GOOGLE_SPREADSHEET_ID && (!!process.env.GOOGLE_CLIENT_ID || !!process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL);
    return NextResponse.json({
      ...settings,
      isConnected: isEnvConnected,
      spreadsheetId: process.env.GOOGLE_SPREADSHEET_ID || '',
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const updated = updateSettings(body);
    return NextResponse.json(updated);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
