const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// CREATE - Add new care task
router.post('/', async (req, res) => {
  try {
    const {
      name,
      description,
      start_date,
      end_date,
      recurrence_interval_days,
      task_type,
      care_item_id
    } = req.body;

    // Validation
    if (!name || !start_date || recurrence_interval_days === undefined || !task_type) {
      return res.status(400).json({
        error: 'Missing required fields: name, start_date, recurrence_interval_days, task_type'
      });
    }

    // Validate task_type
    if (!['PURCHASE', 'GENERAL'].includes(task_type)) {
      return res.status(400).json({
        error: 'task_type must be either PURCHASE or GENERAL'
      });
    }

    // If care_item_id provided, verify it exists
    if (care_item_id) {
      const careItemDoc = await db.collection('care_items').doc(care_item_id).get();
      if (!careItemDoc.exists) {
        return res.status(404).json({ error: 'Care item not found' });
      }
    }

    const careTaskData = {
      name,
      description: description || '',
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : null,
      recurrence_interval_days: parseInt(recurrence_interval_days),
      task_type,
      is_active: true,
      care_item_id: care_item_id || null,
      created_by: req.user.uid,
      deactivated_at: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const docRef = await db.collection('care_tasks').add(careTaskData);

    // Auto-generate first task execution
    await generateTaskExecution(docRef.id, careTaskData);

    res.status(201).json({
      message: 'Care task created successfully',
      id: docRef.id,
      data: { id: docRef.id, ...careTaskData }
    });
  } catch (error) {
    console.error('Error creating care task:', error);
    res.status(500).json({ error: 'Failed to create care task' });
  }
});

// READ - Get all care tasks with optional filtering
router.get('/', async (req, res) => {
  try {
    const {
      task_type,
      care_item_id,
      is_active = 'true',
      limit = 50,
      offset = 0
    } = req.query;

    let query = db.collection('care_tasks');

    // Filter by active status
    if (is_active !== 'all') {
      query = query.where('is_active', '==', is_active === 'true');
    }

    // Filter by task type
    if (task_type) {
      query = query.where('task_type', '==', task_type);
    }

    // Filter by care item
    if (care_item_id) {
      query = query.where('care_item_id', '==', care_item_id);
    }

    // Apply pagination
    query = query.orderBy('created_at', 'desc')
                 .limit(parseInt(limit))
                 .offset(parseInt(offset));

    const snapshot = await query.get();
    const careTasks = [];

    snapshot.forEach(doc => {
      careTasks.push({
        id: doc.id,
        ...doc.data(),
        start_date: doc.data().start_date?.toDate(),
        end_date: doc.data().end_date?.toDate(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate(),
        deactivated_at: doc.data().deactivated_at?.toDate()
      });
    });

    res.json({
      care_tasks: careTasks,
      count: careTasks.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching care tasks:', error);
    res.status(500).json({ error: 'Failed to fetch care tasks' });
  }
});

// READ - Get specific care task by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('care_tasks').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care task not found' });
    }

    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      start_date: data.start_date?.toDate(),
      end_date: data.end_date?.toDate(),
      created_at: data.created_at?.toDate(),
      updated_at: data.updated_at?.toDate(),
      deactivated_at: data.deactivated_at?.toDate()
    });
  } catch (error) {
    console.error('Error fetching care task:', error);
    res.status(500).json({ error: 'Failed to fetch care task' });
  }
});

