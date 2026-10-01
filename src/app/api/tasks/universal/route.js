import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/apiAuth';
import { TasksService } from '../service';
import { saveFailureStatus } from '../saveFailureStatus';

export async function POST(request) {
  try {
    const { session, errorResponse } = await requireRole(['admin', 'dev']);
    if (errorResponse) return errorResponse;

    const taskData = await request.json();

    // Validate required fields
    if (!taskData.title || !taskData.category) {
      return NextResponse.json(
        { error: 'Title and category are required' },
        { status: 400 }
      );
    }

    // Validate processes
    if (!taskData.processes || taskData.processes.length === 0) {
      return NextResponse.json(
        { error: 'At least one process is required for universal tasks' },
        { status: 400 }
      );
    }

    // ONE SAVE PATH (EFD-DEFECTS P19). This route used to build its own document and drop what it didn't
    // name — tools (fixed earlier as P6), aiMeta, material `condition`, baseMetal/baseKarat and the
    // top-level `isActive` — so a new "inactive" task had no `isActive` and the shop still offered it.
    // Create now stores exactly what edit stores: TasksService.createTask, the same transform as update.
    const result = await TasksService.createTask({
      ...taskData,
      isUniversal: true,
      supportsAllMetals: true,
      isActive: taskData.isActive ?? (taskData.display?.isActive !== false),
    }, session.user?.email || session.user?.userID || 'system');

    if (!result.success) {
      return NextResponse.json({ success: false, error: result.error }, { status: saveFailureStatus(result.error) });
    }
    return NextResponse.json({ success: true, message: 'Task created successfully', task: result.data }, { status: 201 });

  } catch (error) {
    console.error('🔥 UNIVERSAL-TASK-API - Error creating universal task:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // More detailed error response
    return NextResponse.json(
      { 
        error: 'Failed to create universal task',
        details: process.env.NODE_ENV === 'development' ? {
          message: error.message,
          stack: error.stack,
          name: error.name
        } : undefined
      },
      { status: 500 }
    );
  }
}
