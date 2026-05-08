import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import {
  Plus, Search, Edit2, Trash2, X, Stethoscope,
  Phone, Mail, Clock, Star, ToggleLeft, ToggleRight, BadgeCheck
} from 'lucide-react';

const EMPTY = {
  fullName: '', specialization: '', department: '', qualification: '',
  phone: '', email: '', experience: '', consultationFee: '',
  availability: '', address: '', username: '', password: '', active: true,
};

const SPECIALIZATIONS = [
  'Cardiology','Neurology','Pediatrics','Orthopedics','Dermatology',
  'General Medicine','ENT','Gynecology','Ophthalmology','Psychiatry',
  'Oncology','Urology','Endocrinology','Pulmonology','Nephrology',
];

const DEPT_MAP = {
  Cardiology: 'Cardiology', Neurology: 'Neurology', Pediatrics: 'Pediatrics',
  Orthopedics: 'Orthopedics', Dermatology: 'Dermatology',
  'General Medicine': 'General Medicine', ENT: 'ENT',
  Gynecology: 'Gynecology', Ophthalmology: 'Ophthalmology',
  Psychiatry: 'Psychiatry', Oncology: 'Oncology', Urology: 'Urology',
};

const DOCTOR_NAME_RE = /^Dr\.[A-Za-z][A-Za-z\s.'-]{1,}$/;
const PHONE_RE = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ── Modal ────────────────────────────────────────────────────
function LMDoctorModal({ doctor, onClose, onSave }) {
  const [form, setForm]     = useState({ ...(doctor || EMPTY), password: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const handleSpec = (v) => setForm(p => ({ ...p, specialization: v, department: DEPT_MAP[v] || v }));

  const handleSave = async () => {
    if (!form.fullName || !form.specialization || !form.qualification || !form.phone || !form.email || !form.username) {
      setError('Doctor name, specialization, qualification, phone, email and username are required.'); return;
    }
    if (!doctor?.id && !form.password) {
      setError('Password is required for a new doctor login.'); return;
    }
    if (!DOCTOR_NAME_RE.test(form.fullName.trim())) {
      setError('Doctor name must be in this format: Dr.Laxmi'); return;
    }
    if (form.qualification !== 'MBBS') {
      setError('Doctor qualification must be MBBS only.'); return;
    }
    if (!PHONE_RE.test(form.phone.trim())) {
      setError('Enter a valid Indian phone number, for example 9876543210 or +91-9876543210.'); return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError('Enter a valid email address.'); return;
    }
    setSaving(true); setError('');
    try {
      if (doctor?.id) await LMApi.updateDoctor(doctor.id, form);
      else             await LMApi.createDoctor(form);
      onSave();
    } catch (e) {
      setError(e.response?.data || 'Error saving doctor. Check email uniqueness.');
    } finally { setSaving(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Stethoscope size={18} color="#14b8a6" />
            <h3>{doctor?.id ? 'Edit Doctor' : 'Add New Doctor'}</h3>
          </div>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '14px', color: '#ef4444', fontSize: '13px' }}>
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Dr.Laxmi" />
            </div>
            <div className="form-group">
              <label>Specialization *</label>
              <select value={form.specialization} onChange={e => handleSpec(e.target.value)}>
                <option value="">Select Specialization</option>
                {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input value={form.department} onChange={e => set('department', e.target.value)} placeholder="Auto-filled from specialization" />
            </div>
            <div className="form-group">
              <label>Qualification</label>
              <select value={form.qualification} onChange={e => set('qualification', e.target.value)}>
                <option value="">Select Qualification</option>
                <option value="MBBS">MBBS</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Phone *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+91-XXXXXXXXXX" />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="doctor@lmhospital.com" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Username *</label>
              <input value={form.username || ''} onChange={e => set('username', e.target.value)} placeholder="doctor login username" />
            </div>
            <div className="form-group">
              <label>{doctor?.id ? 'New Password' : 'Password *'}</label>
              <input
                type="password"
                value={form.password || ''}
                onChange={e => set('password', e.target.value)}
                placeholder={doctor?.id ? 'Leave blank to keep current password' : 'Set login password'}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Experience</label>
              <input value={form.experience} onChange={e => set('experience', e.target.value)} placeholder="e.g. 8 years" />
            </div>
            <div className="form-group">
              <label>Consultation Fee (₹)</label>
              <input value={form.consultationFee} onChange={e => set('consultationFee', e.target.value)} placeholder="e.g. 800" />
            </div>
          </div>

          <div className="form-group">
            <label>Availability / Schedule</label>
            <input value={form.availability} onChange={e => set('availability', e.target.value)} placeholder="e.g. Mon-Fri 9AM-5PM" />
          </div>

          <div className="form-group">
            <label>Address / Cabin</label>
            <input value={form.address} onChange={e => set('address', e.target.value)} placeholder="Room / Wing / Floor" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 0' }}>
            <label style={{ margin: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)}
                style={{ width: 'auto', cursor: 'pointer' }} />
              <span style={{ fontSize: '13px', color: '#94a3b8' }}>Mark as Active</span>
            </label>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : doctor?.id ? 'Update Doctor' : 'Add Doctor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── View modal ───────────────────────────────────────────────
function LMDoctorDetail({ doctor, onClose }) {
  const fields = [
    { label: 'Doctor Code',    value: doctor.doctorCode,      mono: true },
    { label: 'Specialization', value: doctor.specialization },
    { label: 'Department',     value: doctor.department },
    { label: 'Qualification',  value: doctor.qualification },
    { label: 'Phone',          value: doctor.phone },
    { label: 'Email',          value: doctor.email },
    { label: 'Experience',     value: doctor.experience },
    { label: 'Consultation Fee', value: doctor.consultationFee ? `₹${doctor.consultationFee}` : '—' },
    { label: 'Availability',   value: doctor.availability },
    { label: 'Address / Cabin',value: doctor.address },
  ];

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '520px' }}>
        <div className="modal-header">
          <div>
            <h3>{doctor.fullName}</h3>
            <div style={{ fontSize: '12px', color: '#5a7394', marginTop: '2px' }}>{doctor.specialization}</div>
          </div>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {fields.map(({ label, value, mono }) => (
              value ? (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#0d1117', borderRadius: '8px', border: '1px solid #1e2a3a' }}>
                  <span style={{ fontSize: '12px', color: '#5a7394' }}>{label}</span>
                  <span style={{ fontSize: '13px', color: mono ? '#f59e0b' : '#f0f4f8', fontFamily: mono ? 'Space Mono,monospace' : 'inherit', fontWeight: '500' }}>{value}</span>
                </div>
              ) : null
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: '#0d1117', borderRadius: '8px', border: '1px solid #1e2a3a' }}>
              <span style={{ fontSize: '12px', color: '#5a7394' }}>Status</span>
              <span className={`badge ${doctor.active ? 'badge-active' : 'badge-cancelled'}`}>{doctor.active ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────
export default function LMDoctors() {
  const [doctors, setDoctors]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterSpec, setFilterSpec] = useState('ALL');
  const [filterActive, setFilterActive] = useState('ALL');
  const [modal, setModal]           = useState(null);   // null | {} | doctor obj
  const [viewDoc, setViewDoc]       = useState(null);
  const [toast, setToast]           = useState('');

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(''), 3000); };

  const load = () => {
    LMApi.getDoctors()
      .then(r => setDoctors(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleToggle = async (id) => {
    await LMApi.toggleDoctorActive(id);
    showToast('Doctor status updated');
    load();
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Delete Dr. ${name}? This cannot be undone.`)) return;
    await LMApi.deleteDoctor(id);
    showToast('Doctor deleted');
    load();
  };

  const specs = ['ALL', ...new Set(doctors.map(d => d.specialization).filter(Boolean))];

  const filtered = doctors.filter(d => {
    const q = search.toLowerCase();
    const matchSearch = !q || d.fullName?.toLowerCase().includes(q) || d.specialization?.toLowerCase().includes(q) || d.doctorCode?.toLowerCase().includes(q);
    const matchSpec   = filterSpec   === 'ALL' || d.specialization === filterSpec;
    const matchActive = filterActive === 'ALL' || (filterActive === 'ACTIVE' ? d.active : !d.active);
    return matchSearch && matchSpec && matchActive;
  });

  const activeCnt   = doctors.filter(d => d.active).length;
  const inactiveCnt = doctors.filter(d => !d.active).length;

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading doctors...</span></div>;

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Doctor Management</h1>
          <p className="page-subtitle">
            {doctors.length} total · <span style={{ color: '#22c55e' }}>{activeCnt} active</span> · <span style={{ color: '#64748b' }}>{inactiveCnt} inactive</span>
          </p>
        </div>
        {/*<button className="btn btn-primary" onClick={() => setModal({})}>
          <Plus size={14} /> Add Doctor
        </button>*/}
      </div>

      {/* Summary pills */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: 'Total', count: doctors.length, color: '#f59e0b' },
          { label: 'Active', count: activeCnt, color: '#22c55e' },
          { label: 'Inactive', count: inactiveCnt, color: '#64748b' },
          { label: 'Specializations', count: new Set(doctors.map(d => d.specialization)).size, color: '#14b8a6' },
        ].map(({ label, count, color }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            background: '#111827', border: '1px solid #1e2a3a',
            borderRadius: '8px', padding: '8px 14px',
          }}>
            <span style={{ fontSize: '18px', fontWeight: '700', fontFamily: 'Space Mono,monospace', color }}>{count}</span>
            <span style={{ fontSize: '12px', color: '#5a7394' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div className="search-bar">
          <Search size={14} className="icon" />
          <input placeholder="Search name, code, specialization..." value={search}
            onChange={e => setSearch(e.target.value)} style={{ width: '260px' }} />
        </div>
        <select value={filterSpec} onChange={e => setFilterSpec(e.target.value)}
          style={{ width: 'auto', padding: '8px 12px' }}>
          {specs.map(s => <option key={s}>{s}</option>)}
        </select>
        <div className="tabs" style={{ marginBottom: 0 }}>
          {['ALL','ACTIVE','INACTIVE'].map(v => (
            <button key={v} className={`tab-btn ${filterActive === v ? 'active' : ''}`} onClick={() => setFilterActive(v)}>{v}</button>
          ))}
        </div>
      </div>

      {/* Doctor cards grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
        {filtered.length === 0 ? (
          <div className="empty-state" style={{ gridColumn: '1/-1', paddingTop: '60px' }}>
            <Stethoscope size={36} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
            <p>No doctors found</p>
          </div>
        ) : filtered.map(doc => (
          <div key={doc.id} style={{
            background: '#111827', border: '1px solid #1e2a3a',
            borderRadius: '12px', padding: '18px',
            transition: 'border-color 0.15s',
            opacity: doc.active ? 1 : 0.6,
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = '#14b8a620'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2a3a'}>

            {/* Card header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                background: 'linear-gradient(135deg,#14b8a620,#14b8a608)',
                border: '1.5px solid #14b8a630',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '14px', fontWeight: '700', color: '#14b8a6',
              }}>
                {doc.fullName?.split(' ').filter(w => w !== 'Dr.').map(w => w[0]).join('').slice(0, 2)}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: '700', color: '#f0f4f8' }}>{doc.fullName}</span>
                  {doc.active && <BadgeCheck size={14} color="#22c55e" />}
                </div>
                <div style={{ fontSize: '12px', color: '#14b8a6', fontWeight: '600', marginTop: '1px' }}>
                  {doc.specialization}
                </div>
                <div style={{ fontSize: '11px', color: '#3a4f66', fontFamily: 'Space Mono,monospace', marginTop: '2px' }}>
                  {doc.doctorCode}
                </div>
              </div>
              <span className={`badge ${doc.active ? 'badge-active' : 'badge-cancelled'}`}>
                {doc.active ? 'Active' : 'Off'}
              </span>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginBottom: '14px' }}>
              {doc.qualification && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Star size={11} color="#f59e0b" />
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>{doc.qualification}</span>
                </div>
              )}
              {doc.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Phone size={11} color="#5a7394" />
                  <span style={{ fontSize: '12px', color: '#5a7394', fontFamily: 'Space Mono,monospace' }}>{doc.phone}</span>
                </div>
              )}
              {doc.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Mail size={11} color="#5a7394" />
                  <span style={{ fontSize: '12px', color: '#5a7394', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.email}</span>
                </div>
              )}
              {doc.availability && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                  <Clock size={11} color="#5a7394" />
                  <span style={{ fontSize: '12px', color: '#5a7394' }}>{doc.availability}</span>
                </div>
              )}
            </div>

            {/* Fee + experience row */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {doc.experience && (
                <div style={{ flex: 1, background: '#0d1117', borderRadius: '6px', padding: '6px 10px', border: '1px solid #1e2a3a' }}>
                  <div style={{ fontSize: '10px', color: '#3a4f66', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Experience</div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f4f8', marginTop: '2px' }}>{doc.experience}</div>
                </div>
              )}
              {doc.consultationFee && (
                <div style={{ flex: 1, background: '#0d1117', borderRadius: '6px', padding: '6px 10px', border: '1px solid #1e2a3a' }}>
                  <div style={{ fontSize: '10px', color: '#3a4f66', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Fee</div>
                  <div style={{ fontSize: '13px', fontWeight: '700', color: '#f59e0b', fontFamily: 'Space Mono,monospace', marginTop: '2px' }}>₹{doc.consultationFee}</div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '6px', paddingTop: '12px', borderTop: '1px solid #1e2a3a' }}>
              <button className="btn btn-teal btn-sm" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setViewDoc(doc)}>
                View
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(doc)} title="Edit">
                <Edit2 size={13} />
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => handleToggle(doc.id)}
                title={doc.active ? 'Deactivate' : 'Activate'}
                style={{ color: doc.active ? '#ef4444' : '#22c55e' }}>
                {doc.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
              </button>
              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(doc.id, doc.fullName)} title="Delete">
                <Trash2 size={13} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modals */}
      {modal !== null && (
        <LMDoctorModal
          doctor={modal.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); showToast(modal.id ? 'Doctor updated' : 'Doctor added'); load(); }}
        />
      )}
      {viewDoc && <LMDoctorDetail doctor={viewDoc} onClose={() => setViewDoc(null)} />}

      {/* Toast */}
      {toast && <div className="toast success">{toast}</div>}
    </div>
  );
}



