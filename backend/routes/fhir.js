const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { authenticateToken } = require('../middleware/auth');

// HELPER: Convert database Patient to FHIR Patient resource
const mapToFHIRPatient = (p) => {
  return {
    resourceType: 'Patient',
    id: p.fhir_id,
    active: true,
    name: [
      {
        use: 'official',
        family: p.last_name,
        given: [p.first_name]
      }
    ],
    telecom: p.phone ? [
      {
        system: 'phone',
        value: p.phone,
        use: 'mobile'
      }
    ] : [],
    gender: p.gender ? p.gender.toLowerCase() : 'unknown',
    birthDate: p.birth_date ? p.birth_date.toISOString().slice(0, 10) : null,
    address: p.address ? [
      {
        text: p.address
      }
    ] : [],
    meta: {
      profile: ['http://hl7.org/fhir/StructureDefinition/Patient']
    }
  };
};

// HELPER: Convert database Lab Result to FHIR Observation resource
const mapToFHIRObservation = (lr, patientFhirId) => {
  const isNumeric = !isNaN(parseFloat(lr.result_value)) && isFinite(lr.result_value);
  
  const fhirObs = {
    resourceType: 'Observation',
    id: `obs-${lr.id}`,
    status: lr.status === 'completed' ? 'final' : 'registered',
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/observation-category',
            code: 'laboratory',
            display: 'Laboratory'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://loinc.org',
          code: '1000-0', // Default mock code
          display: lr.test_name
        }
      ],
      text: lr.test_name
    },
    subject: {
      reference: `Patient/${patientFhirId}`
    },
    effectiveDateTime: lr.test_date ? lr.test_date.toISOString().slice(0, 10) : null
  };

  if (lr.status === 'completed') {
    if (isNumeric) {
      fhirObs.valueQuantity = {
        value: parseFloat(lr.result_value),
        unit: lr.result_unit,
        system: 'http://unitsofmeasure.org',
        code: lr.result_unit
      };
    } else {
      fhirObs.valueString = lr.result_value;
    }

    if (lr.reference_range) {
      fhirObs.referenceRange = [
        {
          text: lr.reference_range
        }
      ];
    }
  }

  return fhirObs;
};

// HELPER: Convert database Prescription to FHIR MedicationRequest resource
const mapToFHIRMedicationRequest = (pr, patientFhirId) => {
  return {
    resourceType: 'MedicationRequest',
    id: `medrx-${pr.id}`,
    status: pr.end_date ? 'completed' : 'active',
    intent: 'order',
    medicationCodeableConcept: {
      coding: [
        {
          system: 'http://www.nlm.nih.gov/research/umls/rxnorm',
          code: '000000', // Default mock RxNorm code
          display: pr.medication_name
        }
      ],
      text: pr.medication_name
    },
    subject: {
      reference: `Patient/${patientFhirId}`
    },
    authoredOn: pr.start_date ? pr.start_date.toISOString().slice(0, 10) : null,
    requester: pr.doctor_last ? {
      reference: `Practitioner/doc-${pr.doctor_id}`,
      display: `Dr. ${pr.doctor_first} ${pr.doctor_last}`
    } : undefined,
    dosageInstruction: [
      {
        text: `${pr.dosage} ${pr.frequency}`,
        timing: {
          repeat: {
            frequency: pr.frequency.includes('Twice') ? 2 : 1,
            period: 1,
            periodUnit: 'd'
          }
        },
        patientInstruction: pr.instructions
      }
    ]
  };
};

// HELPER: Convert database Condition to FHIR Condition resource
const mapToFHIRCondition = (c, patientFhirId) => {
  return {
    resourceType: 'Condition',
    id: `cond-${c.id}`,
    clinicalStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-clinical',
          code: c.status === 'active' ? 'active' : 'resolved'
        }
      ]
    },
    verificationStatus: {
      coding: [
        {
          system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status',
          code: 'confirmed'
        }
      ]
    },
    category: [
      {
        coding: [
          {
            system: 'http://terminology.hl7.org/CodeSystem/condition-category',
            code: 'encounter-diagnosis',
            display: 'Encounter Diagnosis'
          }
        ]
      }
    ],
    code: {
      coding: [
        {
          system: 'http://snomed.info/sct',
          code: '000000', // Default mock SNOMED-CT code
          display: c.condition_name
        }
      ],
      text: c.condition_name
    },
    subject: {
      reference: `Patient/${patientFhirId}`
    },
    onsetDateTime: c.onset_date ? c.onset_date.toISOString().slice(0, 10) : null,
    note: c.notes ? [
      {
        text: c.notes
      }
    ] : []
  };
};

