import { NextResponse } from 'next/server';
import { ProcessController } from './controller.js';

/**
 * GET /api/processes
 * Fetch all processes with optional filtering
 */
export async function GET(request) {
  const result = await ProcessController.handleGet(request);
  return NextResponse.json(
    { 
      success: !result.error,
      ...result 
    }, 
    { status: result.status }
  );
}

/**
 * POST /api/processes
 * Create a new process
 */
export async function POST(request) {
  const result = await ProcessController.handlePost(request);
  return NextResponse.json(
    { 
      success: !result.error,
      ...result 
    }, 
    { status: result.status }
  );
}

/**
 * PUT /api/processes?id=<processId>
 * Update an existing process
 */
export async function PUT(request) {
  const result = await ProcessController.handlePut(request);
  return NextResponse.json(
    { 
      success: !result.error,
      ...result 
    }, 
    { status: result.status }
  );
}

/**
 * DELETE /api/processes?id=<processId>
 * Delete a process
 */
export async function DELETE(request) {
  const result = await ProcessController.handleDelete(request);
  return NextResponse.json(
    { 
      success: !result.error,
      ...result 
    }, 
    { status: result.status }
  );
}
