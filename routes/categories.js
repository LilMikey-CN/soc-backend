const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// CREATE - Add new category
router.post('/', async (req, res) => {
  try {
    const { name, description, color_code, display_order } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }

    const categoryData = {
      name,
      description: description || '',
      color_code: color_code || '#6B7280',
      display_order: display_order || 0,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    const docRef = await db.collection('categories').add(categoryData);

    res.status(201).json({
      message: 'Category created successfully',
      id: docRef.id,
      data: { id: docRef.id, ...categoryData }
    });
  } catch (error) {
    console.error('Error creating category:', error);
    res.status(500).json({ error: 'Failed to create category' });
  }
});

// READ - Get all categories
router.get('/', async (req, res) => {
  try {
    const { is_active = 'true' } = req.query;

    let query = db.collection('categories');

    if (is_active !== 'all') {
      query = query.where('is_active', '==', is_active === 'true');
    }

    query = query.orderBy('display_order').orderBy('name');

    const snapshot = await query.get();
    const categories = [];

    snapshot.forEach(doc => {
      categories.push({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate()
      });
    });

    res.json({ categories });
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

// UPDATE - Update category
router.put('/:id', async (req, res) => {
  try {
    const categoryRef = db.collection('categories').doc(req.params.id);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    const { name, description, color_code, display_order } = req.body;

    const updateData = { updated_at: new Date() };

    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (color_code !== undefined) updateData.color_code = color_code;
    if (display_order !== undefined) updateData.display_order = parseInt(display_order);

    await categoryRef.update(updateData);

    const updatedDoc = await categoryRef.get();
    const data = updatedDoc.data();

    res.json({
      message: 'Category updated successfully',
      data: {
        id: updatedDoc.id,
        ...data,
        created_at: data.created_at?.toDate(),
        updated_at: data.updated_at?.toDate()
      }
    });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
});

// SOFT DELETE
router.delete('/:id', async (req, res) => {
  try {
    const categoryRef = db.collection('categories').doc(req.params.id);
    const doc = await categoryRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Category not found' });
    }

    await categoryRef.update({
      is_active: false,
      updated_at: new Date()
    });

    res.json({
      message: 'Category deactivated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error deactivating category:', error);
    res.status(500).json({ error: 'Failed to deactivate category' });
  }
});

module.exports = router;