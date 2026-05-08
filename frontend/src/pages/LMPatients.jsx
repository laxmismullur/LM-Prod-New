import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import { Search, Edit2, Trash2, UserPlus, Eye, Calendar, UserRound, Phone, Mail, MapPin, HeartPulse, ShieldCheck, BadgeInfo } from 'lucide-react';
import { useLMAuth } from '../context/LMAuthContext';

const STATUSES = ['ACTIVE','ADMITTED','STABLE','CRITICAL','DISCHARGED'];

const EMPTY_PATIENT = {
  fullName: '',
  dateOfBirth: '',
  gender: '',
  bloodGroup: '',
  phone: '',
  email: '',
  address: '',
  emergencyContact: '',
  allergies: '',
  medicalHistory: '',
  assignedDoctorId: '',
  assignedDoctorSpecialization: '',
  insuranceProvider: '',
  insuranceNumber: '',
  status: 'ACTIVE'
};

export default function LMPatients() {

  const { user } = useLMAuth();
  const canManagePatients = ['ADMIN', 'RECEPTIONIST'].includes(user?.role);
  const isPatient = user?.role === 'PATIENT';
  const isAdmin = user?.role === 'ADMIN';
  const canBookAppointment = ['RECEPTIONIST', 'PATIENT'].includes(user?.role);
  const canCreatePatientLogin = ['ADMIN', 'RECEPTIONIST'].includes(user?.role);

  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingPatient, setEditingPatient] = useState(null);
  const [viewMode, setViewMode] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [bookingPatient, setBookingPatient] = useState(null);

  const load = () => {
    Promise.all([
      isPatient ? LMApi.getMyPatients() : LMApi.getPatients(),
      LMApi.getActiveDoctors()
    ])
    .then(([p, d]) => {
      setPatients(p.data);
      setDoctors(d.data);
    })
    .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient?')) return;
    await LMApi.deletePatient(id);
    load();
  };

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();

    const matchSearch =
      !q ||
      p.fullName?.toLowerCase().includes(q) ||
      p.patientId?.toLowerCase().includes(q) ||
      p.phone?.includes(q);

    const matchStatus =
      filterStatus === 'ALL' || p.status === filterStatus;

    return matchSearch && matchStatus;
  });

  const doctorSpecializations = [...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  const getAge = (dateOfBirth) => {
    if (!dateOfBirth) return null;

    const dob = new Date(dateOfBirth);
    if (Number.isNaN(dob.getTime())) return null;

    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      age--;
    }
    return age;
  };

  function LMProfileField({ label, value }) {
    return (
      <div className="my-profile-field">
        <span>{label}</span>
        <strong>
          {value || '-'}
        </strong>
      </div>
    );
  }

  // ── Modal ────────────────────────────────────────────────────
  function LMPatientModal({ patient, onClose, onSave, doctors, isViewMode }) {
    const [form, setForm] = useState({
      ...(patient || EMPTY_PATIENT),
      username: patient?.username || '',
      password: ''
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const calculateAge = (dateOfBirth) => {
      if (!dateOfBirth) return null;
      const dob = new Date(dateOfBirth);
      if (Number.isNaN(dob.getTime())) return null;
      const today = new Date();
      let age = today.getFullYear() - dob.getFullYear();
      const monthDiff = today.getMonth() - dob.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) age--;
      return age;
    };

    const display = (value) => value || 'Not provided';

    const profileFields = [
      { label: 'Date of Birth', value: form.dateOfBirth ? new Date(form.dateOfBirth).toLocaleDateString('en-IN') : null },
      { label: 'Age', value: calculateAge(form.dateOfBirth) !== null ? `${calculateAge(form.dateOfBirth)} years` : null },
      { label: 'Gender', value: form.gender },
      { label: 'Blood Group', value: form.bloodGroup },
      { label: 'Phone', value: form.phone },
      { label: 'Email', value: form.email },
      { label: 'Emergency Contact', value: form.emergencyContact },
      { label: 'Address', value: form.address },
    ];

    const clinicalFields = [
      { label: 'Assigned Doctor', value: form.assignedDoctorName },
      { label: 'Doctor Code', value: form.assignedDoctorCode },
      { label: 'Allergies', value: form.allergies },
      { label: 'Medical History', value: form.medicalHistory },
    ];

    const adminFields = [
      { label: 'Insurance Provider', value: form.insuranceProvider },
      { label: 'Insurance Number', value: form.insuranceNumber },
      { label: 'Registered At', value: form.registeredAt ? new Date(form.registeredAt).toLocaleString('en-IN') : null },
      { label: 'Last Updated', value: form.updatedAt ? new Date(form.updatedAt).toLocaleString('en-IN') : null },
    ];

    const validatePhone = (phone) => {
      const phoneRegex = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
      return phoneRegex.test(phone.trim());
    };

    const validateEmail = (email) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(email) && email.length <= 100;
    };

    const handleSave = async () => {
      if (!form.fullName.trim()) {
        setError('Full name is required.');
        return;
      }
      if (form.fullName.trim().length < 3) {
        setError('Full name must be at least 3 characters.');
        return;
      }
      const nameRegex = /^[A-Za-z][A-Za-z\s.'-]{2,}$/;
      if (!nameRegex.test(form.fullName.trim())) {
        setError('Full name must contain only letters and be at least 3 characters.');
        return;
      }
      if (!form.phone.trim()) {
        setError('Phone number is required.');
        return;
      }
      if (!validatePhone(form.phone)) {
        setError('Please enter a valid phone number (e.g., +91-9876543210 or 9876543210).');
        return;
      }
      if (form.email && !validateEmail(form.email)) {
        setError('Please enter a valid email address.');
        return;
      }
      if (!form.assignedDoctorSpecialization) {
        setError('Please select a doctor specialization.');
        return;
      }
      if (canCreatePatientLogin && (form.username?.trim() || form.password?.trim())) {
        if (!form.email?.trim()) {
          setError('Email is required when creating patient login details.');
          return;
        }
        if (!form.username?.trim() || !form.password?.trim()) {
          setError('Both username and password are required when creating patient login details.');
          return;
        }
      }
      if (form.password?.trim() && form.password.trim().length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (form.dateOfBirth) {
        const dob = new Date(form.dateOfBirth);
        const today = new Date();
        if (isNaN(dob.getTime())) {
          setError('Please enter a valid date of birth.');
          return;
        }
        if (dob > today) {
          setError('Date of birth cannot be in the future.');
          return;
        }
        let age = today.getFullYear() - dob.getFullYear();
        const monthDiff = today.getMonth() - dob.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
          age--;
        }
        if (age < 0 || age > 120) {
          setError('Please enter a valid date of birth (age must be between 0 and 120).');
          return;
        }
      }

      setSaving(true);
      setError('');
      try {
        if (patient) {
          await LMApi.updatePatient(patient.id, form);
        } else {
          await LMApi.createPatient(form);
        }
        onSave();
        onClose();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to save patient');
      } finally {
        setSaving(false);
      }
    };

    if (isViewMode) {
      return (
        <div className="modal-overlay" onClick={onClose}>
          <div className="modal patient-profile-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header patient-profile-header">
              <div>
                <div className="patient-profile-kicker">{form.patientId}</div>
                <h3>{form.fullName}</h3>
                <div className="patient-profile-meta">
                  <span className={`badge badge-${form.status?.toLowerCase()}`}>{form.status}</span>
                  {form.assignedDoctorName && <span>{form.assignedDoctorName}</span>}
                </div>
              </div>
              <button onClick={onClose} className="btn-close">x</button>
            </div>

            <div className="modal-body patient-profile-body">
              <section className="profile-section">
                <h4>Personal Information</h4>
                <div className="profile-grid">
                  {profileFields.map(item => (
                    <div className="profile-field" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{display(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="profile-section">
                <h4>Clinical Details</h4>
                <div className="profile-grid">
                  {clinicalFields.map(item => (
                    <div className="profile-field" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{display(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </section>

              <section className="profile-section">
                <h4>Administration</h4>
                <div className="profile-grid">
                  {adminFields.map(item => (
                    <div className="profile-field" key={item.label}>
                      <span>{item.label}</span>
                      <strong>{display(item.value)}</strong>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>{isViewMode ? 'View Patient' : patient ? 'Edit Patient' : 'Add Patient'}</h3>
            <button onClick={onClose} className="btn-close">×</button>
          </div>
          <div className="modal-body">
            {error && <div className="error">{error}</div>}
            <div className="form-grid">
              <div>
                <label>Full Name *</label>
                <input
                  value={form.fullName}
                  onChange={e => set('fullName', e.target.value)}
                  placeholder="Enter full name"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label>Date of Birth</label>
                <input
                  type="date"
                  value={form.dateOfBirth}
                  onChange={e => set('dateOfBirth', e.target.value)}
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label>Gender</label>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} disabled={isViewMode}>
                  <option value="">Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label>Blood Group</label>
                <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)} disabled={isViewMode}>
                  <option value="">Select Blood Group</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>
              <div>
                <label>Phone *</label>
                <input
                  value={form.phone}
                  onChange={e => set('phone', e.target.value)}
                  placeholder="Enter phone number"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label>Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => set('email', e.target.value)}
                  placeholder="Enter email"
                  disabled={isViewMode}
                />
              </div>
              {canCreatePatientLogin && !isViewMode && (
                <>
                  <div>
                    <label>Login Username</label>
                    <input
                      value={form.username || ''}
                      onChange={e => set('username', e.target.value)}
                      placeholder="Enter patient username"
                    />
                  </div>
                  <div>
                    <label>{patient ? 'New Login Password' : 'Login Password'}</label>
                    <input
                      type="password"
                      value={form.password || ''}
                      onChange={e => set('password', e.target.value)}
                      placeholder={patient ? 'Leave blank to keep current password' : 'Optional patient login password'}
                    />
                  </div>
                </>
              )}
              <div>
                <label>Address</label>
                <input
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="Enter address"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label>Emergency Contact</label>
                <input
                  value={form.emergencyContact}
                  onChange={e => set('emergencyContact', e.target.value)}
                  placeholder="Enter emergency contact"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label>Doctor Specialization</label>
                <select
                  value={form.assignedDoctorSpecialization || ''}
                  onChange={e => {
                    setForm(p => ({
                      ...p,
                      assignedDoctorSpecialization: e.target.value,
                      assignedDoctorId: '',
                      assignedDoctorName: '',
                      assignedDoctorCode: ''
                    }));
                  }}
                  disabled={isViewMode}
                >
                  <option value="">Select Specialization</option>
                  {doctorSpecializations.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Status</label>
                <select value={form.status} onChange={e => set('status', e.target.value)} disabled={isViewMode}>
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-2">
                <label>Allergies</label>
                <textarea
                  value={form.allergies}
                  onChange={e => set('allergies', e.target.value)}
                  placeholder="Enter allergies"
                  rows={2}
                  disabled={isViewMode}
                />
              </div>
              <div className="col-span-2">
                <label>Medical History</label>
                <textarea
                  value={form.medicalHistory}
                  onChange={e => set('medicalHistory', e.target.value)}
                  placeholder="Enter medical history"
                  rows={3}
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label>Insurance Provider</label>
                <input
                  value={form.insuranceProvider}
                  onChange={e => set('insuranceProvider', e.target.value)}
                  placeholder="Enter insurance provider"
                  disabled={isViewMode}
                />
              </div>
              <div>
                <label>Insurance Number</label>
                <input
                  value={form.insuranceNumber}
                  onChange={e => set('insuranceNumber', e.target.value)}
                  placeholder="Enter insurance number"
                  disabled={isViewMode}
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn">Cancel</button>
            {!isViewMode && (
              <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Appointment Booking Modal ────────────────────────────────────────────────────
  function LMAppointmentBookingModal({ patient, doctors, onClose, onSave }) {
    const [form, setForm] = useState({
      patientId: patient?.id || '',
      patientName: patient?.fullName || '',
      doctorId: '',
      appointmentDate: '',
      reason: '',
      notes: ''
    });
    const [saving, setSaving] = useState(false);
    const [errors, setErrors] = useState({});

    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

    const validate = () => {
      const errs = {};
      if (!form.doctorId) errs.doctorId = 'Doctor is required';
      if (!form.appointmentDate) {
        errs.appointmentDate = 'Date and Time are required';
      } else {
        const now = new Date();
        const apptDate = new Date(form.appointmentDate);
        // Add a buffer of 5 minutes for appointment scheduling
        const minDate = new Date(now.getTime() + 5 * 60000); // 5 minutes in future
        if (apptDate < minDate) {
          errs.appointmentDate = 'Appointment must be at least 5 minutes in the future';
        }
      }
      if (form.reason && form.reason.trim().length > 0 && form.reason.trim().length < 3) {
        errs.reason = 'Reason must be at least 3 characters if provided';
      }
      setErrors(errs);
      return Object.keys(errs).length === 0;
    };

    const handleSave = async () => {
      if (!validate()) return;
      setSaving(true);
      try {
        const payload = { 
          ...form, 
          patientId: Number(form.patientId), 
          doctorId: Number(form.doctorId) 
        };
        await LMApi.createAppointment(payload);
        onSave();
        onClose();
      } catch (err) {
        alert('Error booking appointment: ' + (err.response?.data?.message || 'Unknown error'));
      } finally {
        setSaving(false);
      }
    };

    const filteredDoctors = patient?.assignedDoctorSpecialization
      ? doctors.filter(d => d.specialization === patient.assignedDoctorSpecialization)
      : doctors;
    const selectedDoc = filteredDoctors.find(d => String(d.id) === String(form.doctorId));

    return (
      <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
        <div className="modal" onClick={e => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Book Appointment for {patient?.fullName}</h3>
            <button onClick={onClose} className="btn-close">×</button>
          </div>
          <div className="modal-body">
            {Object.keys(errors).length > 0 && (
              <div className="error" style={{ marginBottom: '16px' }}>
                Please fix the errors below.
              </div>
            )}
            
            <div className="form-grid">
              <div className="col-span-2">
                <label>Patient</label>
                <input
                  value={form.patientName}
                  disabled
                  style={{ backgroundColor: '#f8f9fa' }}
                />
              </div>
              
              <div className="col-span-2">
                <label>Doctor * {patient?.assignedDoctorSpecialization ? `(${patient.assignedDoctorSpecialization})` : ''}</label>
                <select 
                  value={form.doctorId} 
                  onChange={e => { 
                    set('doctorId', e.target.value); 
                    setErrors(err => ({ ...err, doctorId: '' })); 
                  }}
                >
                  <option value="">Select Doctor</option>
                  {filteredDoctors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.fullName} — {d.specialization}
                    </option>
                  ))}
                </select>
                {errors.doctorId && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.doctorId}</div>}
              </div>

              {/* Doctor info hint */}
              {selectedDoc && (
                <div className="col-span-2" style={{ 
                  background: 'rgba(20,184,166,0.06)', 
                  border: '1px solid rgba(20,184,166,0.2)', 
                  borderRadius: '8px', 
                  padding: '10px 14px', 
                  marginBottom: '14px', 
                  fontSize: '12px', 
                  color: '#14b8a6' 
                }}>
                  <strong>{selectedDoc.fullName}</strong> · {selectedDoc.department} · Fee: ₹{selectedDoc.consultationFee || '—'} · {selectedDoc.availability || ''}
                </div>
              )}

              <div>
                <label>Date & Time *</label>
                <input 
                  type="datetime-local" 
                  value={form.appointmentDate || ''}
                  min={new Date().toISOString().slice(0, 16)}
                  onChange={e => { 
                    set('appointmentDate', e.target.value); 
                    setErrors(err => ({ ...err, appointmentDate: '' })); 
                  }} 
                />
                {errors.appointmentDate && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.appointmentDate}</div>}
              </div>

              <div className="col-span-2">
                <label>Reason for Visit</label>
                <input 
                  value={form.reason} 
                  onChange={e => set('reason', e.target.value)} 
                  placeholder="Chief complaint / purpose..." 
                />
                {errors.reason && <div style={{ color: '#ef4444', fontSize: '12px', marginTop: '4px' }}>{errors.reason}</div>}
              </div>

              <div className="col-span-2">
                <label>Additional Notes</label>
                <textarea 
                  rows={2} 
                  value={form.notes} 
                  onChange={e => set('notes', e.target.value)} 
                  placeholder="Any additional information..." 
                />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} className="btn">Cancel</button>
            <button onClick={handleSave} className="btn btn-primary" disabled={saving}>
              {saving ? 'Booking...' : 'Book Appointment'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return <div className="loading-screen">Loading patients...</div>;
  }

  if (isPatient) {
    const patient = patients[0];
    const age = getAge(patient?.dateOfBirth);

    if (!patient) {
      return (
        <div>
          <div className="page-header">
            <div>
              <h1>My Profile</h1>
              <p>No patient profile is linked to this login.</p>
            </div>
          </div>
          <div className="card">
            Please contact the receptionist or admin to link your patient record to your login account.
          </div>
        </div>
      );
    }

    return (
      <div className="my-profile-page">
        <div className="my-profile-hero">
          <div className="my-profile-identity">
            <div className="my-profile-avatar">
              {patient.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || 'PT'}
            </div>
            <div>
              <div className="my-profile-id">{patient.patientId || 'Patient profile'}</div>
              <h1>{patient.fullName}</h1>
              <div className="my-profile-tags">
                <span className={`badge badge-${patient.status?.toLowerCase()}`}>{patient.status || 'ACTIVE'}</span>
                {patient.bloodGroup && <span>{patient.bloodGroup}</span>}
                {age !== null && <span>{age} years</span>}
              </div>
            <p>{patient.patientId || 'Patient profile'}{patient.status ? ` · ${patient.status}` : ''}</p>
          </div>

          </div>

          <button className="btn btn-teal" onClick={() => { setBookingPatient(patient); setShowBookingModal(true); }}>
            <Calendar size={14} /> Book Appointment
          </button>
        </div>

        <div className="card my-profile-card">
          <div className="form-grid">
            <LMProfileField label="Full Name" value={patient.fullName} />
            <LMProfileField label="Patient ID" value={patient.patientId} />
            <LMProfileField label="Age / Date of Birth" value={`${age !== null ? `${age} years` : '-'}${patient.dateOfBirth ? ` / ${patient.dateOfBirth}` : ''}`} />
            <LMProfileField label="Gender" value={patient.gender} />
            <LMProfileField label="Blood Group" value={patient.bloodGroup} />
            <LMProfileField label="Phone" value={patient.phone} />
            <LMProfileField label="Email" value={patient.email} />
            <LMProfileField label="Emergency Contact" value={patient.emergencyContact} />
            <LMProfileField label="Doctor Specialization" value={patient.assignedDoctorSpecialization || patient.assignedDoctorName} />
            <LMProfileField label="Status" value={patient.status} />
            <div className="col-span-2">
              <LMProfileField label="Address" value={patient.address} />
            </div>
            <div className="col-span-2">
              <LMProfileField label="Allergies" value={patient.allergies} />
            </div>
            <div className="col-span-2">
              <LMProfileField label="Medical History" value={patient.medicalHistory} />
            </div>
            <LMProfileField label="Insurance Provider" value={patient.insuranceProvider} />
            <LMProfileField label="Insurance Number" value={patient.insuranceNumber} />
          </div>
        </div>

        {showBookingModal && (
          <LMAppointmentBookingModal
            patient={bookingPatient}
            doctors={doctors}
            onClose={() => { setShowBookingModal(false); setBookingPatient(null); }}
            onSave={load}
          />
        )}
      </div>
    );
  }

  return (
    <div>

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1>{isPatient ? 'My Patient Records' : 'Patient Management'}</h1>
          <p>{patients.length} total · {filtered.length} shown</p>
        </div>
         
        <div style={{ display: 'flex', gap: '10px' }}>
          {isPatient && canBookAppointment && patients.length > 0 && (
            <button className="btn btn-teal" onClick={() => { setBookingPatient(patients[0]); setShowBookingModal(true); }}>
              <Calendar size={14} /> Book Appointment
            </button>
          )}
          {canManagePatients && (
            <button className="btn btn-primary" onClick={() => { setEditingPatient(null); setShowModal(true); setViewMode(false); }}>
              <UserPlus size={14} /> Add Patient
            </button>
          )}
        </div>
      </div>

      {/* SEARCH + FILTER */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>

        <div className="search-bar">
          <Search size={14} />
          <input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        <div>
          {['ALL', ...STATUSES].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                marginRight: '6px',
                padding: '6px 10px',
                background: filterStatus === s ? '#2563eb' : '#1e293b',
                color: '#fff',
                border: 'none',
                borderRadius: '6px',
                cursor: 'pointer'
              }}
            >
              {s}
            </button>
          ))}
        </div>

      </div>

      {/* TABLE */}
      <div className="card">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Age / Gender</th>
              <th>Blood</th>
              <th>Phone</th>
              <th>Specialization</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8}>No patients found</td>
              </tr>
            ) : (
              filtered.map(p => {
                const age = p.dateOfBirth
                  ? Math.floor((Date.now() - new Date(p.dateOfBirth)) / 31557600000)
                  : null;

                return (
                  <tr key={p.id}>

                    <td>{p.patientId}</td>

                    <td>{p.fullName}</td>

                    <td>
                      {age ? `${age}y` : '—'} {p.gender ? `/ ${p.gender}` : ''}
                    </td>

                    <td>{p.bloodGroup || '—'}</td>

                    <td>{p.phone}</td>

                    <td>{p.assignedDoctorSpecialization || p.assignedDoctorName || '—'}</td>

                    <td>
                      <span className={`badge badge-${p.status?.toLowerCase()}`}>
                        {p.status}
                      </span>
                    </td>

                    <td>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-sm" onClick={() => { setEditingPatient(p); setShowModal(true); setViewMode(true); }} title="View Patient">
                          <Eye size={12} />
                        </button>

                        {canBookAppointment && (
                          <button 
                            className="btn btn-sm btn-teal" 
                            onClick={() => { setBookingPatient(p); setShowBookingModal(true); }}
                            title="Book Appointment"
                          >
                            <Calendar size={12} />
                          </button>
                        )}

                        {canManagePatients && (
                          <>
                            <button className="btn btn-sm" onClick={() => { setEditingPatient(p); setShowModal(true); setViewMode(false); }}>
                              <Edit2 size={12} />
                            </button>

                            <button
                              className="btn btn-sm btn-danger"
                              onClick={() => handleDelete(p.id)}
                            >
                              <Trash2 size={12} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>

                  </tr>
                );
              })
            )}
          </tbody>

        </table>
      </div>

      {showModal && <LMPatientModal patient={editingPatient} onClose={() => { setShowModal(false); setEditingPatient(null); setViewMode(false); }} onSave={load} doctors={doctors} isViewMode={viewMode} />}

      {showBookingModal && <LMAppointmentBookingModal patient={bookingPatient} doctors={doctors} onClose={() => { setShowBookingModal(false); setBookingPatient(null); }} onSave={load} />}

    </div>
  );
}
