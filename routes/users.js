const express = require('express');
const { db, auth } = require('../config/firebase');
const { verifyToken } = require('../middleware/auth');

const router = express.Router();

// Debug logging
console.log('Users router created');

// Debug route WITHOUT auth (before middleware)
router.get('/test-no-auth', (req, res) => {
  res.json({ message: 'Users route is working without auth!' });
});

// Apply auth middleware to remaining routes
router.use(verifyToken);

// Debug route WITH auth
router.get('/test', (req, res) => {
  res.json({ message: 'Users route is working with auth!', user: req.user });
});

// CREATE/UPDATE - Set client profile for current user's client
router.put('/client-profile', async (req, res) => {
  try {
    const userId = req.user.uid;

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

    // Get Firebase Auth user data (if available)
    let userRecord = null;
    try {
      userRecord = await auth.getUser(userId);
    } catch (error) {
      console.log('Could not fetch user record from Firebase Auth, using token data');
    }

    // Prepare user document data
    const userDocData = {
      uid: userId,
      email: userRecord?.email || req.user.email || null,
      displayName: userRecord?.displayName || req.user.name || 'Test Guardian User',
      emailVerified: userRecord?.emailVerified || false,
      created_at: userRecord?.metadata ? new Date(userRecord.metadata.creationTime) : new Date(),
      updated_at: new Date(),
      client_profile: clientProfileData
    };

    // Check if user document exists
    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (userDoc.exists) {
      // Update existing user document with new client profile
      await userDocRef.update({
        client_profile: clientProfileData,
        updated_at: new Date()
      });
    } else {
      // Create new user document with client profile
      await userDocRef.set(userDocData);
    }

    res.status(200).json({
      message: 'Client profile updated successfully',
      data: {
        user_id: userId,
        client_profile: {
          ...clientProfileData,
          date_of_birth: clientProfileData.date_of_birth.toISOString(),
          created_at: clientProfileData.created_at.toISOString(),
          updated_at: clientProfileData.updated_at.toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error updating client profile:', error);
    res.status(500).json({ error: 'Failed to update client profile' });
  }
});

// READ - Get current user's client profile
router.get('/client-profile', async (req, res) => {
  try {
    const userId = req.user.uid;

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists || !userDoc.data().client_profile) {
      return res.status(404).json({
        error: 'Client profile not found',
        message: 'No client profile has been set up for this user'
      });
    }

    const userData = userDoc.data();
    const clientProfile = userData.client_profile;

    const response = {
      user_id: userId,
      client_profile: {
        ...clientProfile,
        date_of_birth: clientProfile.date_of_birth?.toDate(),
        created_at: clientProfile.created_at?.toDate(),
        updated_at: clientProfile.updated_at?.toDate()
      }
    };

    res.json(response);
  } catch (error) {
    console.error('Error fetching client profile:', error);
    res.status(500).json({ error: 'Failed to fetch client profile' });
  }
});

// UPDATE - Update specific fields in client profile
router.patch('/client-profile', async (req, res) => {
  try {
    const userId = req.user.uid;

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    if (!userData.client_profile) {
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

    const updatedClientProfile = { ...userData.client_profile };
    updatedClientProfile.updated_at = new Date();

    // Only update provided fields
    if (full_name !== undefined) updatedClientProfile.full_name = full_name;
    if (date_of_birth !== undefined) {
      updatedClientProfile.date_of_birth = new Date(date_of_birth);
      // Recalculate age if date_of_birth is updated
      const birthDate = new Date(date_of_birth);
      updatedClientProfile.age = Math.floor((new Date() - birthDate) / (365.25 * 24 * 60 * 60 * 1000));
    }
    if (sex !== undefined) updatedClientProfile.sex = sex;
    if (age !== undefined) updatedClientProfile.age = parseInt(age);
    if (mobile_number !== undefined) updatedClientProfile.mobile_number = mobile_number;
    if (email_address !== undefined) updatedClientProfile.email_address = email_address;
    if (postal_address !== undefined) updatedClientProfile.postal_address = postal_address;
    if (emergency_contacts !== undefined) updatedClientProfile.emergency_contacts = emergency_contacts;
    if (notes !== undefined) updatedClientProfile.notes = notes;
    if (medical_conditions !== undefined) updatedClientProfile.medical_conditions = medical_conditions;
    if (allergies !== undefined) updatedClientProfile.allergies = allergies;
    if (medications !== undefined) updatedClientProfile.medications = medications;
    if (accessibility_needs !== undefined) updatedClientProfile.accessibility_needs = accessibility_needs;
    if (latest_vitals !== undefined) updatedClientProfile.latest_vitals = latest_vitals;

    await userDocRef.update({
      client_profile: updatedClientProfile,
      updated_at: new Date()
    });

    res.json({
      message: 'Client profile updated successfully',
      data: {
        user_id: userId,
        client_profile: {
          ...updatedClientProfile,
          date_of_birth: updatedClientProfile.date_of_birth?.toDate ? updatedClientProfile.date_of_birth.toDate() : updatedClientProfile.date_of_birth,
          created_at: updatedClientProfile.created_at?.toDate ? updatedClientProfile.created_at.toDate() : updatedClientProfile.created_at,
          updated_at: updatedClientProfile.updated_at?.toDate ? updatedClientProfile.updated_at.toDate() : updatedClientProfile.updated_at
        }
      }
    });
  } catch (error) {
    console.error('Error updating client profile:', error);
    res.status(500).json({ error: 'Failed to update client profile' });
  }
});


// SOFT DELETE - Deactivate client profile
router.delete('/client-profile', async (req, res) => {
  try {
    const userId = req.user.uid;

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    if (!userData.client_profile) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const updatedClientProfile = { ...userData.client_profile };
    updatedClientProfile.is_active = false;
    updatedClientProfile.updated_at = new Date();

    await userDocRef.update({
      client_profile: updatedClientProfile,
      updated_at: new Date()
    });

    res.json({
      message: 'Client profile deactivated successfully',
      user_id: userId
    });
  } catch (error) {
    console.error('Error deactivating client profile:', error);
    res.status(500).json({ error: 'Failed to deactivate client profile' });
  }
});

// REACTIVATE - Reactivate a soft-deleted client profile
router.patch('/client-profile/reactivate', async (req, res) => {
  try {
    const userId = req.user.uid;

    const userDocRef = db.collection('users').doc(userId);
    const userDoc = await userDocRef.get();

    if (!userDoc.exists) {
      return res.status(404).json({ error: 'User profile not found' });
    }

    const userData = userDoc.data();
    if (!userData.client_profile) {
      return res.status(404).json({ error: 'Client profile not found' });
    }

    const updatedClientProfile = { ...userData.client_profile };
    updatedClientProfile.is_active = true;
    updatedClientProfile.updated_at = new Date();

    await userDocRef.update({
      client_profile: updatedClientProfile,
      updated_at: new Date()
    });

    res.json({
      message: 'Client profile reactivated successfully',
      user_id: userId
    });
  } catch (error) {
    console.error('Error reactivating client profile:', error);
    res.status(500).json({ error: 'Failed to reactivate client profile' });
  }
});

// ADMIN ROUTES - For accessing all users with client profiles (if needed)

// ADMIN ROUTES - Get all users with client profiles (admin only - you may want to add role-based auth)
router.get('/all-client-profiles', async (req, res) => {
  try {
    const { is_active = 'true', search, limit = 50, offset = 0 } = req.query;

    let query = db.collection('users').where('client_profile', '!=', null);

    // Apply pagination
    query = query.orderBy('client_profile.created_at', 'desc')
                 .limit(parseInt(limit))
                 .offset(parseInt(offset));

    const snapshot = await query.get();
    let users = [];

    snapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.client_profile) {
        // Filter by active status
        if (is_active !== 'all' && userData.client_profile.is_active !== (is_active === 'true')) {
          return;
        }

        users.push({
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          client_profile: {
            ...userData.client_profile,
            date_of_birth: userData.client_profile.date_of_birth?.toDate(),
            created_at: userData.client_profile.created_at?.toDate(),
            updated_at: userData.client_profile.updated_at?.toDate()
          }
        });
      }
    });

    // Client-side search filtering
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(user =>
        user.client_profile.full_name.toLowerCase().includes(searchLower) ||
        user.client_profile.email_address.toLowerCase().includes(searchLower) ||
        user.client_profile.mobile_number.includes(search)
      );
    }

    res.json({
      users_with_client_profiles: users,
      count: users.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset)
      }
    });
  } catch (error) {
    console.error('Error fetching users with client profiles:', error);
    res.status(500).json({ error: 'Failed to fetch users with client profiles' });
  }
});

