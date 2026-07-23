import React, { useState, useEffect } from 'react';
import { 
  Calendar, FileText, Pill, Activity, User, MapPin, Phone, 
  Clock, CheckCircle, AlertCircle, Plus, Send, Code, Database 
} from 'lucide-react';

export default function PatientDashboard({ user, onLogout }) {
  const patientId = user.patientId;
  const token = localStorage.getItem('token');

  // Sub-navigation inside dashboard
  const [activeTab, setActiveTab] = useState('summary');
  const [profile, setProfile] = useState(null);
  const [appointments, setAppointments] = useState([]);
  const [labResults, setLabResults] = useState([]);
  const [prescriptions, setPrescriptions] = useState([]);
  const [medicalHistory, setMedicalHistory] = useState([]);
  const [fhirJSON, setFhirJSON] = useState(null);
  
  // Appointment booking form state
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTime, setBookingTime] = useState('10:00');
  const [selectedDoctor, setSelectedDoctor] = useState('1'); // John Doe = 1, Jane Smith = 2
  const [bookingReason, setBookingReason] = useState('');
  const [bookingMsg, setBookingMsg] = useState({ text: '', type: '' });
  const [doctorsList, setDoctorsList] = useState([
    { id: 1, name: 'Dr. John Doe', specialty: 'Cardiology' },
    { id: 2, name: 'Dr. Jane Smith', specialty: 'Pediatrics' }
  ]);

  const fetchData = async () => {
    try {
      const headers = { 'Authorization': `Bearer ${token}` };

      // Fetch Profile
      const pRes = await fetch(`http://localhost:5000/api/patients/${patientId}`, { headers });
      const pData = await pRes.json();
      setProfile(pData);

      // Fetch Appointments
      const apptRes = await fetch(`http://localhost:5000/api/clinical/appointments`, { headers });
      const apptData = await apptRes.json();
      setAppointments(apptData);

      // Fetch Labs
      const labsRes = await fetch(`http://localhost:5000/api/clinical/lab-results/${patientId}`, { headers });
      const labsData = await labsRes.json();
      setLabResults(labsData);

      // Fetch Prescriptions
      const rxRes = await fetch(`http://localhost:5000/api/clinical/prescriptions/${patientId}`, { headers });
      const rxData = await rxRes.json();
      setPrescriptions(rxData);

      // Fetch Medical History
      const histRes = await fetch(`http://localhost:5000/api/clinical/medical-history/${patientId}`, { headers });
      const histData = await histRes.json();
      setMedicalHistory(histData);

      // Fetch FHIR Payload
      const fhirRes = await fetch(`http://localhost:5000/api/fhir/Patient/${user.fhirId}`, { headers });
      const fhirData = await fhirRes.json();
      setFhirJSON(fhirData);

    } catch (error) {
      console.error('Error fetching clinical details:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [patientId]);

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    setBookingMsg({ text: '', type: '' });

    if (!bookingDate || !bookingTime) {
      setBookingMsg({ text: 'Please select a date and time.', type: 'danger' });
      return;
    }

    try {
      const apptDateTime = `${bookingDate}T${bookingTime}:00`;
      const response = await fetch('http://localhost:5000/api/clinical/appointments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          patientId,
          doctorId: selectedDoctor,
          appointmentDate: apptDateTime,
          reason: bookingReason
        })
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to book appointment.');

      setBookingMsg({ text: 'Appointment scheduled successfully!', type: 'success' });
      setBookingReason('');
      setBookingDate('');
      
      // Refresh clinical data
      fetchData();
    } catch (err) {
      setBookingMsg({ text: err.message, type: 'danger' });
    }
  };

  const handleCancelAppointment = async (apptId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const response = await fetch(`http://localhost:5000/api/clinical/appointments/${apptId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'cancelled' })
      });

      if (!response.ok) throw new Error('Failed to cancel appointment.');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (!profile) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading EHR Dashboard...</div>;
  }

  // Calculate age
  const birthYear = new Date(profile.birth_date).getFullYear();
  const currentYear = new Date().getFullYear();
  const age = currentYear - birthYear;

  return (
    <div className="dashboard-grid fade-in">
      {/* Sidebar navigation */}
      <div className="sidebar">
        <div className="sidebar-menu">
          <h3 style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--text-muted)', marginBottom: '16px', paddingLeft: '16px' }}>
            Patient EHR
          </h3>
          <button 
            className={`sidebar-link ${activeTab === 'summary' ? 'active' : ''}`}
            onClick={() => setActiveTab('summary')}
          >
            <Activity size={18} />
            Health Summary
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <Calendar size={18} />
            Appointments
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'labs' ? 'active' : ''}`}
            onClick={() => setActiveTab('labs')}
          >
            <FileText size={18} />
            Lab Results
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'prescriptions' ? 'active' : ''}`}
            onClick={() => setActiveTab('prescriptions')}
          >
            <Pill size={18} />
            Prescriptions
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <Clock size={18} />
            Medical History
          </button>
          <button 
            className={`sidebar-link ${activeTab === 'fhir' ? 'active' : ''}`}
            onClick={() => setActiveTab('fhir')}
          >
            <Code size={18} />
            FHIR JSON Export
          </button>
        </div>

        <button className="btn btn-outline" style={{ width: '100%' }} onClick={onLogout}>
          Sign Out
        </button>
      </div>

      {/* Main dashboard content */}
      <div className="main-content">
        {/* Header summary of demographics */}
        <div className="card fade-in" style={{ background: 'linear-gradient(135deg, var(--white) 60%, var(--secondary) 100%)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <span className="badge badge-info" style={{ marginBottom: '8px' }}>Patient EHR Account</span>
            <h1 style={{ fontSize: '28px', fontWeight: '800' }}>{profile.first_name} {profile.last_name}</h1>
            <div style={{ display: 'flex', gap: '16px', color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><User size={16} /> Age: {age} ({profile.gender})</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Phone size={16} /> {profile.phone || 'No Phone'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={16} /> {profile.address || 'No Address'}</span>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '11px', display: 'block', color: 'var(--text-muted)', fontWeight: 'bold' }}>FHIR PATIENT IDENTIFIER</span>
            <code style={{ fontSize: '13px', color: 'var(--primary)', fontWeight: 'bold', backgroundColor: 'rgba(0,163,166,0.1)', padding: '4px 8px', borderRadius: '6px' }}>
              {profile.fhir_id}
            </code>
          </div>
        </div>

        {/* 1. HEALTH SUMMARY VIEW */}
        {activeTab === 'summary' && (
          <div className="fade-in">
            <div className="stats-row">
              <div className="card stat-card card-hover">
                <div className="stat-icon"><Calendar size={24} /></div>
                <div className="stat-info">
                  <h3>{appointments.filter(a => a.status === 'scheduled').length}</h3>
                  <p>Scheduled Visits</p>
                </div>
              </div>
              <div className="card stat-card card-hover">
                <div className="stat-icon"><Pill size={24} /></div>
                <div className="stat-info">
                  <h3>{prescriptions.length}</h3>
                  <p>Active Prescriptions</p>
                </div>
              </div>
              <div className="card stat-card card-hover">
                <div className="stat-icon"><FileText size={24} /></div>
                <div className="stat-info">
                  <h3>{labResults.length}</h3>
                  <p>Total Lab Findings</p>
                </div>
              </div>
            </div>

            <div className="grid-2">
              {/* Medical Conditions summary */}
              <div className="card">
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Activity size={20} style={{ color: 'var(--primary)' }} />
                  Active Health Conditions
                </h3>
                {medicalHistory.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No medical conditions logged.</p>
                ) : (
                  <div className="timeline">
                    {medicalHistory.map(cond => (
                      <div key={cond.id} className="timeline-item">
                        <div className="timeline-date">Onset: {new Date(cond.onset_date).toLocaleDateString()}</div>
                        <div className="timeline-title">{cond.condition_name}</div>
                        <div className="timeline-desc">Status: <span className="badge badge-success">{cond.status}</span></div>
                        {cond.notes && <div style={{ fontSize: '12px', marginTop: '4px', fontStyle: 'italic' }}>Note: {cond.notes}</div>}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Latest prescriptions */}
              <div className="card">
                <h3 style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Pill size={20} style={{ color: 'var(--primary)' }} />
                  Current Medications
                </h3>
                {prescriptions.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)' }}>No active prescriptions.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {prescriptions.map(rx => (
                      <div key={rx.id} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '10px' }}>
                        <div>
                          <strong style={{ display: 'block', color: 'var(--primary)' }}>{rx.medication_name}</strong>
                          <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Dosage: {rx.dosage} ({rx.frequency})</span>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '12px', color: 'var(--text-muted)' }}>
                          <span>Dr. {rx.doctor_last}</span>
                          <span style={{ display: 'block' }}>Starts: {new Date(rx.start_date).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 2. APPOINTMENTS VIEW */}
        {activeTab === 'appointments' && (
          <div className="grid-2 fade-in">
            {/* Booking Form */}
            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>Schedule Appointment</h3>
              
              {bookingMsg.text && (
                <div className={`alert alert-${bookingMsg.type}`}>
                  {bookingMsg.type === 'success' ? <CheckCircle size={18} /> : <AlertCircle size={18} />}
                  <span>{bookingMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleBookAppointment}>
                <div className="form-group">
                  <label className="form-label" htmlFor="doctor-select">Choose Doctor / Clinic</label>
                  <select
                    id="doctor-select"
                    className="form-control"
                    value={selectedDoctor}
                    onChange={(e) => setSelectedDoctor(e.target.value)}
                  >
                    {doctorsList.map(doc => (
                      <option key={doc.id} value={doc.id}>{doc.name} ({doc.specialty})</option>
                    ))}
                  </select>
                </div>

                <div className="grid-2">
                  <div className="form-group">
                    <label className="form-label" htmlFor="booking-date-input">Select Date</label>
                    <input
                      id="booking-date-input"
                      type="date"
                      className="form-control"
                      value={bookingDate}
                      onChange={(e) => setBookingDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="booking-time-select">Select Time</label>
                    <select
                      id="booking-time-select"
                      className="form-control"
                      value={bookingTime}
                      onChange={(e) => setBookingTime(e.target.value)}
                    >
                      <option value="09:00">09:00 AM</option>
                      <option value="10:00">10:00 AM</option>
                      <option value="11:00">11:00 AM</option>
                      <option value="13:00">01:00 PM</option>
                      <option value="14:00">02:00 PM</option>
                      <option value="15:00">03:00 PM</option>
                    </select>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: '24px' }}>
                  <label className="form-label" htmlFor="reason-input">Reason for Visit</label>
                  <input
                    id="reason-input"
                    type="text"
                    className="form-control"
                    placeholder="Routine checkup, headache, medication refill..."
                    value={bookingReason}
                    onChange={(e) => setBookingReason(e.target.value)}
                  />
                </div>

                <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                  Schedule Appointment Slot
                </button>
              </form>
            </div>

            {/* Appointments List */}
            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>Your Appointments</h3>
              {appointments.length === 0 ? (
                <p style={{ color: 'var(--text-muted)' }}>No scheduled visits.</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {appointments.map(appt => (
                    <div key={appt.id} className="card-hover" style={{ display: 'flex', justifyContent: 'space-between', padding: '16px', borderRadius: '12px', border: '1.5px solid var(--border-color)', backgroundColor: 'var(--white)' }}>
                      <div>
                        <span style={{ fontSize: '13px', fontWeight: 'bold', color: 'var(--primary)', display: 'block' }}>
                          {new Date(appt.appointment_date).toLocaleDateString()} at {new Date(appt.appointment_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <strong style={{ fontSize: '15px' }}>Dr. {appt.doctor_first} {appt.doctor_last}</strong>
                        <span style={{ display: 'block', fontSize: '12px', color: 'var(--text-muted)' }}>{appt.specialty}</span>
                        {appt.reason && <p style={{ fontSize: '13px', marginTop: '6px', color: 'var(--text-main)' }}>Reason: {appt.reason}</p>}
                        {appt.notes && <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic', marginTop: '4px' }}>Note: {appt.notes}</p>}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <span className={`badge badge-${appt.status === 'scheduled' ? 'warning' : appt.status === 'completed' ? 'success' : 'danger'}`}>
                          {appt.status}
                        </span>
                        {appt.status === 'scheduled' && (
                          <button 
                            className="btn" 
                            style={{ padding: '6px 12px', fontSize: '11px', color: 'var(--danger)', background: 'transparent' }}
                            onClick={() => handleCancelAppointment(appt.id)}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. LAB RESULTS VIEW */}
        {activeTab === 'labs' && (
          <div className="card fade-in">
            <h3 style={{ marginBottom: '20px' }}>Clinical Laboratory Findings</h3>
            
            {labResults.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No lab records available.</p>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Test Name</th>
                      <th>Date Tested</th>
                      <th>Result Value</th>
                      <th>Unit</th>
                      <th>Reference Range</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {labResults.map(lab => {
                      const isPending = lab.status === 'pending' || lab.status === 'requested';
                      return (
                        <tr key={lab.id}>
                          <td><strong>{lab.test_name}</strong></td>
                          <td>{new Date(lab.test_date).toLocaleDateString()}</td>
                          <td>
                            <span style={{ 
                              color: isPending ? 'var(--warning)' : 'var(--text-main)',
                              fontWeight: isPending ? '500' : 'bold' 
                            }}>
                              {lab.result_value}
                            </span>
                          </td>
                          <td>{lab.result_unit}</td>
                          <td><code>{lab.reference_range}</code></td>
                          <td>
                            <span className={`badge badge-${lab.status === 'completed' ? 'success' : lab.status === 'pending' ? 'warning' : 'danger'}`}>
                              {lab.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 4. PRESCRIPTIONS VIEW */}
        {activeTab === 'prescriptions' && (
          <div className="card fade-in">
            <h3 style={{ marginBottom: '20px' }}>Your Active Prescriptions</h3>
            
            {prescriptions.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No active prescriptions.</p>
            ) : (
              <div className="grid-2">
                {prescriptions.map(rx => (
                  <div key={rx.id} className="card-hover" style={{ border: '1.5px solid var(--border-color)', borderRadius: '16px', padding: '20px', backgroundColor: 'var(--white)', position: 'relative' }}>
                    <div style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                      <span className="badge badge-success">Active RX</span>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: rx-{rx.id}</span>
                    </div>

                    <h4 style={{ fontSize: '18px', color: 'var(--primary)', fontWeight: '700', marginBottom: '4px' }}>{rx.medication_name}</h4>
                    <p style={{ fontSize: '14px', fontWeight: 'bold', color: 'var(--text-main)' }}>{rx.dosage}</p>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '10px' }}>Frequency: {rx.frequency}</p>

                    {rx.instructions && (
                      <div style={{ padding: '10px', backgroundColor: 'rgba(0,163,166,0.03)', borderRadius: '8px', marginBottom: '14px', fontSize: '13px', fontStyle: 'italic', borderLeft: '3px solid var(--primary)' }}>
                        <strong>Directions:</strong> {rx.instructions}
                      </div>
                    )}

                    <div style={{ borderTop: '1px solid rgba(0,0,0,0.05)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span>Prescribed by: Dr. {rx.doctor_first} {rx.doctor_last}</span>
                      <span>Issued: {new Date(rx.start_date).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 5. MEDICAL HISTORY VIEW */}
        {activeTab === 'history' && (
          <div className="card fade-in">
            <h3 style={{ marginBottom: '20px' }}>EHR Diagnostic Conditions</h3>
            
            {medicalHistory.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No medical conditions registered.</p>
            ) : (
              <div className="data-table-wrapper">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Condition / Diagnosis</th>
                      <th>Onset Date</th>
                      <th>Clinical Status</th>
                      <th>Doctor's Clinical Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicalHistory.map(cond => (
                      <tr key={cond.id}>
                        <td><strong>{cond.condition_name}</strong></td>
                        <td>{cond.onset_date ? new Date(cond.onset_date).toLocaleDateString() : 'N/A'}</td>
                        <td>
                          <span className={`badge badge-${cond.status === 'active' ? 'success' : 'info'}`}>
                            {cond.status}
                          </span>
                        </td>
                        <td>{cond.notes || 'No notes available'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 6. FHIR JSON EXPORT */}
        {activeTab === 'fhir' && (
          <div className="card fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div>
                <h3>HL7 FHIR JSON Representation</h3>
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Live conversion of patient details into standard FHIR R4 Patient Resource.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <span className="badge badge-success" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Database size={14} /> Local FHIR Resource</span>
              </div>
            </div>

            {fhirJSON ? (
              <pre className="fhir-console">{JSON.stringify(fhirJSON, null, 2)}</pre>
            ) : (
              <p>Fetching FHIR Resource representation...</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
