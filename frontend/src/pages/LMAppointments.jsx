import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import { useLMAuth } from '../context/LMAuthContext';
import {
  Plus, Search, X,
  CheckCircle, XCircle, CalendarDays, Clock
} from 'lucide-react';

const STATUSES = ['SCHEDULED','CONFIRMED','COMPLETED','CANCELLED','NO_SHOW'];

// ── Book/Edit modal ──────────────────────────────────────────
function LMApptModal({ appt, patients, doctors, onClose, onSave }) {
  const [form, setForm] = useState(
    appt ? { ...appt, appointmentDate: appt.appointmentDate?.slice(0, 16) } :
    {
      patientId: patients.length === 1 ? patients[0].id : '',
      patientName: patients.length === 1 ? patients[0].fullName : '',
      doctorId: '',
      appointmentDate: '',
      reason: '',
      notes: ''
    }
  );
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePatient = (id) => {
    const p = patients.find(p => String(p.id) === String(id));
    setForm(f => ({ ...f, patientId: id, patientName: p?.fullName || '', doctorId: '' }));
  };
  const handleDoctor = (id) => {
    setForm(f => ({ ...f, doctorId: id }));
  };

  const handleSave = async () => {
    if (!form.patientId || !form.doctorId || !form.appointmentDate) {
      alert('Patient, Doctor and Date/Time are required.'); return;
    }
    setSaving(true);
    try {
      const payload = {
        patientId: Number(form.patientId),
        doctorId: Number(form.doctorId),
        appointmentDate: form.appointmentDate,
        reason: form.reason,
        notes: form.notes
      };
      if (appt?.id) await LMApi.updateAppointment(appt.id, payload);
      else           await LMApi.createAppointment(payload);
      onSave();
    } catch { alert('Error saving appointment'); }
    finally { setSaving(false); }
  };

  const selectedPatient = patients.find(p => String(p.id) === String(form.patientId));
  const filteredDoctors = selectedPatient?.assignedDoctorSpecialization
    ? doctors.filter(d => d.specialization === selectedPatient.assignedDoctorSpecialization)
    : doctors;
  const selectedDoc = filteredDoctors.find(d => String(d.id) === String(form.doctorId));

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <CalendarDays size={17} color="#3b82f6" />
            <h3>{appt?.id ? 'Edit Appointment' : 'Book Appointment'}</h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-row">
            <div className="form-group">
              <label>Patient *</label>
              <select value={form.patientId} onChange={e => handlePatient(e.target.value)}>
                <option value="">Select Patient</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.fullName} ({p.patientId})</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Doctor * {selectedPatient?.assignedDoctorSpecialization ? `(${selectedPatient.assignedDoctorSpecialization})` : ''}</label>
              <select value={form.doctorId} onChange={e => handleDoctor(e.target.value)}>
                <option value="">Select Doctor</option>
                {filteredDoctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialization}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Doctor info hint */}
          {selectedDoc && (
            <div style={{ background: 'rgba(20,184,166,0.06)', border: '1px solid rgba(20,184,166,0.2)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', fontSize: '12px', color: '#14b8a6' }}>
              <strong>{selectedDoc.fullName}</strong> · {selectedDoc.department} · Fee: ₹{selectedDoc.consultationFee || '—'} · {selectedDoc.availability || ''}
            </div>
          )}

          <div className="form-group">
            <label>Date & Time *</label>
            <input type="datetime-local" value={form.appointmentDate || ''}
              onChange={e => set('appointmentDate', e.target.value)} />
          </div>

          <div className="form-group">
            <label>Reason for Visit</label>
            <input value={form.reason} onChange={e => set('reason', e.target.value)} placeholder="Chief complaint / purpose..." />
          </div>
          <div className="form-group">
            <label>Additional Notes</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional information..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : appt?.id ? 'Update Appointment' : 'Book Appointment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Complete modal (doctor adds notes) ───────────────────────
