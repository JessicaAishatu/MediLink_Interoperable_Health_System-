const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function setupDatabase() {
  console.log('Connecting to MySQL host...');
  
  // Connection details from env
  const config = {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true
  };

  let connection;
  try {
    connection = await mysql.createConnection(config);
    console.log('Connected to MySQL server.');

    // Read the schema.sql file
    const schemaPath = path.join(__dirname, '../database/schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    console.log('Initializing database schema...');
    await connection.query(schemaSql);
    console.log('Database and tables created successfully.');

    // Select the database
    await connection.query('USE health_system;');

    // Seed mock data
    console.log('Checking existing data...');
    const [users] = await connection.query('SELECT COUNT(*) as count FROM users');
    
    if (users[0].count === 0) {
      console.log('Seeding initial mock data...');

      const saltRounds = 10;
      const doc1Hash = await bcrypt.hash('password123', saltRounds);
      const doc2Hash = await bcrypt.hash('password123', saltRounds);
      const pat1Hash = await bcrypt.hash('password123', saltRounds);
      const pat2Hash = await bcrypt.hash('password123', saltRounds);
      const adminHash = await bcrypt.hash('adminpassword', saltRounds);

      // 1. Insert users
      const [uRes] = await connection.query(`
        INSERT INTO users (email, password_hash, role) VALUES
        ('dr.doe@health.com', ?, 'doctor'),
        ('dr.smith@health.com', ?, 'doctor'),
        ('alice@health.com', ?, 'patient'),
        ('bob@health.com', ?, 'patient'),
        ('admin@health.com', ?, 'admin');
      `, [doc1Hash, doc2Hash, pat1Hash, pat2Hash, adminHash]);
      
      const [userRows] = await connection.query('SELECT id, email, role FROM users');
      const userMap = {};
      userRows.forEach(row => {
        userMap[row.email] = row.id;
      });

      // 2. Insert doctors
      await connection.query(`
        INSERT INTO doctors (user_id, first_name, last_name, specialty, phone) VALUES
        (?, 'John', 'Doe', 'Cardiology', '+1-555-0199'),
        (?, 'Jane', 'Smith', 'Pediatrics', '+1-555-0188');
      `, [userMap['dr.doe@health.com'], userMap['dr.smith@health.com']]);

      const [doctorRows] = await connection.query('SELECT id, last_name FROM doctors');
      const doctorMap = {};
      doctorRows.forEach(row => {
        doctorMap[row.last_name] = row.id;
      });

      // 3. Insert patients
      await connection.query(`
        INSERT INTO patients (user_id, first_name, last_name, birth_date, gender, phone, address, fhir_id) VALUES
        (?, 'Alice', 'Johnson', '1994-06-15', 'Female', '+1-555-0101', '123 Main St, Metro City', 'pat-alice-johnson'),
        (?, 'Bob', 'Miller', '1981-11-23', 'Male', '+1-555-0102', '456 Oak Rd, Pine Hill', 'pat-bob-miller');
      `, [userMap['alice@health.com'], userMap['bob@health.com']]);

      const [patientRows] = await connection.query('SELECT id, last_name FROM patients');
      const patientMap = {};
      patientRows.forEach(row => {
        patientMap[row.last_name] = row.id;
      });

      // 4. Insert appointments
      await connection.query(`
        INSERT INTO appointments (patient_id, doctor_id, appointment_date, status, reason, notes) VALUES
        (?, ?, NOW() + INTERVAL 2 DAY, 'scheduled', 'Routine Cardiac Checkup', 'Patient reports mild fatigue.'),
        (?, ?, NOW() + INTERVAL 5 DAY, 'scheduled', 'Childhood Vaccination Plan', 'Follow-up for MMR vaccination.'),
        (?, ?, NOW() - INTERVAL 10 DAY, 'completed', 'Initial Consult', 'ECG was normal. Advised diet modifications.');
      `, [
        patientMap['Johnson'], doctorMap['Doe'],
        patientMap['Miller'], doctorMap['Smith'],
        patientMap['Johnson'], doctorMap['Doe']
      ]);

      // 5. Insert medical histories (conditions)
      await connection.query(`
        INSERT INTO medical_histories (patient_id, condition_name, onset_date, status, notes) VALUES
        (?, 'Essential Hypertension', '2022-03-10', 'active', 'Controlled with Lisinopril.'),
        (?, 'Mild Seasonal Allergy', '2018-05-15', 'active', 'Triggered by oak pollen.'),
        (?, 'Type 2 Diabetes Mellitus', '2020-11-04', 'active', 'Managed via diet and Metformin.');
      `, [
        patientMap['Johnson'],
        patientMap['Johnson'],
        patientMap['Miller']
      ]);

      // 6. Insert lab results
      await connection.query(`
        INSERT INTO lab_results (patient_id, test_name, test_date, result_value, result_unit, reference_range, status) VALUES
        (?, 'Hemoglobin A1c', '2026-07-10', '6.8', '%', '4.0 - 5.6', 'completed'),
        (?, 'Serum Cholesterol', '2026-07-15', '210', 'mg/dL', '< 200', 'completed'),
        (?, 'Complete Blood Count (CBC)', '2026-07-20', 'Normal', 'N/A', 'Reference standard', 'completed'),
        (?, 'TSH (Thyroid Stimulating Hormone)', '2026-07-22', 'Pending', 'uIU/mL', '0.4 - 4.0', 'pending'),
        (?, 'Vitamin D, 25-Hydroxy', '2026-07-23', 'Request Issued', 'ng/mL', '30 - 100', 'requested');
      `, [
        patientMap['Miller'],
        patientMap['Johnson'],
        patientMap['Johnson'],
        patientMap['Johnson'],
        patientMap['Miller']
      ]);

      // 7. Insert prescriptions
      await connection.query(`
        INSERT INTO prescriptions (patient_id, doctor_id, medication_name, dosage, frequency, start_date, end_date, instructions) VALUES
        (?, ?, 'Lisinopril 10mg', '1 tablet', 'Once daily', '2026-07-15', '2027-07-15', 'Take in the morning with water.'),
        (?, ?, 'Metformin 500mg', '1 tablet', 'Twice daily with meals', '2026-07-10', '2027-01-10', 'Take with breakfast and dinner.'),
        (?, ?, 'Atorvastatin 20mg', '1 tablet', 'Once daily at bedtime', '2026-07-16', NULL, 'Avoid grapefruit juice.');
      `, [
        patientMap['Johnson'], doctorMap['Doe'],
        patientMap['Miller'], doctorMap['Smith'],
        patientMap['Johnson'], doctorMap['Doe']
      ]);

      console.log('Mock database seeding completed.');
    } else {
      console.log('Database already initialized. Skipping seeding.');
    }

  } catch (error) {
    console.error('Database setup failed:', error);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

setupDatabase();
