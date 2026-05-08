import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import {
  Search, Edit2, Trash2, X,
  Phone, Mail, BadgeCheck,
  ToggleLeft, ToggleRight, User
} from 'lucide-react';

// ───────── EMPTY ─────────
const EMPTY = {
  fullName: '',
  username: '',
  password: '',
  phone: '',
  email: '',
  department: '',
  active: true
};

const NAME_RE = /^[A-Za-z][A-Za-z\s.'-]{2,}$/;
const PHONE_RE = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ───────── MODAL ─────────
function ReceptionistModal({ data, onClose, onSave }) {
  const [form, setForm] = useState({ ...(data || EMPTY), password: '' });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.fullName || !form.username || !form.email || !form.phone) {
      alert("Name, username, email and phone are required");
      return;
    }
    if (!NAME_RE.test(form.fullName.trim())) {
      alert("Name must contain only letters and be at least 3 characters");
      return;
    }
    if (!EMAIL_RE.test(form.email.trim())) {
      alert("Enter a valid email address");
      return;
    }
    if (!PHONE_RE.test(form.phone.trim())) {
      alert("Enter a valid Indian phone number");
      return;
    }
    if (!data?.id && !form.password) {
      alert("Password is required");
      return;
    }

    if (data?.id) {
      await LMApi.updateStaff(data.id, { ...form, role: 'RECEPTIONIST' });
    } else {
      await LMApi.createStaff({ ...form, role: 'RECEPTIONIST' });
    }

    onSave();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        <div className="modal-header">
          <h3>{data?.id ? 'Edit Receptionist' : 'Add Receptionist'}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
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
              <label>{data?.id ? 'New Password' : 'Password *'}</label>
              <input
                type="password"
                value={form.password || ''}
                onChange={e => set('password', e.target.value)}
                placeholder={data?.id ? 'Leave blank to keep current password' : ''}
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

          <div className="form-group">
            <label>Department</label>
            <input value={form.department} onChange={e => set('department', e.target.value)} />
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave}>
            {data?.id ? 'Update' : 'Add'}
          </button>
        </div>

      </div>
    </div>
  );
}

// ───────── VIEW MODAL ─────────
function ReceptionistView({ data, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">

        <div className="modal-header">
          <h3>{data.fullName}</h3>
          <button onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <p><b>Phone:</b> {data.phone}</p>
          <p><b>Email:</b> {data.email}</p>
          <p><b>Department:</b> {data.department}</p>
          <p><b>Status:</b> {data.active ? 'Active' : 'Inactive'}</p>
        </div>

      </div>
    </div>
  );
}

// ───────── MAIN PAGE ─────────
export default function LMReceptionists() {

  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [view, setView] = useState(null);

  const load = () => {
    LMApi.getStaffByRole("RECEPTIONIST")
      .then(res => setList(res.data));
  };

  useEffect(() => { load(); }, []);

  const active = list.filter(x => x.active).length;
  const inactive = list.filter(x => !x.active).length;

  const filtered = list.filter(x =>
    x.fullName?.toLowerCase().includes(search.toLowerCase())
  );

  const handleDelete = async (id) => {
    if (!confirm("Delete receptionist?")) return;
    await LMApi.deleteStaff(id);
    load();
  };

  const handleToggle = async (id) => {
    await LMApi.toggleStaffActive(id);
    load();
  };

  return (
    <div>

      {/* HEADER */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Receptionist Management</h1>
          <p className="page-subtitle">
            {list.length} total · 
            <span style={{ color: '#22c55e' }}> {active} active</span> · 
            <span style={{ color: '#64748b' }}> {inactive} inactive</span>
          </p>
        </div>

        {/*<button className="btn btn-primary" onClick={() => setModal({})}>
          Add Receptionist
        </button>*/}
      </div>

      {/* SEARCH */}
      <div className="search-bar">
        <Search size={14} />
        <input
          placeholder="Search receptionist..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      {/* CARDS */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
        gap: '16px',
        marginTop: '20px'
      }}>

        {filtered.map(emp => (
          <div key={emp.id} style={{
            background: '#111827',
            border: '1px solid #1e2a3a',
            borderRadius: '12px',
            padding: '18px',
            opacity: emp.active ? 1 : 0.6
          }}>

            {/* HEADER */}
            <div style={{ display: 'flex', gap: '10px' }}>
              <User color="#14b8a6" />
              <div>
                <h4 style={{ color: '#f0f4f8' }}>{emp.fullName}</h4>
                <p style={{ color: '#5a7394' }}>{emp.department}</p>
              </div>
            </div>

            {/* DETAILS */}
            <p><Phone size={12} /> {emp.phone}</p>
            <p><Mail size={12} /> {emp.email}</p>

            {emp.active && <BadgeCheck color="#22c55e" />}

            {/* ACTIONS */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
              <button className="btn btn-teal btn-sm" onClick={() => setView(emp)}>View</button>

              <button className="btn btn-ghost btn-sm" onClick={() => setModal(emp)}>
                <Edit2 size={14} />
              </button>

              <button
                className="btn btn-ghost btn-sm"
                onClick={() => handleToggle(emp.id)}
                style={{ color: emp.active ? '#ef4444' : '#22c55e' }}
              >
                {emp.active ? <ToggleRight size={15} /> : <ToggleLeft size={15} />}
              </button>

              <button className="btn btn-danger btn-sm" onClick={() => handleDelete(emp.id)}>
                <Trash2 size={14} />
              </button>
            </div>

          </div>
        ))}

      </div>

      {/* MODALS */}
      {modal !== null && (
        <ReceptionistModal
          data={modal?.id ? modal : null}
          onClose={() => setModal(null)}
          onSave={() => { setModal(null); load(); }}
        />
      )}

      {view && <ReceptionistView data={view} onClose={() => setView(null)} />}

    </div>
    
  );
  
}
