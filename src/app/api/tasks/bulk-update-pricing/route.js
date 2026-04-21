import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json({
    success: true,
    updated: 0,
    message: 'Task pricing is now computed at runtime — no bulk update needed.'
  });
}
