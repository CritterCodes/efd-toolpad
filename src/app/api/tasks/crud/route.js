import { NextResponse } from 'next/server';
import { auth } from '../../../../../auth';
import { db } from '@/lib/database';
import { ObjectId } from 'mongodb';
import { generateTaskSku, generateShortCode } from '@/utils/skuGenerator';

/**
 * GET /api/tasks/crud
 * Get tasks with filtering, pagination, and statistics
 */
export async function GET(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    
    // Check for single task request
    const taskId = searchParams.get('taskId');
    if (taskId) {
      await db.connect();
      const collection = db._instance.collection('tasks');
      
      const task = await collection.findOne({ _id: new ObjectId(taskId) });
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        task
      });
    }
    
    // Pagination
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const skip = (page - 1) * limit;
    
    // Filters
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const metalType = searchParams.get('metalType');
    const isActive = searchParams.get('isActive');
    const sortBy = searchParams.get('sortBy') || 'title';
    const sortOrder = searchParams.get('sortOrder') || 'asc';

    await db.connect();
    const collection = db._instance.collection('tasks');

    // Build query
    const query = {};
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (category) {
      query.category = category;
    }
    
    if (metalType && metalType !== 'all') {
      query.metalType = metalType;
    }
    
    if (isActive !== null && isActive !== '') {
      query.isActive = isActive === 'true';
    }

    // Build sort
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;

    // Get tasks with pagination
    const tasks = await collection
      .find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .toArray();

    // Get total count
    const totalTasks = await collection.countDocuments(query);
    const totalPages = Math.ceil(totalTasks / limit);

    // Get statistics
    const [statistics] = await collection.aggregate([
      { $match: {} },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          active: {
            $sum: { $cond: [{ $eq: ['$isActive', true] }, 1, 0] }
          },
          inactive: {
            $sum: { $cond: [{ $eq: ['$isActive', false] }, 1, 0] }
          },
          averagePrice: { $avg: '$basePrice' },
          categories: { $addToSet: '$category' }
        }
      },
      {
        $project: {
          _id: 0,
          total: 1,
          active: 1,
          inactive: 1,
          averagePrice: { $round: ['$averagePrice', 2] },
          categories: { $size: '$categories' }
        }
      }
    ]).toArray();

    // Get available filters
    const [categoriesResult] = await collection.aggregate([
      { $group: { _id: null, categories: { $addToSet: '$category' } } },
      { $project: { _id: 0, categories: 1 } }
    ]).toArray();

    return NextResponse.json({
      success: true,
      tasks,
      pagination: {
        currentPage: page,
        totalPages,
        totalTasks,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      statistics: statistics || {
        total: 0,
        active: 0,
        inactive: 0,
        averagePrice: 0,
        categories: 0
      },
      filters: {
        categories: categoriesResult?.categories || []
      }
    });

  } catch (error) {
    console.error('Error fetching tasks:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * POST /api/tasks/crud
 * Create a new task
 */
export async function POST(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const taskData = await request.json();

    // Validation
    if (!taskData.title || !taskData.category) {
      return NextResponse.json({ 
        error: 'Missing required fields: title, category' 
      }, { status: 400 });
    }

    await db.connect();
    const collection = db._instance.collection('tasks');

    // Check for duplicate title
    const existingTask = await collection.findOne({ title: taskData.title });
    if (existingTask) {
      return NextResponse.json({ 
        error: 'A task with this title already exists' 
      }, { status: 400 });
    }

    // Generate SKU and shortCode if not provided
    const shortCode = taskData.shortCode || generateShortCode(taskData.category, taskData.metalType, taskData.karat);
    const sku = taskData.sku || generateTaskSku(taskData.category, shortCode);

    const newTask = {
      ...taskData,
      sku: sku,
      shortCode: shortCode,
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: session.user.email,
      isActive: taskData.isActive !== false
    };

    const result = await collection.insertOne(newTask);

    return NextResponse.json({
      success: true,
      message: 'Task created successfully',
      taskId: result.insertedId
    });

  } catch (error) {
    console.error('Error creating task:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * PUT /api/tasks/crud
 * Update an existing task
 */
export async function PUT(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, ...updateData } = await request.json();

    if (!taskId) {
      return NextResponse.json({ 
        error: 'Task ID is required' 
      }, { status: 400 });
    }

    await db.connect();
    const collection = db._instance.collection('tasks');

    // Check if task exists
    const existingTask = await collection.findOne({ _id: new ObjectId(taskId) });
    if (!existingTask) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 });
    }

    // Check for duplicate title (excluding current task)
    if (updateData.title && updateData.title !== existingTask.title) {
      const duplicateTask = await collection.findOne({ 
        title: updateData.title,
        _id: { $ne: new ObjectId(taskId) }
      });
      if (duplicateTask) {
        return NextResponse.json({ 
          error: 'A task with this title already exists' 
        }, { status: 400 });
      }
    }

    const updatedTask = {
      ...updateData,
      updatedAt: new Date(),
      updatedBy: session.user.email
    };

    await collection.updateOne(
      { _id: new ObjectId(taskId) },
      { $set: updatedTask }
    );

    return NextResponse.json({
      success: true,
      message: 'Task updated successfully'
    });

  } catch (error) {
    console.error('Error updating task:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/crud
 * Delete or archive a task
 */
export async function DELETE(request) {
  try {
    const session = await auth();
    if (!session || !session.user?.email?.includes('@')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { taskId, hardDelete = false } = await request.json();

    if (!taskId) {
      return NextResponse.json({ 
        error: 'Task ID is required' 
      }, { status: 400 });
    }

    await db.connect();
    const collection = db._instance.collection('tasks');

    // Check if task exists
    const existingTask = await collection.findOne({ _id: new ObjectId(taskId) });
    if (!existingTask) {
      return NextResponse.json({ 
        error: 'Task not found' 
      }, { status: 404 });
    }

    if (hardDelete) {
      // Permanently delete the task
      await collection.deleteOne({ _id: new ObjectId(taskId) });
      
      return NextResponse.json({
        success: true,
        message: 'Task deleted permanently'
      });
    } else {
      // Soft delete - mark as inactive
      await collection.updateOne(
        { _id: new ObjectId(taskId) },
        { 
          $set: { 
            isActive: false,
            archivedAt: new Date(),
            archivedBy: session.user.email
          }
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Task archived successfully'
      });
    }

  } catch (error) {
    console.error('Error deleting task:', error);
    return NextResponse.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
}
