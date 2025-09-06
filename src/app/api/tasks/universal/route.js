import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { TasksModel } from '../model';

// Temporary auth config (TODO: fix authentication properly)
const authConfig = {
  providers: [], // Not needed for getServerSession
  secret: process.env.NEXTAUTH_SECRET
};

export async function POST(request) {
  try {
    console.log('🔥 UNIVERSAL-TASK-API - Create universal task request received');

    // Temporarily skip authentication to avoid blocking the form
    // TODO: Re-enable once authentication is properly configured
    // const session = await getServerSession(authConfig);
    // if (!session) {
    //   console.log('🔥 UNIVERSAL-TASK-API - Unauthorized request');
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const taskData = await request.json();
    console.log('🔥 UNIVERSAL-TASK-API - Task data received:', {
      title: taskData.title,
      category: taskData.category,
      processesCount: taskData.processes?.length || 0,
      materialsCount: taskData.materials?.length || 0,
      isUniversal: taskData.isUniversal
    });

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

    // Prepare task data for database
    const universalTaskData = {
      title: taskData.title,
      description: taskData.description || '',
      category: taskData.category,
      subcategory: taskData.subcategory || '',
      
      // Process-based structure
      processes: taskData.processes.map(process => ({
        processId: process.processId,
        quantity: process.quantity || 1
      })),
      
      // Materials (optional)
      materials: taskData.materials?.map(material => ({
        materialId: material.materialId,
        quantity: material.quantity || 1
      })) || [],
      
      // Universal pricing data
      universalPricing: taskData.universalPricing || null,
      
      // Service settings
      service: {
        estimatedDays: taskData.service?.estimatedDays || 3,
        rushDays: taskData.service?.rushDays || 1,
        rushMultiplier: taskData.service?.rushMultiplier || 1.5,
        requiresApproval: taskData.service?.requiresApproval ?? true,
        requiresInspection: taskData.service?.requiresInspection ?? true,
        canBeBundled: taskData.service?.canBeBundled ?? true
      },
      
      // Display settings
      display: {
        isActive: taskData.display?.isActive ?? true,
        isFeatured: taskData.display?.isFeatured ?? false,
        sortOrder: taskData.display?.sortOrder || 0
      },
      
      // Universal task flags
      isUniversal: true,
      supportsAllMetals: true,
      
      // Metadata
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      createdBy: 'admin@example.com' // TODO: Replace with proper session.user?.email when auth is fixed
    };

    console.log('🔥 UNIVERSAL-TASK-API - Creating universal task:', {
      title: universalTaskData.title,
      processesCount: universalTaskData.processes.length,
      isUniversal: universalTaskData.isUniversal
    });

    // Create the task using the TasksModel
    const createdTask = await TasksModel.createTask(universalTaskData);
    
    console.log('🔥 UNIVERSAL-TASK-API - Universal task created successfully:', createdTask._id);

    return NextResponse.json({
      success: true,
      message: 'Universal task created successfully',
      task: createdTask
    });

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