// READ - Get task executions for a specific care task
router.get('/:id/executions', async (req, res) => {
  try {
    const { status, limit = 50, offset = 0 } = req.query;

    let query = db.collection('task_executions')
                  .where('care_task_id', '==', req.params.id);

    // Filter by status if provided
    if (status) {
      query = query.where('status', '==', status);
    }

    query = query.orderBy('scheduled_date', 'desc')
                 .limit(parseInt(limit))
                 .offset(parseInt(offset));

    const snapshot = await query.get();
    const executions = [];

    snapshot.forEach(doc => {
      executions.push({
        id: doc.id,
        ...doc.data(),
        scheduled_date: doc.data().scheduled_date?.toDate(),
        execution_date: doc.data().execution_date?.toDate(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate()
      });
    });

    res.json({
      executions,
      count: executions.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching task executions:', error);
    res.status(500).json({ error: 'Failed to fetch task executions' });
  }
});

// UPDATE - Update care task
router.put('/:id', async (req, res) => {
  try {
    const careTaskRef = db.collection('care_tasks').doc(req.params.id);
    const doc = await careTaskRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care task not found' });
    }

    const {
      name,
      description,
      start_date,
      end_date,
      recurrence_interval_days,
      task_type,
      care_item_id
    } = req.body;

    // If care_item_id is being updated, verify it exists
    if (care_item_id) {
      const careItemDoc = await db.collection('care_items').doc(care_item_id).get();
      if (!careItemDoc.exists) {
        return res.status(404).json({ error: 'Care item not found' });
      }
    }

    // Validate task_type if provided
    if (task_type && !['PURCHASE', 'GENERAL'].includes(task_type)) {
      return res.status(400).json({
        error: 'task_type must be either PURCHASE or GENERAL'
      });
    }

    const updateData = {
      updated_at: new Date()
    };

    // Only update provided fields
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (start_date !== undefined) updateData.start_date = new Date(start_date);
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;
    if (recurrence_interval_days !== undefined) updateData.recurrence_interval_days = parseInt(recurrence_interval_days);
    if (task_type !== undefined) updateData.task_type = task_type;
    if (care_item_id !== undefined) updateData.care_item_id = care_item_id;

    await careTaskRef.update(updateData);

    // Get updated document
    const updatedDoc = await careTaskRef.get();
    const data = updatedDoc.data();

    res.json({
      message: 'Care task updated successfully',
      data: {
        id: updatedDoc.id,
        ...data,
        start_date: data.start_date?.toDate(),
        end_date: data.end_date?.toDate(),
        created_at: data.created_at?.toDate(),
        updated_at: data.updated_at?.toDate(),
        deactivated_at: data.deactivated_at?.toDate()
      }
    });
  } catch (error) {
    console.error('Error updating care task:', error);
    res.status(500).json({ error: 'Failed to update care task' });
  }
});

// SOFT DELETE - Deactivate care task
router.delete('/:id', async (req, res) => {
  try {
    const careTaskRef = db.collection('care_tasks').doc(req.params.id);
    const doc = await careTaskRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care task not found' });
    }

    const updateData = {
      is_active: false,
      deactivated_at: new Date(),
      updated_at: new Date()
    };

    await careTaskRef.update(updateData);

    res.json({
      message: 'Care task deactivated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error deactivating care task:', error);
    res.status(500).json({ error: 'Failed to deactivate care task' });
  }
});

// REACTIVATE - Reactivate a soft-deleted care task
router.patch('/:id/reactivate', async (req, res) => {
  try {
    const careTaskRef = db.collection('care_tasks').doc(req.params.id);
    const doc = await careTaskRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care task not found' });
    }

    const updateData = {
      is_active: true,
      deactivated_at: null,
      updated_at: new Date()
    };

    await careTaskRef.update(updateData);

    res.json({
      message: 'Care task reactivated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error reactivating care task:', error);
    res.status(500).json({ error: 'Failed to reactivate care task' });
  }
});

// GENERATE - Generate next task executions for recurring tasks
router.post('/:id/generate-executions', async (req, res) => {
  try {
    const careTaskRef = db.collection('care_tasks').doc(req.params.id);
    const doc = await careTaskRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care task not found' });
    }

    const taskData = doc.data();

    if (!taskData.is_active) {
      return res.status(400).json({ error: 'Cannot generate executions for inactive task' });
    }

    if (taskData.recurrence_interval_days === 0) {
      return res.status(400).json({ error: 'Cannot generate executions for one-off task' });
    }

    // Generate next execution
    const executionId = await generateTaskExecution(req.params.id, taskData);

    res.json({
      message: 'Task execution generated successfully',
      execution_id: executionId
    });
  } catch (error) {
    console.error('Error generating task execution:', error);
    res.status(500).json({ error: 'Failed to generate task execution' });
  }
});

// Helper function to generate task executions
async function generateTaskExecution(careTaskId, taskData) {
  try {
    // Find the last execution to determine next scheduled date
    const lastExecutionSnapshot = await db.collection('task_executions')
      .where('care_task_id', '==', careTaskId)
      .orderBy('scheduled_date', 'desc')
      .limit(1)
      .get();

    let nextScheduledDate;

    if (lastExecutionSnapshot.empty) {
      // First execution - use task start date
      nextScheduledDate = taskData.start_date;
    } else {
      // Calculate next date based on recurrence
      const lastExecution = lastExecutionSnapshot.docs[0].data();
      const lastDate = lastExecution.scheduled_date.toDate();
      nextScheduledDate = new Date(lastDate);
      nextScheduledDate.setDate(nextScheduledDate.getDate() + taskData.recurrence_interval_days);
    }

    // Check if we should stop generating (past end_date)
    if (taskData.end_date && nextScheduledDate > taskData.end_date.toDate()) {
      return null;
    }

    const executionData = {
      care_task_id: careTaskId,
      status: 'TODO',
      quantity_purchased: 1,
      quantity_unit: taskData.task_type === 'PURCHASE' ? 'piece' : '',
      actual_cost: null,
      evidence_url: null,
      scheduled_date: nextScheduledDate,
      execution_date: null,
      covered_by_execution_id: null,
      executed_by: null,
      notes: '',
      created_at: new Date(),
      updated_at: new Date()
    };

    const docRef = await db.collection('task_executions').add(executionData);
    return docRef.id;
  } catch (error) {
    console.error('Error generating task execution:', error);
    throw error;
  }
}

module.exports = router;