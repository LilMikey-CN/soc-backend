const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// READ - Get all task executions with filtering
router.get('/', async (req, res) => {
  try {
    const {
      status,
      care_task_id,
      executed_by,
      date_from,
      date_to,
      limit = 100,
      offset = 0
    } = req.query;

    let query = db.collection('task_executions');

    // Apply filters
    if (status) {
      query = query.where('status', '==', status);
    }

    if (care_task_id) {
      query = query.where('care_task_id', '==', care_task_id);
    }

    if (executed_by) {
      query = query.where('executed_by', '==', executed_by);
    }

    // Date range filtering (client-side since Firestore has limitations)
    query = query.orderBy('scheduled_date', 'desc')
                 .limit(parseInt(limit))
                 .offset(parseInt(offset));

    const snapshot = await query.get();
    let executions = [];

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

    // Client-side date filtering
    if (date_from || date_to) {
      executions = executions.filter(execution => {
        const schedDate = execution.scheduled_date;
        if (date_from && schedDate < new Date(date_from)) return false;
        if (date_to && schedDate > new Date(date_to)) return false;
        return true;
      });
    }

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

// READ - Get specific task execution
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('task_executions').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Task execution not found' });
    }

    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      scheduled_date: data.scheduled_date?.toDate(),
      execution_date: data.execution_date?.toDate(),
      created_at: data.created_at?.toDate(),
      updated_at: data.updated_at?.toDate()
    });
  } catch (error) {
    console.error('Error fetching task execution:', error);
    res.status(500).json({ error: 'Failed to fetch task execution' });
  }
});

// UPDATE - Update task execution status and details
router.put('/:id', async (req, res) => {
  try {
    const executionRef = db.collection('task_executions').doc(req.params.id);
    const doc = await executionRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Task execution not found' });
    }

    const {
      status,
      quantity_purchased,
      quantity_unit,
      actual_cost,
      evidence_url,
      execution_date,
      notes
    } = req.body;

    // Validate status
    const validStatuses = ['TODO', 'DONE', 'COVERED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'CANCELLED'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: `Status must be one of: ${validStatuses.join(', ')}`
      });
    }

    const updateData = { updated_at: new Date() };

    if (status !== undefined) {
      updateData.status = status;
      // Set execution_date if status is DONE and not already set
      if (status === 'DONE' && !execution_date && !doc.data().execution_date) {
        updateData.execution_date = new Date();
        updateData.executed_by = req.user.uid;
      }
    }

    if (quantity_purchased !== undefined) updateData.quantity_purchased = parseInt(quantity_purchased);
    if (quantity_unit !== undefined) updateData.quantity_unit = quantity_unit;
    if (actual_cost !== undefined) updateData.actual_cost = parseFloat(actual_cost);
    if (evidence_url !== undefined) updateData.evidence_url = evidence_url;
    if (execution_date !== undefined) {
      updateData.execution_date = execution_date ? new Date(execution_date) : null;
      if (execution_date) updateData.executed_by = req.user.uid;
    }
    if (notes !== undefined) updateData.notes = notes;

    await executionRef.update(updateData);

    const updatedDoc = await executionRef.get();
    const data = updatedDoc.data();

    res.json({
      message: 'Task execution updated successfully',
      data: {
        id: updatedDoc.id,
        ...data,
        scheduled_date: data.scheduled_date?.toDate(),
        execution_date: data.execution_date?.toDate(),
        created_at: data.created_at?.toDate(),
        updated_at: data.updated_at?.toDate()
      }
    });
  } catch (error) {
    console.error('Error updating task execution:', error);
    res.status(500).json({ error: 'Failed to update task execution' });
  }
});

// PATCH - Mark execution as covering other executions (bulk purchase)
router.patch('/:id/cover-executions', async (req, res) => {
  try {
    const { execution_ids } = req.body;

    if (!Array.isArray(execution_ids) || execution_ids.length === 0) {
      return res.status(400).json({
        error: 'execution_ids must be a non-empty array'
      });
    }

    const batch = db.batch();

    // Update covered executions
    for (const executionId of execution_ids) {
      const executionRef = db.collection('task_executions').doc(executionId);
      batch.update(executionRef, {
        status: 'COVERED',
        covered_by_execution_id: req.params.id,
        updated_at: new Date()
      });
    }

    await batch.commit();

    res.json({
      message: `${execution_ids.length} executions marked as covered`,
      covered_executions: execution_ids,
      covering_execution_id: req.params.id
    });
  } catch (error) {
    console.error('Error covering executions:', error);
    res.status(500).json({ error: 'Failed to cover executions' });
  }
});

// GET - Get executions covered by this execution
router.get('/:id/covered-executions', async (req, res) => {
  try {
    const snapshot = await db.collection('task_executions')
      .where('covered_by_execution_id', '==', req.params.id)
      .get();

    const coveredExecutions = [];

    snapshot.forEach(doc => {
      coveredExecutions.push({
        id: doc.id,
        ...doc.data(),
        scheduled_date: doc.data().scheduled_date?.toDate(),
        execution_date: doc.data().execution_date?.toDate(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate()
      });
    });

    res.json({ covered_executions });
  } catch (error) {
    console.error('Error fetching covered executions:', error);
    res.status(500).json({ error: 'Failed to fetch covered executions' });
  }
});

module.exports = router;