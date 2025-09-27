const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// CREATE - Add new care item
router.post('/', async (req, res) => {
  try {
    const {
      name,
      estimated_unit_cost,
      quantity_per_purchase = 1,
      quantity_unit,
      start_date,
      end_date,
      category_id
    } = req.body;

    // Validation
    if (!name || !estimated_unit_cost || !quantity_unit || !start_date || !category_id) {
      return res.status(400).json({
        error: 'Missing required fields: name, estimated_unit_cost, quantity_unit, start_date, category_id'
      });
    }

    // Verify category exists
    const categoryDoc = await db.collection('categories').doc(category_id).get();
    if (!categoryDoc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const careItemData = {
      name,
      estimated_unit_cost: parseFloat(estimated_unit_cost),
      quantity_per_purchase: parseInt(quantity_per_purchase),
      quantity_unit,
      start_date: new Date(start_date),
      end_date: end_date ? new Date(end_date) : null,
      is_active: true,
      category_id,
      created_by: req.user.uid,
      deactivated_at: null,
      created_at: new Date(),
      updated_at: new Date()
    };

    const docRef = await db.collection('care_items').add(careItemData);

    res.status(201).json({
      message: 'Care item created successfully',
      id: docRef.id,
      data: { id: docRef.id, ...careItemData }
    });
  } catch (error) {
    console.error('Error creating care item:', error);
    res.status(500).json({ error: 'Failed to create care item' });
  }
});

// READ - Get all care items with optional filtering
router.get('/', async (req, res) => {
  try {
    const { category_id, is_active = 'true', limit = 50, offset = 0 } = req.query;

    let query = db.collection('care_items');

    // Filter by active status
    if (is_active !== 'all') {
      query = query.where('is_active', '==', is_active === 'true');
    }

    // Filter by category
    if (category_id) {
      query = query.where('category_id', '==', category_id);
    }

    // Apply pagination
    query = query.orderBy('created_at', 'desc')
                 .limit(parseInt(limit))
                 .offset(parseInt(offset));

    const snapshot = await query.get();
    const careItems = [];

    snapshot.forEach(doc => {
      careItems.push({
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
      care_items: careItems,
      count: careItems.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching care items:', error);
    res.status(500).json({ error: 'Failed to fetch care items' });
  }
});

// READ - Get specific care item by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('care_items').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care item not found' });
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
    console.error('Error fetching care item:', error);
    res.status(500).json({ error: 'Failed to fetch care item' });
  }
});

// UPDATE - Update care item
router.put('/:id', async (req, res) => {
  try {
    const careItemRef = db.collection('care_items').doc(req.params.id);
    const doc = await careItemRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care item not found' });
    }

    const {
      name,
      estimated_unit_cost,
      quantity_per_purchase,
      quantity_unit,
      start_date,
      end_date,
      category_id
    } = req.body;

    // If category_id is being updated, verify it exists
    if (category_id) {
      const categoryDoc = await db.collection('categories').doc(category_id).get();
      if (!categoryDoc.exists) {
        return res.status(404).json({ error: 'Category not found' });
      }
    }

    const updateData = {
      updated_at: new Date()
    };

    // Only update provided fields
    if (name !== undefined) updateData.name = name;
    if (estimated_unit_cost !== undefined) updateData.estimated_unit_cost = parseFloat(estimated_unit_cost);
    if (quantity_per_purchase !== undefined) updateData.quantity_per_purchase = parseInt(quantity_per_purchase);
    if (quantity_unit !== undefined) updateData.quantity_unit = quantity_unit;
    if (start_date !== undefined) updateData.start_date = new Date(start_date);
    if (end_date !== undefined) updateData.end_date = end_date ? new Date(end_date) : null;
    if (category_id !== undefined) updateData.category_id = category_id;

    await careItemRef.update(updateData);

    // Get updated document
    const updatedDoc = await careItemRef.get();
    const data = updatedDoc.data();

    res.json({
      message: 'Care item updated successfully',
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
    console.error('Error updating care item:', error);
    res.status(500).json({ error: 'Failed to update care item' });
  }
});

// SOFT DELETE - Deactivate care item
router.delete('/:id', async (req, res) => {
  try {
    const careItemRef = db.collection('care_items').doc(req.params.id);
    const doc = await careItemRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care item not found' });
    }

    const updateData = {
      is_active: false,
      deactivated_at: new Date(),
      updated_at: new Date()
    };

    await careItemRef.update(updateData);

    res.json({
      message: 'Care item deactivated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error deactivating care item:', error);
    res.status(500).json({ error: 'Failed to deactivate care item' });
  }
});

// REACTIVATE - Reactivate a soft-deleted care item
router.patch('/:id/reactivate', async (req, res) => {
  try {
    const careItemRef = db.collection('care_items').doc(req.params.id);
    const doc = await careItemRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Care item not found' });
    }

    const updateData = {
      is_active: true,
      deactivated_at: null,
      updated_at: new Date()
    };

    await careItemRef.update(updateData);

    res.json({
      message: 'Care item reactivated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error reactivating care item:', error);
    res.status(500).json({ error: 'Failed to reactivate care item' });
  }
});

module.exports = router;