// SEARCH - Advanced search for users with client profiles
router.post('/search-client-profiles', async (req, res) => {
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

    let query = db.collection('users').where('client_profile', '!=', null);
    query = query.limit(parseInt(limit));

    const snapshot = await query.get();
    let users = [];

    snapshot.forEach(doc => {
      const userData = doc.data();
      if (userData.client_profile) {
        const profile = userData.client_profile;

        // Apply filters
        if (profile.is_active !== is_active) return;
        if (sex && profile.sex !== sex) return;
        if (age_min && profile.age < parseInt(age_min)) return;
        if (age_max && profile.age > parseInt(age_max)) return;

        // Text-based filters
        if (full_name && !profile.full_name.toLowerCase().includes(full_name.toLowerCase())) return;
        if (email_address && !profile.email_address.toLowerCase().includes(email_address.toLowerCase())) return;
        if (mobile_number && !profile.mobile_number.includes(mobile_number)) return;

        if (has_medical_conditions !== undefined) {
          const hasMedical = profile.medical_conditions && profile.medical_conditions.trim() !== '';
          if (has_medical_conditions !== hasMedical) return;
        }

        users.push({
          uid: userData.uid,
          email: userData.email,
          displayName: userData.displayName,
          client_profile: {
            ...profile,
            date_of_birth: profile.date_of_birth?.toDate(),
            created_at: profile.created_at?.toDate(),
            updated_at: profile.updated_at?.toDate()
          }
        });
      }
    });

    res.json({
      users_with_client_profiles: users,
      count: users.length,
      search_criteria: req.body
    });
  } catch (error) {
    console.error('Error searching users with client profiles:', error);
    res.status(500).json({ error: 'Failed to search users with client profiles' });
  }
});

module.exports = router;