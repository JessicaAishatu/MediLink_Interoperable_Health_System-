const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// 1. Get All Patients (Doctors and Admins only)
router.get('/', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res) => {
  const { search, gender } = req.query;
  try {
    let query = 'SELECT * FROM patients';
    let params = [];
    let conditions = [];

    if (search) {
      conditions.push('(first_name LIKE ? OR last_name LIKE ? OR fhir_id LIKE ?)');
      const wildCard = `%${search}%`;
      params.push(wildCard, wildCard, wildCard);
    }

    if (gender) {
      conditions.push('gender = ?');
      params.push(gender);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY last_name ASC, first_name ASC';

    const [patients] = await db.query(query, params);
    res.json(patients);

  } catch (error) {
    console.error('Fetch patients error:', error);
    res.status(500).json({ message: 'Server error retrieving patients list.' });
  }
});

// 2. Get Patient by ID (Patient can view their own, Doctors/Admins can view any)
router.get('/:id', authenticateToken, async (req, res) => {
  const patientId = req.params.id;
  const user = req.user;

  // RBAC checks: if user is patient, they can only request their own ID
  if (user.role === 'patient' && String(user.patientId) !== String(patientId)) {
    return res.status(403).json({ message: 'Access denied. You can only access your own records.' });
  }

  try {
    const [patients] = await db.query('SELECT * FROM patients WHERE id = ?', [patientId]);
    if (patients.length === 0) {
      return res.status(404).json({ message: 'Patient not found.' });
    }
    res.json(patients[0]);

  } catch (error) {
    console.error('Fetch patient by ID error:', error);
    res.status(500).json({ message: 'Server error retrieving patient details.' });
  }
});

// 3. Register New Patient Demographics (Doctors/Admins only)
router.post('/', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res) => {
  const { firstName, lastName, birthDate, gender, phone, address } = req.body;

  if (!firstName || !lastName || !birthDate || !gender) {
    return res.status(400).json({ message: 'First name, last name, birth date, and gender are required.' });
  }

  try {
    const fhirId = `pat-${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Date.now().toString().slice(-4)}`;
    const [result] = await db.query(
      'INSERT INTO patients (first_name, last_name, birth_date, gender, phone, address, fhir_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [firstName, lastName, birthDate, gender, phone || null, address || null, fhirId]
    );

    res.status(201).json({
      message: 'Patient record created successfully.',
      patientId: result.insertId,
      fhirId
    });

  } catch (error) {
    console.error('Create patient error:', error);
    res.status(500).json({ message: 'Server error creating patient record.', error: error.message });
  }
});

// 4. Update Patient Demographics (Patient can update own, Doctors/Admins can update any)
router.put('/:id', authenticateToken, async (req, res) => {
  const patientId = req.params.id;
  const user = req.user;
  const { firstName, lastName, birthDate, gender, phone, address } = req.body;

  if (user.role === 'patient' && String(user.patientId) !== String(patientId)) {
    return res.status(403).json({ message: 'Access denied. You can only update your own records.' });
  }

  if (!firstName || !lastName || !birthDate || !gender) {
    return res.status(400).json({ message: 'First name, last name, birth date, and gender are required.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE patients SET first_name = ?, last_name = ?, birth_date = ?, gender = ?, phone = ?, address = ? WHERE id = ?',
      [firstName, lastName, birthDate, gender, phone || null, address || null, patientId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Patient not found.' });
    }

    res.json({ message: 'Patient details updated successfully.' });

  } catch (error) {
    console.error('Update patient error:', error);
    res.status(500).json({ message: 'Server error updating patient details.' });
  }
});

module.exports = router;
