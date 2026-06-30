/**
 * Rush Jobs API Routes
 * Handles rush job capacity and pricing calculations
 */

import { NextResponse } from "next/server";
import { RushJobService } from '@/services/rushJob.service';
import { requireRepairOps } from '@/lib/apiAuth';

export async function GET(request) {
  try {
    const { errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'canCreate':
        const canCreateResult = await RushJobService.canCreateRushJob();
        return NextResponse.json({
          success: true,
          data: canCreateResult
        });

      case 'stats':
        const stats = await RushJobService.getRushJobStats();
        return NextResponse.json({
          success: true,
          data: stats
        });

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action parameter. Use 'canCreate' or 'stats'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Rush jobs API error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const { errorResponse } = await requireRepairOps();
    if (errorResponse) return errorResponse;

    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'calculatePricing':
        if (!data.subtotal || typeof data.subtotal !== 'number') {
          return NextResponse.json(
            { success: false, error: "Valid subtotal required" },
            { status: 400 }
          );
        }

        const pricing = await RushJobService.calculateRushPricing(data.subtotal);
        return NextResponse.json({
          success: true,
          data: pricing
        });

      default:
        return NextResponse.json(
          { success: false, error: "Invalid action. Use 'calculatePricing'" },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Rush jobs API POST error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
