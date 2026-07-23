const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken, authorizeRoles } = require('../middleware/auth');

// HELPER: Validate that the patient is authorized to view or edit this resource
const checkPatientAccess = (req, res, patientId) => {
  const user = req.user;
  if (user.role === 'patient' && String(user.patientId) !== String(patientId)) {
    return false;
  }
  return true;
};

// ==========================================
// 1. APPOINTMENTS ROUTES
// ==========================================

// Get appointments
router.get('/appointments', authenticateToken, async (req, res) => {
  const user = req.user;
  try {
    let query = `
      SELECT a.*, 
             p.first_name as patient_first, p.last_name as patient_last,
             d.first_name as doctor_first, d.last_name as doctor_last, d.specialty
      FROM appointments a
      JOIN patients p ON a.patient_id = p.id
      JOIN doctors d ON a.doctor_id = d.id
    `;
    let params = [];

    if (user.role === 'patient') {
      query += ' WHERE a.patient_id = ?';
      params.push(user.patientId);
    } else if (user.role === 'doctor') {
      query += ' WHERE a.doctor_id = ?';
      params.push(user.doctorId);
    }

    query += ' ORDER BY a.appointment_date DESC';

    const [appointments] = await db.query(query, params);
    res.json(appointments);

  } catch (error) {
    console.error('Fetch appointments error:', error);
    res.status(500).json({ message: 'Server error retrieving appointments.' });
  }
});

// Book appointment
router.post('/appointments', authenticateToken, async (req, res) => {
  const { patientId, doctorId, appointmentDate, reason } = req.body;
  const user = req.user;

  // Patient can only book for themselves, doctor/admin can book for any patient
  if (!checkPatientAccess(req, res, patientId)) {
    return res.status(403).json({ message: 'Access denied. You can only schedule appointments for yourself.' });
  }

  if (!patientId || !doctorId || !appointmentDate) {
    return res.status(400).json({ message: 'Patient ID, Doctor ID, and Appointment Date are required.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason) VALUES (?, ?, ?, "scheduled", ?)',
      [patientId, doctorId, appointmentDate, reason || null]
    );

    res.status(201).json({
      message: 'Appointment booked successfully.',
      appointmentId: result.insertId
    });

  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ message: 'Server error booking appointment.', error: error.message });
  }
});

// Update appointment status / notes
router.put('/appointments/:id', authenticateToken, async (req, res) => {
  const appointmentId = req.params.id;
  const { status, notes } = req.body;
  const user = req.user;

  try {
    // Fetch appointment to check ownership
    const [appointments] = await db.query('SELECT * FROM appointments WHERE id = ?', [appointmentId]);
    if (appointments.length === 0) {
      return res.status(404).json({ message: 'Appointment not found.' });
    }

    const appt = appointments[0];

    // Patients can only cancel their appointments. Doctors/admins can update status and notes.
    if (user.role === 'patient') {
      if (String(user.patientId) !== String(appt.patient_id)) {
        return res.status(403).json({ message: 'Access denied.' });
      }
      if (status !== 'cancelled') {
        return res.status(400).json({ message: 'Patients can only cancel appointments.' });
      }
      await db.query('UPDATE appointments SET status = "cancelled" WHERE id = ?', [appointmentId]);
    } else {
      // Doctor or Admin
      await db.query(
        'UPDATE appointments SET status = ?, notes = ? WHERE id = ?',
        [status || appt.status, notes !== undefined ? notes : appt.notes, appointmentId]
      );
    }

    res.json({ message: 'Appointment updated successfully.' });

  } catch (error) {
    console.error('Update appointment error:', error);
    res.status(500).json({ message: 'Server error updating appointment.' });
  }
});


// ==========================================
// 2. MEDICAL HISTORY ROUTES
// ==========================================

// Get Medical History for a patient
router.get('/medical-history/:patientId', authenticateToken, async (req, res) => {
  const patientId = req.params.patientId;

  if (!checkPatientAccess(req, res, patientId)) {
    return res.status(403).json({ message: 'Access denied. You can only view your own medical history.' });
  }

  try {
    const [history] = await db.query(
      'SELECT * FROM medical_histories WHERE patient_id = ? ORDER BY onset_date DESC',
      [patientId]
    );
    res.json(history);

  } catch (error) {
    console.error('Fetch medical history error:', error);
    res.status(500).json({ message: 'Server error retrieving medical history.' });
  }
});

// Add Condition to Medical History (Doctors and Admins only)
router.post('/medical-history', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res) => {
  const { patientId, conditionName, onsetDate, status, notes } = req.body;

  if (!patientId || !conditionName) {
    return res.status(400).json({ message: 'Patient ID and Condition Name are required.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO medical_histories (patient_id, condition_name, onset_date, status, notes) VALUES (?, ?, ?, ?, ?)',
      [patientId, conditionName, onsetDate || null, status || 'active', notes || null]
    );

    res.status(201).json({
      message: 'Condition added to medical history.',
      historyId: result.insertId
    });

  } catch (error) {
    console.error('Add medical history error:', error);
    res.status(500).json({ message: 'Server error adding condition.' });
  }
});


