const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// 1. User Registration
router.post('/register', async (req, res) => {
  const { email, password, role, firstName, lastName, birthDate, gender, phone, address, specialty } = req.body;

  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password, and role are required.' });
  }

  if (!['patient', 'doctor', 'admin'].includes(role)) {
    return res.status(400).json({ message: 'Invalid role specified.' });
  }

  // Validate patient specific inputs
  if (role === 'patient' && (!firstName || !lastName || !birthDate || !gender)) {
    return res.status(400).json({ message: 'First name, last name, birth date, and gender are required for patients.' });
  }

  // Validate doctor specific inputs
  if (role === 'doctor' && (!firstName || !lastName || !specialty)) {
    return res.status(400).json({ message: 'First name, last name, and specialty are required for doctors.' });
  }

  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Check if user already exists
    const [existing] = await connection.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      await connection.rollback();
      return res.status(400).json({ message: 'A user with this email already exists.' });
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Insert user
    const [uResult] = await connection.query(
      'INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
      [email, passwordHash, role]
    );
    const userId = uResult.insertId;

    // Create profile based on role
    if (role === 'patient') {
      const fhirId = `pat-${firstName.toLowerCase()}-${lastName.toLowerCase()}-${Date.now().toString().slice(-4)}`;
      await connection.query(
        'INSERT INTO patients (user_id, first_name, last_name, birth_date, gender, phone, address, fhir_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [userId, firstName, lastName, birthDate, gender, phone || null, address || null, fhirId]
      );
    } else if (role === 'doctor') {
      await connection.query(
        'INSERT INTO doctors (user_id, first_name, last_name, specialty, phone) VALUES (?, ?, ?, ?, ?)',
        [userId, firstName, lastName, specialty, phone || null]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'User registered successfully.' });

  } catch (error) {
    await connection.rollback();
    console.error('Registration error:', error);
    res.status(500).json({ message: 'Server error during registration.', error: error.message });
  } finally {
    connection.release();
  }
});

// 2. User Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    // Fetch user details
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    const user = users[0];

    // Verify password
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // Attach role-specific data
    let roleDetails = {};
    if (user.role === 'patient') {
      const [patients] = await db.query('SELECT * FROM patients WHERE user_id = ?', [user.id]);
      if (patients.length > 0) {
        roleDetails = { patientId: patients[0].id, fhirId: patients[0].fhir_id, name: `${patients[0].first_name} ${patients[0].last_name}` };
      }
    } else if (user.role === 'doctor') {
      const [doctors] = await db.query('SELECT * FROM doctors WHERE user_id = ?', [user.id]);
      if (doctors.length > 0) {
        roleDetails = { doctorId: doctors[0].id, name: `${doctors[0].first_name} ${doctors[0].last_name}`, specialty: doctors[0].specialty };
      }
    }

    // Generate JWT
    const tokenPayload = {
      userId: user.id,
      email: user.email,
      role: user.role,
      ...roleDetails
    };

    const token = jwt.sign(
      tokenPayload,
      process.env.JWT_SECRET || 'supersecretjwtkeyforhealthsystem',
      { expiresIn: '24h' }
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        ...roleDetails
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error during login.', error: error.message });
  }
});

// 3. Get current authenticated user details
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    // Fetch fresh details from DB
    const [uRows] = await db.query('SELECT id, email, role, created_at FROM users WHERE id = ?', [user.userId]);
    if (uRows.length === 0) {
      return res.status(404).json({ message: 'User not found.' });
    }

    const userData = uRows[0];
    let details = {};

    if (userData.role === 'patient') {
      const [pRows] = await db.query('SELECT * FROM patients WHERE user_id = ?', [userData.id]);
      if (pRows.length > 0) {
        details = { patient: pRows[0] };
      }
    } else if (userData.role === 'doctor') {
      const [dRows] = await db.query('SELECT * FROM doctors WHERE user_id = ?', [userData.id]);
      if (dRows.length > 0) {
        details = { doctor: dRows[0] };
      }
    }

    res.json({
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        createdAt: userData.created_at,
        ...details
      }
    });

  } catch (error) {
    console.error('Me endpoint error:', error);
    res.status(500).json({ message: 'Server error fetching profile details.' });
  }
});

module.exports = router;
