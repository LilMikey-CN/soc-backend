const express = require('express');
const { db } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(verifyToken);

// Deprecation middleware - add warning header to all responses
router.use((req, res, next) => {
  res.set('X-Deprecated', 'true');
  res.set('X-Deprecation-Message', 'This endpoint is deprecated. Use /api/users/client-profile instead for client profile management. Client profiles are now embedded within user documents.');
  next();
});

// CREATE - Add new client profile
router.post('/', async (req, res) => {
  try {
    const {
      full_name,
      date_of_birth,
      sex,
      age,
      mobile_number,
      email_address,
      postal_address,
      emergency_contacts,
      notes,
      medical_conditions,
      allergies,
      medications,
      accessibility_needs,
      latest_vitals
    } = req.body;

    // Validate sex field if provided
    if (sex && !['Male', 'Female', 'Other', 'Prefer not to say'].includes(sex)) {
      return res.status(400).json({
        error: 'sex must be one of: Male, Female, Other, Prefer not to say'
      });
    }

    // Calculate age if date_of_birth is provided and age is not
    let calculatedAge = age;
    if (date_of_birth && !age) {
      const birthDate = new Date(date_of_birth);
      calculatedAge = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }

    // Validate emergency contacts format if provided
    if (emergency_contacts && !Array.isArray(emergency_contacts)) {
      return res.status(400).json({
        error: 'emergency_contacts must be an array of objects'
      });
    }

    // Validate latest vitals format if provided
    if (latest_vitals && typeof latest_vitals !== 'object') {
      return res.status(400).json({
        error: 'latest_vitals must be an object'
      });
    }

    const clientProfileData = {
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    // Only include fields that are provided
    if (full_name !== undefined) clientProfileData.full_name = full_name;
    if (date_of_birth !== undefined) clientProfileData.date_of_birth = new Date(date_of_birth);
    if (sex !== undefined) clientProfileData.sex = sex;
    if (calculatedAge !== undefined) clientProfileData.age = calculatedAge;
    if (mobile_number !== undefined) clientProfileData.mobile_number = mobile_number;
    if (email_address !== undefined) clientProfileData.email_address = email_address;
    if (postal_address !== undefined) clientProfileData.postal_address = postal_address;
    if (emergency_contacts !== undefined) clientProfileData.emergency_contacts = emergency_contacts;
    if (notes !== undefined) clientProfileData.notes = notes;
    if (medical_conditions !== undefined) clientProfileData.medical_conditions = medical_conditions;
    if (allergies !== undefined) clientProfileData.allergies = allergies;
    if (medications !== undefined) clientProfileData.medications = medications;
    if (accessibility_needs !== undefined) clientProfileData.accessibility_needs = accessibility_needs;
    if (latest_vitals !== undefined) clientProfileData.latest_vitals = latest_vitals;

    const docRef = await db.collection('client_profiles').add(clientProfileData);

    res.status(201).json({
      message: 'Client profile created successfully',
      id: docRef.id,
      data: { id: docRef.id, ...clientProfileData }
    });
  } catch (error) {
    console.error('Error creating client profile:', error);
    res.status(500).json({ error: 'Failed to create client profile' });
  }
});

// READ - Get all client profiles with optional filtering
router.get('/', async (req, res) => {
  try {
    const { is_active = 'true', search, limit = 50, offset = 0 } = req.query;

    let query = db.collection('client_profiles');

    // Filter by active status
    if (is_active !== 'all') {
      query = query.where('is_active', '==', is_active === 'true');
    }

    // Apply pagination
    query = query.orderBy('created_at', 'desc')
                 .limit(parseInt(limit))
                 .offset(parseInt(offset));

    const snapshot = await query.get();
    let clientProfiles = [];

    snapshot.forEach(doc => {
      clientProfiles.push({
        id: doc.id,
        ...doc.data(),
        date_of_birth: doc.data().date_of_birth?.toDate(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate()
      });
    });

    // Client-side search filtering (Firestore doesn't support complex text search)
    if (search) {
      const searchLower = search.toLowerCase();
      clientProfiles = clientProfiles.filter(profile =>
        profile.full_name.toLowerCase().includes(searchLower) ||
        profile.email_address.toLowerCase().includes(searchLower) ||
        profile.mobile_number.includes(search)
      );
    }

    res.json({
      client_profiles: clientProfiles,
      count: clientProfiles.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching client profiles:', error);
    res.status(500).json({ error: 'Failed to fetch client profiles' });
  }
});

// READ - Get specific client profile by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await db.collection('client_profiles').doc(req.params.id).get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const data = doc.data();
    res.json({
      id: doc.id,
      ...data,
      date_of_birth: data.date_of_birth?.toDate(),
      created_at: data.created_at?.toDate(),
      updated_at: data.updated_at?.toDate()
    });
  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({ error: 'Failed to fetch client profile' });
  }
});

// UPDATE - Update client profile
router.put('/:id', async (req, res) => {
  try {
    const clientProfileRef = db.collection('client_profiles').doc(req.params.id);
    const doc = await clientProfileRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const {
      full_name,
      date_of_birth,
      sex,
      age,
      mobile_number,
      email_address,
      postal_address,
      emergency_contacts,
      notes,
      medical_conditions,
      allergies,
      medications,
      accessibility_needs,
      latest_vitals
    } = req.body;

    // Validate sex field if provided
    if (sex && !['Male', 'Female', 'Other', 'Prefer not to say'].includes(sex)) {
      return res.status(400).json({
        error: 'sex must be one of: Male, Female, Other, Prefer not to say'
      });
    }

    // Validate emergency contacts format if provided
    if (emergency_contacts && !Array.isArray(emergency_contacts)) {
      return res.status(400).json({
        error: 'emergency_contacts must be an array of objects'
      });
    }

    // Validate latest vitals format if provided
    if (latest_vitals && typeof latest_vitals !== 'object') {
      return res.status(400).json({
        error: 'latest_vitals must be an object'
      });
    }

    const updateData = {
      updated_at: new Date()
    };

    // Only update provided fields
    if (full_name !== undefined) updateData.full_name = full_name;
    if (date_of_birth !== undefined) {
      updateData.date_of_birth = new Date(date_of_birth);
      // Recalculate age if date_of_birth is updated
      const birthDate = new Date(date_of_birth);
      updateData.age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }
    if (sex !== undefined) updateData.sex = sex;
    if (age !== undefined) updateData.age = parseInt(age);
    if (mobile_number !== undefined) updateData.mobile_number = mobile_number;
    if (email_address !== undefined) updateData.email_address = email_address;
    if (postal_address !== undefined) updateData.postal_address = postal_address;
    if (emergency_contacts !== undefined) updateData.emergency_contacts = emergency_contacts;
    if (notes !== undefined) updateData.notes = notes;
    if (medical_conditions !== undefined) updateData.medical_conditions = medical_conditions;
    if (allergies !== undefined) updateData.allergies = allergies;
    if (medications !== undefined) updateData.medications = medications;
    if (accessibility_needs !== undefined) updateData.accessibility_needs = accessibility_needs;
    if (latest_vitals !== undefined) updateData.latest_vitals = latest_vitals;

    await clientProfileRef.update(updateData);

    // Get updated document
    const updatedDoc = await clientProfileRef.get();
    const data = updatedDoc.data();

    res.json({
      message: 'Client profile updated successfully',
      data: {
        id: updatedDoc.id,
        ...data,
        date_of_birth: data.date_of_birth?.toDate(),
        created_at: data.created_at?.toDate(),
        updated_at: data.updated_at?.toDate()
      }
    });
  } catch (error) {
    console.error('Error updating client profile:', error);
    res.status(500).json({ error: 'Failed to update client profile' });
  }
});

// UPDATE - Update latest vitals specifically
router.patch('/:id/vitals', async (req, res) => {
  try {
    const clientProfileRef = db.collection('client_profiles').doc(req.params.id);
    const doc = await clientProfileRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const {
      heart_rate,
      blood_pressure,
      oxygen_saturation,
      temperature,
      recorded_date
    } = req.body;

    // Validation
    if (!heart_rate && !blood_pressure && !oxygen_saturation && !temperature) {
      return res.status(400).json({
        error: 'At least one vital sign must be provided'
      });
    }

    const vitalsData = {
      recorded_date: recorded_date ? new Date(recorded_date) : new Date()
    };

    if (heart_rate !== undefined) vitalsData.heart_rate = parseInt(heart_rate);
    if (blood_pressure !== undefined) vitalsData.blood_pressure = blood_pressure;
    if (oxygen_saturation !== undefined) vitalsData.oxygen_saturation = parseFloat(oxygen_saturation);
    if (temperature !== undefined) vitalsData.temperature = parseFloat(temperature);

    const updateData = {
      latest_vitals: vitalsData,
      updated_at: new Date()
    };

    await clientProfileRef.update(updateData);

    res.json({
      message: 'Client vitals updated successfully',
      vitals: vitalsData
    });
  } catch (error) {
    console.error('Error updating client vitals:', error);
    res.status(500).json({ error: 'Failed to update client vitals' });
  }
});

// SOFT DELETE - Deactivate client profile
router.delete('/:id', async (req, res) => {
  try {
    const clientProfileRef = db.collection('client_profiles').doc(req.params.id);
    const doc = await clientProfileRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const updateData = {
      is_active: false,
      updated_at: new Date()
    };

    await clientProfileRef.update(updateData);

    res.json({
      message: 'Client profile deactivated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error deactivating client profile:', error);
    res.status(500).json({ error: 'Failed to deactivate client profile' });
  }
});

// REACTIVATE - Reactivate a soft-deleted client profile
router.patch('/:id/reactivate', async (req, res) => {
  try {
    const clientProfileRef = db.collection('client_profiles').doc(req.params.id);
    const doc = await clientProfileRef.get();

    if (!doc.exists) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const updateData = {
      is_active: true,
      updated_at: new Date()
    };

    await clientProfileRef.update(updateData);

    res.json({
      message: 'Client profile reactivated successfully',
      id: req.params.id
    });
  } catch (error) {
    console.error('Error reactivating client profile:', error);
    res.status(500).json({ error: 'Failed to reactivate client profile' });
  }
});

// SEARCH - Advanced search for client profiles
router.post('/search', async (req, res) => {
  try {
    const {
      full_name,
      email_address,
      mobile_number,
      age_min,
      age_max,
      sex,
      has_medical_conditions,
      is_active = true,
      limit = 50
    } = req.body;

    let query = db.collection('client_profiles');

    // Filter by active status
    query = query.where('is_active', '==', is_active);

    // Apply filters
    if (sex) {
      query = query.where('sex', '==', sex);
    }

    if (age_min || age_max) {
      if (age_min) query = query.where('age', '>=', parseInt(age_min));
      if (age_max) query = query.where('age', '<=', parseInt(age_max));
    }

    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    let clientProfiles = [];

    snapshot.forEach(doc => {
      clientProfiles.push({
        id: doc.id,
        ...doc.data(),
        date_of_birth: doc.data().date_of_birth?.toDate(),
        created_at: doc.data().created_at?.toDate(),
        updated_at: doc.data().updated_at?.toDate()
      });
    });

    // Additional client-side filtering
    if (full_name) {
      const nameLower = full_name.toLowerCase();
      clientProfiles = clientProfiles.filter(profile =>
        profile.full_name.toLowerCase().includes(nameLower)
      );
    }

    if (email_address) {
      const emailLower = email_address.toLowerCase();
      clientProfiles = clientProfiles.filter(profile =>
        profile.email_address.toLowerCase().includes(emailLower)
      );
    }

    if (mobile_number) {
      clientProfiles = clientProfiles.filter(profile =>
        profile.mobile_number.includes(mobile_number)
      );
    }

    if (has_medical_conditions !== undefined) {
      clientProfiles = clientProfiles.filter(profile =>
        has_medical_conditions
          ? profile.medical_conditions && profile.medical_conditions.trim() !== ''
          : !profile.medical_conditions || profile.medical_conditions.trim() === ''
      );
    }

    res.json({
      client_profiles: clientProfiles,
      count: clientProfiles.length,
      search_criteria: req.body
    });
  } catch (error) {
    console.error('Error searching client profiles:', error);
    res.status(500).json({ error: 'Failed to search client profiles' });
  }
});

module.exports = router;