// ==========================================
// 3. LAB RESULTS & REQUESTS ROUTES
// ==========================================

// Get Lab Results for a patient
router.get('/lab-results/:patientId', authenticateToken, async (req, res) => {
  const patientId = req.params.patientId;

  if (!checkPatientAccess(req, res, patientId)) {
    return res.status(403).json({ message: 'Access denied. You can only view your own lab results.' });
  }

  try {
    const [results] = await db.query(
      'SELECT * FROM lab_results WHERE patient_id = ? ORDER BY test_date DESC',
      [patientId]
    );
    res.json(results);

  } catch (error) {
    console.error('Fetch lab results error:', error);
    res.status(500).json({ message: 'Server error retrieving lab results.' });
  }
});

// Request new lab test (Doctors/Admins only)
router.post('/lab-requests', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res) => {
  const { patientId, testName, testDate } = req.body;

  if (!patientId || !testName) {
    return res.status(400).json({ message: 'Patient ID and Test Name are required.' });
  }

  try {
    const dateOfTest = testDate || new Date().toISOString().slice(0, 10);
    const [result] = await db.query(
      'INSERT INTO lab_results (patient_id, test_name, test_date, result_value, result_unit, reference_range, status) VALUES (?, ?, ?, "Pending", "N/A", "Pending", "requested")',
      [patientId, testName, dateOfTest]
    );

    res.status(201).json({
      message: 'Lab test requested successfully.',
      labId: result.insertId
    });

  } catch (error) {
    console.error('Request lab error:', error);
    res.status(500).json({ message: 'Server error creating lab request.' });
  }
});

// Input lab test values / complete request (Doctors/Admins only)
router.put('/lab-results/:id', authenticateToken, authorizeRoles('doctor', 'admin'), async (req, res) => {
  const labId = req.params.id;
  const { resultValue, resultUnit, referenceRange, status } = req.body;

  if (!resultValue || !resultUnit) {
    return res.status(400).json({ message: 'Result value and unit are required.' });
  }

  try {
    const [result] = await db.query(
      'UPDATE lab_results SET result_value = ?, result_unit = ?, reference_range = ?, status = ? WHERE id = ?',
      [resultValue, resultUnit, referenceRange || null, status || 'completed', labId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Lab record not found.' });
    }

    res.json({ message: 'Lab result submitted successfully.' });

  } catch (error) {
    console.error('Update lab error:', error);
    res.status(500).json({ message: 'Server error saving lab results.' });
  }
});


// ==========================================
// 4. PRESCRIPTIONS ROUTES
// ==========================================

// Get Prescriptions for a patient
router.get('/prescriptions/:patientId', authenticateToken, async (req, res) => {
  const patientId = req.params.patientId;

  if (!checkPatientAccess(req, res, patientId)) {
    return res.status(403).json({ message: 'Access denied. You can only view your own prescriptions.' });
  }

  try {
    const [prescriptions] = await db.query(`
      SELECT pr.*, d.first_name as doctor_first, d.last_name as doctor_last
      FROM prescriptions pr
      JOIN doctors d ON pr.doctor_id = d.id
      WHERE pr.patient_id = ?
      ORDER BY pr.start_date DESC
    `, [patientId]);
    res.json(prescriptions);

  } catch (error) {
    console.error('Fetch prescriptions error:', error);
    res.status(500).json({ message: 'Server error retrieving prescriptions.' });
  }
});

// Write a prescription (Doctors only)
router.post('/prescriptions', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  const doctorId = req.user.doctorId;
  const { patientId, medicationName, dosage, frequency, startDate, endDate, instructions } = req.body;

  if (!patientId || !medicationName || !dosage || !frequency || !startDate) {
    return res.status(400).json({ message: 'Patient ID, Medication Name, Dosage, Frequency, and Start Date are required.' });
  }

  try {
    const [result] = await db.query(
      'INSERT INTO prescriptions (patient_id, doctor_id, medication_name, dosage, frequency, start_date, end_date, instructions) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [patientId, doctorId, medicationName, dosage, frequency, startDate, endDate || null, instructions || null]
    );

    res.status(201).json({
      message: 'Prescription issued successfully.',
      prescriptionId: result.insertId
    });

  } catch (error) {
    console.error('Issue prescription error:', error);
    res.status(500).json({ message: 'Server error issuing prescription.', error: error.message });
  }
});

// End / Deactivate prescription (Doctors only)
router.put('/prescriptions/:id', authenticateToken, authorizeRoles('doctor'), async (req, res) => {
  const prescriptionId = req.params.id;
  const { endDate } = req.body;
  const today = endDate || new Date().toISOString().slice(0, 10);

  try {
    const [result] = await db.query(
      'UPDATE prescriptions SET end_date = ? WHERE id = ?',
      [today, prescriptionId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: 'Prescription not found.' });
    }

    res.json({ message: 'Prescription deactivated successfully.' });

  } catch (error) {
    console.error('Update prescription error:', error);
    res.status(500).json({ message: 'Server error deactivating prescription.' });
  }
});

module.exports = router;