// ==========================================
// FHIR REST API ENDPOINTS
// ==========================================

// 1. Get Patient list in FHIR Bundle format
router.get('/Patient', authenticateToken, async (req, res) => {
  try {
    const [patients] = await db.query('SELECT * FROM patients');
    const fhirEntries = patients.map(p => {
      const fhirPat = mapToFHIRPatient(p);
      return {
        fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/Patient/${p.fhir_id}`,
        resource: fhirPat
      };
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: patients.length,
      entry: fhirEntries
    };

    res.json(bundle);
  } catch (error) {
    console.error('FHIR Patient bundle error:', error);
    res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
  }
});

// 2. Get specific Patient as FHIR Patient Resource
router.get('/Patient/:fhirId', authenticateToken, async (req, res) => {
  const fhirId = req.params.fhirId;
  try {
    const [patients] = await db.query('SELECT * FROM patients WHERE fhir_id = ?', [fhirId]);
    if (patients.length === 0) {
      return res.status(404).json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'error', code: 'not-found', diagnostics: `Patient with fhirId '${fhirId}' not found.` }]
      });
    }

    res.json(mapToFHIRPatient(patients[0]));
  } catch (error) {
    console.error('FHIR Patient error:', error);
    res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
  }
});

// 3. Get Observations (Lab Results) as FHIR Bundle
router.get('/Observation', authenticateToken, async (req, res) => {
  const { patient } = req.query; // Expecting patient FHIR ID (e.g. pat-alice-johnson)
  try {
    let query = `
      SELECT lr.*, p.fhir_id as patient_fhir_id 
      FROM lab_results lr 
      JOIN patients p ON lr.patient_id = p.id
    `;
    let params = [];

    if (patient) {
      // patient reference filter, e.g. "Patient/pat-alice-johnson" or "pat-alice-johnson"
      const cleanId = patient.replace('Patient/', '');
      query += ' WHERE p.fhir_id = ?';
      params.push(cleanId);
    }

    const [results] = await db.query(query, params);
    const fhirEntries = results.map(lr => {
      const fhirObs = mapToFHIRObservation(lr, lr.patient_fhir_id);
      return {
        fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/Observation/${fhirObs.id}`,
        resource: fhirObs
      };
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: results.length,
      entry: fhirEntries
    };

    res.json(bundle);
  } catch (error) {
    console.error('FHIR Observation error:', error);
    res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
  }
});

// 4. Get MedicationRequests (Prescriptions) as FHIR Bundle
router.get('/MedicationRequest', authenticateToken, async (req, res) => {
  const { patient } = req.query;
  try {
    let query = `
      SELECT pr.*, p.fhir_id as patient_fhir_id, d.first_name as doctor_first, d.last_name as doctor_last
      FROM prescriptions pr
      JOIN patients p ON pr.patient_id = p.id
      JOIN doctors d ON pr.doctor_id = d.id
    `;
    let params = [];

    if (patient) {
      const cleanId = patient.replace('Patient/', '');
      query += ' WHERE p.fhir_id = ?';
      params.push(cleanId);
    }

    const [prescriptions] = await db.query(query, params);
    const fhirEntries = prescriptions.map(pr => {
      const fhirMed = mapToFHIRMedicationRequest(pr, pr.patient_fhir_id);
      return {
        fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/MedicationRequest/${fhirMed.id}`,
        resource: fhirMed
      };
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: prescriptions.length,
      entry: fhirEntries
    };

    res.json(bundle);
  } catch (error) {
    console.error('FHIR MedicationRequest error:', error);
    res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
  }
});

// 5. Get Conditions (Medical History) as FHIR Bundle
router.get('/Condition', authenticateToken, async (req, res) => {
  const { patient } = req.query;
  try {
    let query = `
      SELECT mh.*, p.fhir_id as patient_fhir_id 
      FROM medical_histories mh
      JOIN patients p ON mh.patient_id = p.id
    `;
    let params = [];

    if (patient) {
      const cleanId = patient.replace('Patient/', '');
      query += ' WHERE p.fhir_id = ?';
      params.push(cleanId);
    }

    const [conditions] = await db.query(query, params);
    const fhirEntries = conditions.map(c => {
      const fhirCond = mapToFHIRCondition(c, c.patient_fhir_id);
      return {
        fullUrl: `${req.protocol}://${req.get('host')}/api/fhir/Condition/${fhirCond.id}`,
        resource: fhirCond
      };
    });

    const bundle = {
      resourceType: 'Bundle',
      type: 'searchset',
      total: conditions.length,
      entry: fhirEntries
    };

    res.json(bundle);
  } catch (error) {
    console.error('FHIR Condition error:', error);
    res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
  }
});

// 6. Create Patient via incoming FHIR Patient JSON Payload
router.post('/Patient', authenticateToken, async (req, res) => {
  const fhirPayload = req.body;

  if (!fhirPayload || fhirPayload.resourceType !== 'Patient') {
    return res.status(400).json({
      resourceType: 'OperationOutcome',
      issue: [{ severity: 'error', code: 'invalid', diagnostics: 'Invalid FHIR payload. resourceType must be Patient.' }]
    });
  }

  try {
    // Extract demographics from FHIR structure
    const fhirId = fhirPayload.id || `pat-fhir-${Date.now().toString().slice(-4)}`;
    
    const nameObj = fhirPayload.name && fhirPayload.name[0] ? fhirPayload.name[0] : {};
    const firstName = nameObj.given && nameObj.given[0] ? nameObj.given[0] : 'Unknown';
    const lastName = nameObj.family ? nameObj.family : 'FHIRPatient';
    
    const birthDate = fhirPayload.birthDate || new Date().toISOString().slice(0, 10);
    
    const fhirGender = fhirPayload.gender || 'unknown';
    // Map FHIR gender to DB gender (capitalize first letter)
    const gender = fhirGender.charAt(0).toUpperCase() + fhirGender.slice(1);
    
    const telecomObj = fhirPayload.telecom && fhirPayload.telecom[0] ? fhirPayload.telecom[0] : {};
    const phone = telecomObj.value || null;
    
    const addressObj = fhirPayload.address && fhirPayload.address[0] ? fhirPayload.address[0] : {};
    const address = addressObj.text || null;

    // Check if fhir_id already exists in our system
    const [existing] = await db.query('SELECT id FROM patients WHERE fhir_id = ?', [fhirId]);
    if (existing.length > 0) {
      // Overwrite/Update patient details
      await db.query(
        'UPDATE patients SET first_name = ?, last_name = ?, birth_date = ?, gender = ?, phone = ?, address = ? WHERE fhir_id = ?',
        [firstName, lastName, birthDate, gender, phone, address, fhirId]
      );
      
      return res.json({
        resourceType: 'OperationOutcome',
        issue: [{ severity: 'information', code: 'informational', diagnostics: `Patient ${fhirId} updated successfully via FHIR sync.` }]
      });
    }

    // Insert new patient (not linked to an active user account yet, created via import)
    const [result] = await db.query(
      'INSERT INTO patients (first_name, last_name, birth_date, gender, phone, address, fhir_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [firstName, lastName, birthDate, gender, phone, address, fhirId]
    );

    res.status(201).json({
      resourceType: 'Patient',
      id: fhirId,
      active: true,
      name: [{ use: 'official', family: lastName, given: [firstName] }],
      gender: fhirGender,
      birthDate,
      meta: {
        versionId: '1',
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Import FHIR Patient error:', error);
    res.status(500).json({ resourceType: 'OperationOutcome', issue: [{ severity: 'error', code: 'exception', diagnostics: error.message }] });
  }
});

module.exports = router;
