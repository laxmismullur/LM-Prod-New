import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import {
  Search, Edit2, Trash2, X, Phone, Mail, BadgeCheck, User
} from 'lucide-react';

const EMPTY = {
  fullName: '',
  username: '',
  password: '',
  specialization: '',
  department: '',
  phone: '',
  email: '',
  active: true,
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

const NAME_RE = /^[A-Za-z][A-Za-z\s.'-]{2,}$/;
const PHONE_RE = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ───────────── MODAL ─────────────
function NurseModal({ nurse, onClose, onSave }) {
  const [form, setForm] = useState({ ...(nurse || EMPTY), password: '' });
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSpec = (v) => {
    setForm(p => ({
      ...p,
      specialization: v,
      department: DEPT_MAP[v] || v
    }));
  };

  const handleSave = async () => {
    if (!form.fullName || !form.username || !form.email || !form.phone) {
      setError("Name, username, email and phone are required");
      return;
    }
    if (!NAME_RE.test(form.fullName.trim())) {
      setError("Name must contain only letters and be at least 3 characters");
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      setError("Enter a valid email address");
      return;
    }
    if (!PHONE_RE.test(form.phone.trim())) {
      setError("Enter a valid Indian phone number");
      return;
    }
    if (!nurse?.id && !form.password) {
      setError("Password is required");
      return;
    }

    try {
      if (nurse?.id) {
        await LMApi.updateStaff(nurse.id, { ...form, role: 'NURSE' });
      } else {
        await LMApi.createStaff({ ...form, role: 'NURSE' });
      }
      onSave();
    } catch (e) {
      setError(e.response?.data || "Save failed");
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>{nurse?.id ? 'Edit Nurse' : 'Add Nurse'}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">

          {error && (
            <div style={{
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              padding: '10px',
              borderRadius: '8px',
              marginBottom: '10px',
              color: '#ef4444'
            }}>
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Full Name *</label>
              <input value={form.fullName} onChange={e => set('fullName', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Username *</label>
              <input value={form.username || ''} onChange={e => set('username', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input value={form.email} onChange={e => set('email', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Phone *</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>{nurse?.id ? 'New Password' : 'Password *'}</label>
              <input
                type="password"
                value={form.password || ''}
                onChange={e => set('password', e.target.value)}
                placeholder={nurse?.id ? 'Leave blank to keep current password' : ''}
              />
            </div>

            <div className="form-group">
              <label>Status</label>
              <select value={String(form.active)} onChange={e => set('active', e.target.value === 'true')}>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Department</label>
              <input value={form.department} onChange={e => set('department', e.target.value)} />
            </div>

            <div className="form-group">
              <label>Specialization</label>
              <select value={form.specialization} onChange={e => handleSpec(e.target.value)}>
                <option value="">Select Specialization</option>
                {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {nurse?.id ? 'Update Nurse' : 'Add Nurse'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ───────────── MAIN PAGE (DOCTOR STYLE FIXED) ─────────────
export default function LMNurses() {

  const [nurses, setNurses] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [view, setView] = useState(null);
  const [toast, setToast] = useState('');

  const load = () => {
    LMApi.getStaffByRole("NURSE").then(res => setNurses(res.data));
  };

  useEffect(() => { load(); }, []);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  };

  const active = nurses.filter(n => n.active).length;
  const inactive = nurses.filter(n => !n.active).length;

  // ✅ FIXED: specialization count added
  const specializationCount = new Set(nurses.map(n => n.specialization)).size;

  const filtered = nurses.filter(n =>
    n.fullName?.toLowerCase().includes(search.toLowerCase()) ||
    n.specialization?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!confirm("Delete nurse?")) return;
    await LMApi.deleteStaff(id);
    showToast("Deleted");
    load();
  };

  return (
    <div>

      {/* HEADER (DOCTOR STYLE) */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Nurse Management</h1>
          <p className="page-subtitle">
            {nurses.length} total · <span style={{ color: '#22c55e' }}>{active} active</span> · <span style={{ color: '#64748b' }}>{inactive} inactive</span>
          </p>
        </div>
      </div>

      {/* SUMMARY PILLS (DOCTOR STYLE) */}
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginBottom: '20px' }}>
        {[
          { label: 'Total', count: nurses.length, color: '#f59e0b' },
          { label: 'Active', count: active, color: '#22c55e' },
          { label: 'Inactive', count: inactive, color: '#64748b' },
          { label: 'Specializations', count: specializationCount, color: '#14b8a6' },
        ].map(i => (
          <div key={i.label} style={{
            background: '#111827',
            padding: '8px 14px',
            borderRadius: '8px',
            border: '1px solid #1e2a3a'
          }}>
            <b style={{ color: i.color }}>{i.count}</b>
            <span style={{ marginLeft: 6, color: '#5a7394' }}>{i.label}</span>
          </div>
        ))}
      </div>

      {/* SEARCH */}
      <div className="search-bar">
        <Search size={14} />
        <input
          placeholder="Search nurse..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* CARDS (DOCTOR STYLE EXACT MATCH) */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
        marginTop: '20px'
      }}>

        {filtered.map(n => (
          <div key={n.id} style={{
            background: '#111827',
            border: '1px solid #1e2a3a',
            borderRadius: '12px',
            padding: '18px',
            opacity: n.active ? 1 : 0.6
          }}>

            {/* HEADER */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <User color="#14b8a6" />
              <div>
                <h4 style={{ color: '#f0f4f8' }}>{n.fullName}</h4>
                <p style={{ color: '#14b8a6' }}>{n.specialization}</p>
              </div>
            </div>

            {/* DETAILS */}
            <p><Phone size={12} /> {n.phone}</p>
            <p><Mail size={12} /> {n.email}</p>

            {n.active && <BadgeCheck color="#22c55e" />}

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button onClick={() => setView(n)} className="btn btn-teal btn-sm">View</button>
              <button onClick={() => setModal(n)} className="btn btn-ghost btn-sm"><Edit2 size={14} /></button>
              <button onClick={() => handleDelete(n.id)} className="btn btn-danger btn-sm"><Trash2 size={14} /></button>
            </div>

          </div>
        ))}

      </div>

      {/* MODAL */}
      {modal !== null && (
        <NurseModal
          nurse={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); showToast("Saved"); }}
        />
      )}

      {view && (
        <div className="modal-overlay" onClick={() => setView(null)}>
          <div className="modal">
            <h3>{view.fullName}</h3>
            <p>{view.specialization}</p>
            <p>{view.phone}</p>
            <p>{view.email}</p>
          </div>
        </div>
      )}

      {/* TOAST */}
      {toast && <div className="toast success">{toast}</div>}

    </div>
  );
}
