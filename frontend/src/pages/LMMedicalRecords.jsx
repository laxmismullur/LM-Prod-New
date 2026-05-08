import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import { useLMAuth } from '../context/LMAuthContext';
import { Plus, Search, Eye, Edit2, Trash2, X } from 'lucide-react';

const EMPTY = {
  patientId: '',
  patientName: '',
  doctorId: '',
  doctorName: '',
  diagnosis: '',
  prescription: '',
  notes: '',
  labResults: '',
  vitals: '',
  followUpDate: ''
};

function LMRecordModal({ record, patients, doctors, currentDoctor, onClose, onSave }) {
  const [form, setForm] = useState(record || {
    ...EMPTY,
    doctorId: currentDoctor?.id || '',
    doctorName: currentDoctor?.fullName || ''
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePatient = (id) => {
    const p = patients.find(p => p.id === Number(id));
    setForm(f => ({
      ...f,
      patientId: id,
      patientName: p?.fullName || ''
    }));
  };

  const handleDoctor = (id) => {
    const d = doctors.find(d => d.id === Number(id));
    setForm(f => ({
      ...f,
      doctorId: id,
      doctorName: d?.fullName || ''
    }));
  };

  const handleSave = async () => {
    // Trim string fields
    const trimmedForm = {
      ...form,
      diagnosis: form.diagnosis.trim(),
      prescription: form.prescription.trim(),
      notes: form.notes.trim(),
      labResults: form.labResults.trim(),
      vitals: form.vitals.trim()
    };

    // Validate required fields
    if (!trimmedForm.patientId || !trimmedForm.doctorId || !trimmedForm.diagnosis) {
      alert("Please fill all required fields: Patient, Doctor, and Diagnosis");
      return;
    }

    // Validate follow-up date if provided
    if (trimmedForm.followUpDate) {
      const today = new Date().toISOString().split('T')[0];
      if (trimmedForm.followUpDate < today) {
        alert("Follow-up date cannot be in the past");
        return;
      }
    }

    // Additional validations
    if (trimmedForm.diagnosis.length < 3) {
      alert("Diagnosis must be at least 3 characters long");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...trimmedForm,
        patientId: Number(trimmedForm.patientId),
        doctorId: Number(trimmedForm.doctorId)
      };

      if (record?.id) {
        await LMApi.updateMedicalRecord(record.id, payload);
      } else {
        await LMApi.createMedicalRecord(payload);
      }

      onSave();
    } catch (err) {
      console.error(err);
      alert('Error saving record');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3>{record?.id ? 'Edit Medical Record' : 'New Medical Record'}</h3>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-row">

            {/* Patient */}
            <div className="form-group">
              <label>Patient *</label>
              <select value={form.patientId} onChange={e => handlePatient(e.target.value)}>
                <option value="">Select Patient</option>
                {patients.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.fullName}
                  </option>
                ))}
              </select>
            </div>

            {/* Doctor */}
            <div className="form-group">
              <label>Doctor *</label>
              <select value={form.doctorId} onChange={e => handleDoctor(e.target.value)}>
                <option value="">Select Doctor</option>
                {doctors.map(d => (
                  <option key={d.id} value={d.id}>
                    {d.fullName} — {d.specialization}
                  </option>
                ))}
              </select>
            </div>

          </div>

          <div className="form-group">
            <label>Diagnosis *</label>
            <input
              value={form.diagnosis}
              onChange={e => set('diagnosis', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Vitals</label>
            <input
              value={form.vitals}
              onChange={e => set('vitals', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Prescription</label>
            <textarea
              rows={3}
              value={form.prescription}
              onChange={e => set('prescription', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Lab Results</label>
            <textarea
              rows={2}
              value={form.labResults}
              onChange={e => set('labResults', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>Clinical Notes</label>
            <textarea
              rows={3}
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
            />
          </div>

          {/* ✅ FIXED DATE INPUT */}
          <div className="form-group">
            <label>Follow-up Date</label>
            <input
              type="date"
              value={form.followUpDate}
              onChange={e => set('followUpDate', e.target.value)}
            />
          </div>

        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : record?.id ? 'Update Record' : 'Create Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LMTreatmentModal({ record, onClose, onSave }) {
  const [form, setForm] = useState({
    prescription: record?.prescription || '',
    notes: record?.notes || '',
    followUpDate: record?.followUpDate || ''
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await LMApi.updateMedicalRecord(record.id, { ...record, ...form });
      onSave();
    } catch (err) {
      console.error(err);
      alert('Error saving treatment');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '560px' }}>
        <div className="modal-header">
          <h3>Add Treatment</h3>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Prescription / Treatment</label>
            <textarea rows={4} value={form.prescription} onChange={e => set('prescription', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Clinical Notes</label>
            <textarea rows={4} value={form.notes} onChange={e => set('notes', e.target.value)} />
          </div>
          <div className="form-group">
            <label>Follow-up Date</label>
            <input type="date" value={form.followUpDate || ''} onChange={e => set('followUpDate', e.target.value)} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Treatment'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LMMedicalRecords() {
  const { user } = useLMAuth();
  const isDoctor = user?.role === 'DOCTOR';
  const isNurse = user?.role === 'NURSE';
  const [records, setRecords] = useState([]);
  const [patients, setPatients] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [currentDoctor, setCurrentDoctor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [treatmentModal, setTreatmentModal] = useState(null);
  const [viewRecord, setViewRecord] = useState(null);

  // ✅ FIXED LOAD FUNCTION
  const load = async () => {
    try {
      const [r, p, d] = await Promise.all([
        LMApi.getMedicalRecords(),
        LMApi.getPatients(),
        isDoctor ? LMApi.getMyDoctorProfile() : LMApi.getDoctors()
      ]);

      setRecords(r.data);
      setPatients(p.data);

      // ✅ Only active doctors (optional)
      const doctorList = isDoctor ? [d.data] : d.data.filter(doc => doc.active);
      setDoctors(doctorList);
      setCurrentDoctor(isDoctor ? d.data : null);

    } catch (err) {
      console.error("Error loading:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [user?.role]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this record?')) return;
    await LMApi.deleteMedicalRecord(id);
    load();
  };

  const filtered = records.filter(r =>
    r.patientName?.toLowerCase().includes(search.toLowerCase()) ||
    r.diagnosis?.toLowerCase().includes(search.toLowerCase()) ||
    r.doctorName?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Medical Records</div>
          <div className="page-subtitle">Track patient diagnostics, prescriptions, and follow-up notes</div>
        </div>
        {isNurse && (
          <button className="btn btn-primary" onClick={() => setModal({})}>
            <Plus size={16} /> New Record
          </button>
        )}
      </div>

      <div className="search-bar" style={{ marginBottom: '18px', maxWidth: '420px' }}>
        <Search className="icon" size={16} />
        <input
          placeholder="Search medical records..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Doctor</th>
              <th>Diagnosis</th>
              <th>Actions</th>
            </tr>
          </thead>

        <tbody>
          {filtered.map(r => (
            <tr key={r.id}>
              <td>{r.patientName}</td>
              <td>{r.doctorName}</td>
              <td>{r.diagnosis}</td>
              <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-sm btn-ghost" onClick={() => setViewRecord(r)}>
                  <Eye size={14} /> View
                </button>
                {isDoctor && (
                  <button className="btn btn-sm btn-primary" onClick={() => setTreatmentModal(r)}>
                    <Edit2 size={14} /> Treatment
                  </button>
                )}
                {isNurse && (
                  <>
                    <button className="btn btn-sm btn-ghost" onClick={() => setModal(r)}>
                      <Edit2 size={14} /> Edit
                    </button>
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(r.id)}>
                      <Trash2 size={14} /> Delete
                    </button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>

      {modal !== null && (
        <LMRecordModal
          record={modal.id ? modal : null}
          patients={patients}
          doctors={doctors}
          currentDoctor={currentDoctor}
          onClose={() => setModal(null)}
          onSave={() => {
            setModal(null);
            load();
          }}
        />
      )}

      {treatmentModal && (
        <LMTreatmentModal
          record={treatmentModal}
          onClose={() => setTreatmentModal(null)}
          onSave={() => {
            setTreatmentModal(null);
            load();
          }}
        />
      )}

      {viewRecord && (
        <LMRecordView
          record={viewRecord}
          onClose={() => setViewRecord(null)}
        />
      )}
    </div>
  );
}

function LMRecordView({ record, onClose }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '640px' }}>
        <div className="modal-header">
          <h3>Medical Record Details</h3>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-grid">
            <div>
              <label>Patient</label>
              <div>{record.patientName}</div>
            </div>
            <div>
              <label>Doctor</label>
              <div>{record.doctorName}</div>
            </div>
            <div className="col-span-2">
              <label>Diagnosis</label>
              <div>{record.diagnosis || '—'}</div>
            </div>
            <div>
              <label>Follow-up Date</label>
              <div>{record.followUpDate || '—'}</div>
            </div>
            <div>
              <label>Vitals</label>
              <div>{record.vitals || '—'}</div>
            </div>
            <div className="col-span-2">
              <label>Prescription</label>
              <div>{record.prescription || '—'}</div>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}