function LMCompleteModal({ appt, onClose, onSave }) {
  const [notes, setNotes] = useState(appt.doctorNotes || '');
  const [saving, setSaving] = useState(false);

  const handleComplete = async () => {
    setSaving(true);
    try {
      await LMApi.updateAppointmentStatus(appt.id, 'COMPLETED', notes);
      onSave();
    } catch { alert('Error completing appointment'); }
    finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '460px' }}>
        <div className="modal-header">
          <h3>Complete Appointment</h3>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ marginBottom: '14px', padding: '10px 14px', background: '#0d1117', borderRadius: '8px', border: '1px solid #1e2a3a' }}>
            <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f4f8' }}>{appt.patientName}</div>
            <div style={{ fontSize: '12px', color: '#5a7394' }}>{appt.doctorName} · {new Date(appt.appointmentDate).toLocaleString('en-IN')}</div>
          </div>
          <div className="form-group">
            <label>Doctor's Notes / Observations</label>
            <textarea rows={4} value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="Add diagnosis notes, next steps, prescriptions ordered..." />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-teal" onClick={handleComplete} disabled={saving}>
            <CheckCircle size={14} /> {saving ? 'Saving...' : 'Mark Completed'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function LMAppointments() {
  const { user } = useLMAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const isPatient = user?.role === 'PATIENT';
  const canBookAppointment = ['RECEPTIONIST', 'PATIENT'].includes(user?.role);
  const [appointments, setAppointments] = useState([]);
  const [patients, setPatients]         = useState([]);
  const [doctors, setDoctors]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [search, setSearch]             = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [modal, setModal]               = useState(null);
  const [completeModal, setCompleteModal] = useState(null);

  const load = () => {
    Promise.all([
      (isDoctor || isPatient) ? LMApi.getMyAppointments() : LMApi.getAppointments(),
      LMApi.getPatients(),
      LMApi.getActiveDoctors()
    ])
      .then(([a, p, d]) => {
        setAppointments(a.data);
        setPatients(p.data);
        setDoctors(d.data);
      }).finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, [user?.role]);

  const handleStatus = async (id, status) => {
    await LMApi.updateAppointmentStatus(id, status);
    load();
  };
  const filtered = appointments.filter(a => {
    const q = search.toLowerCase();
    const matchSearch = !q || a.patientName?.toLowerCase().includes(q) || a.doctorName?.toLowerCase().includes(q) || a.department?.toLowerCase().includes(q);
    const matchStatus = filterStatus === 'ALL' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' }) : '—';

  const counts = STATUSES.reduce((acc, s) => { acc[s] = appointments.filter(a => a.status === s).length; return acc; }, {});

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading appointments...</span></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Appointment Management</h1>
          <p className="page-subtitle">{appointments.length} total · {filtered.length} shown</p>
        </div>
        {canBookAppointment && (
  <button className="btn btn-primary" onClick={() => setModal({})}>
    <Plus size={14} /> Book Appointment
  </button>
)}
      </div>

      {/* Status summary bar */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {[
          { s: 'SCHEDULED', color: '#3b82f6' },{ s: 'CONFIRMED', color: '#22c55e' },
          { s: 'COMPLETED', color: '#64748b' },{ s: 'CANCELLED', color: '#ef4444' },
        ].map(({ s, color }) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#111827', border: '1px solid #1e2a3a', borderRadius: '8px', padding: '7px 14px', cursor: 'pointer' }}
            onClick={() => setFilterStatus(filterStatus === s ? 'ALL' : s)}>
            <span style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Space Mono,monospace', color }}>{counts[s] || 0}</span>
            <span style={{ fontSize: '12px', color: '#5a7394' }}>{s}</span>
          </div>
        ))}
      </div>

      {/* Search + filter */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="search-bar">
          <Search size={14} className="icon" />
          <input placeholder="Search patient, doctor, department..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: '280px' }} />
        </div>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {['ALL', ...STATUSES].map(s => (
            <button key={s} className={`tab-btn ${filterStatus === s ? 'active' : ''}`} onClick={() => setFilterStatus(s)}>
              {s === 'ALL' ? 'All' : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Patient</th><th>Doctor</th><th>Dept / Specialization</th>
                <th>Date & Time</th><th>Reason</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <CalendarDays size={32} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                    <p>No appointments found</p>
                  </div>
                </td></tr>
              ) : filtered.map(a => (
                <tr key={a.id}>
                  <td style={{ fontWeight: '600' }}>{a.patientName}</td>
                  <td>
                    <div style={{ fontSize: '13px', color: '#f0f4f8' }}>{a.doctorName}</div>
                    {a.doctorCode && <div style={{ fontSize: '10px', color: '#3a4f66', fontFamily: 'Space Mono,monospace' }}>{a.doctorCode}</div>}
                  </td>
                  <td style={{ color: '#94a3b8', fontSize: '12px' }}>{a.department || a.specialization || '—'}</td>
                  <td>
                    <div style={{ fontSize: '12px', color: '#f59e0b', fontFamily: 'Space Mono,monospace' }}>{fmtDate(a.appointmentDate)}</div>
                  </td>
                  <td style={{ color: '#5a7394', fontSize: '12px', maxWidth: '160px' }}>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                      {a.reason || '—'}
                    </span>
                  </td>
                  <td><span className={`badge badge-${a.status?.toLowerCase()}`}>{a.status}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      {isDoctor && a.status === 'SCHEDULED' && (
                        <button className="btn btn-teal btn-sm" title="Confirm" onClick={() => handleStatus(a.id, 'CONFIRMED')}>
                          <CheckCircle size={12} />
                        </button>
                      )}
                      {isDoctor && (a.status === 'SCHEDULED' || a.status === 'CONFIRMED') && (
                        <button className="btn btn-ghost btn-sm" title="Complete" onClick={() => setCompleteModal(a)}>
                          <Clock size={12} />
                        </button>
                      )}
                      {isDoctor && a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (
                        <button className="btn btn-ghost btn-sm" title="Cancel" onClick={() => handleStatus(a.id, 'CANCELLED')}>
                          <XCircle size={12} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {modal !== null && (
        <LMApptModal appt={modal.id ? modal : null} patients={patients} doctors={doctors}
          onClose={() => setModal(null)} onSave={() => { setModal(null); load(); }} />
      )}
      {completeModal && (
        <LMCompleteModal appt={completeModal}
          onClose={() => setCompleteModal(null)} onSave={() => { setCompleteModal(null); load(); }} />
      )}
    </div>
  );
}
