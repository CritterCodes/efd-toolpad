import { NextResponse } from 'next/server';

// Retired: this endpoint only flipped gemstone flags without spawning production.
// Use POST /api/design-requests/[requestId]/produce instead.
export async function POST() {
    return NextResponse.json(
        { error: 'This endpoint is retired. Use POST /produce to spawn a real piece from this design request.' },
        { status: 410 }
    );
}