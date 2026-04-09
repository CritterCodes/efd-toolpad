import { NextResponse } from 'next/server';
import AuthService from '../[...nextauth]/service';

export async function POST(req) {
  try {
    const body = await req.json();
    const email = body?.email;

    const result = await AuthService.requestPasswordReset(email);
    return NextResponse.json({ success: true, ...result }, { status: 200 });
  } catch (error) {
    console.error('POST /api/auth/forgot-password error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process forgot password request' },
      { status: 500 }
    );
  }
}
