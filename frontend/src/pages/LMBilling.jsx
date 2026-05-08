import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import { Plus, Search, Eye, Edit2, Trash2, X, Check } from 'lucide-react';
import { useLMAuth } from '../context/LMAuthContext';

const PAYMENT_STATUSES = ['PENDING', 'PAID', 'PARTIAL'];

const EMPTY_BILLING = {
  patientId: '',
  patientName: '',
  services: '',
  consultationFee: '',
  medicationCost: '',
  labCost: '',
  roomCharge: '',
  totalAmount: '',
  discount: '',
  paidAmount: '',
  paymentStatus: 'PENDING',
  paymentMethod: ''
};

function LMBillingModal({ billing, patients, onClose, onSave }) {
  const [form, setForm] = useState(billing || EMPTY_BILLING);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handlePatient = (id) => {
    const p = patients.find(p => p.id === Number(id));
    setForm(f => ({
      ...f,
      patientId: id,
      patientName: p?.fullName || ''
    }));
  };

  const calculateTotal = (formData) => {
    const consultation = parseFloat(formData.consultationFee) || 0;
    const medication = parseFloat(formData.medicationCost) || 0;
    const lab = parseFloat(formData.labCost) || 0;
    const room = parseFloat(formData.roomCharge) || 0;
    const discount = parseFloat(formData.discount) || 0;

    const subtotal = consultation + medication + lab + room;
    return Math.max(0, subtotal - discount).toFixed(2);
  };

  const handleSave = async () => {
    // Trim string fields
    const trimmedForm = {
      ...form,
      services: form.services.trim(),
      paymentMethod: form.paymentMethod.trim()
    };

    // Validate required fields
    if (!trimmedForm.patientId) {
      setError('Please select a patient');
      return;
    }

    if (!trimmedForm.totalAmount || parseFloat(trimmedForm.totalAmount) <= 0) {
      setError('Total amount must be greater than 0');
      return;
    }

    // Validate amounts are positive
    const consultation = parseFloat(trimmedForm.consultationFee) || 0;
    const medication = parseFloat(trimmedForm.medicationCost) || 0;
    const lab = parseFloat(trimmedForm.labCost) || 0;
    const room = parseFloat(trimmedForm.roomCharge) || 0;

    if (consultation < 0 || medication < 0 || lab < 0 || room < 0) {
      setError('All amounts must be positive');
      return;
    }

    // Validate paid amount
    if (trimmedForm.paidAmount) {
      const paidAmount = parseFloat(trimmedForm.paidAmount);
      const totalAmount = parseFloat(trimmedForm.totalAmount);
      if (paidAmount < 0 || paidAmount > totalAmount) {
        setError('Paid amount must be between 0 and total amount');
        return;
      }
    }

    setSaving(true);
    setError('');

    try {
      const payload = {
        ...trimmedForm,
        patientId: Number(trimmedForm.patientId),
        consultationFee: parseFloat(trimmedForm.consultationFee) || 0,
        medicationCost: parseFloat(trimmedForm.medicationCost) || 0,
        labCost: parseFloat(trimmedForm.labCost) || 0,
        roomCharge: parseFloat(trimmedForm.roomCharge) || 0,
        totalAmount: parseFloat(trimmedForm.totalAmount),
        discount: parseFloat(trimmedForm.discount) || 0,
        paidAmount: parseFloat(trimmedForm.paidAmount) || 0
      };

      if (billing?.id) {
        await LMApi.updateBilling(billing.id, payload);
      } else {
        await LMApi.createBilling(payload);
      }

      onSave();
    } catch (err) {
      console.error(err);
      setError('Error saving billing record');
    } finally {
      setSaving(false);
    }
  };

  const totalAmount = calculateTotal(form);

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '700px' }}>
        <div className="modal-header">
          <h3>{billing?.id ? 'Edit Billing' : 'New Billing'}</h3>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          {error && <div style={{ color: '#d32f2f', marginBottom: '12px', padding: '8px', backgroundColor: '#ffebee', borderRadius: '4px' }}>{error}</div>}

          <div className="form-row">
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
          </div>

          <div className="form-group">
            <label>Services Description</label>
            <textarea
              rows={2}
              value={form.services}
              onChange={e => set('services', e.target.value)}
              placeholder="e.g., General checkup, Blood test, X-ray"
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label>Consultation Fee</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.consultationFee}
                onChange={e => {
                  set('consultationFee', e.target.value);
                  set('totalAmount', calculateTotal({ ...form, consultationFee: e.target.value }));
                }}
              />
            </div>
            <div className="form-group">
              <label>Medication Cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.medicationCost}
                onChange={e => {
                  set('medicationCost', e.target.value);
                  set('totalAmount', calculateTotal({ ...form, medicationCost: e.target.value }));
                }}
              />
            </div>
            <div className="form-group">
              <label>Lab Cost</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.labCost}
                onChange={e => {
                  set('labCost', e.target.value);
                  set('totalAmount', calculateTotal({ ...form, labCost: e.target.value }));
                }}
              />
            </div>
            <div className="form-group">
              <label>Room Charge</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.roomCharge}
                onChange={e => {
                  set('roomCharge', e.target.value);
                  set('totalAmount', calculateTotal({ ...form, roomCharge: e.target.value }));
                }}
              />
            </div>
            <div className="form-group">
              <label>Discount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.discount}
                onChange={e => {
                  set('discount', e.target.value);
                  set('totalAmount', calculateTotal({ ...form, discount: e.target.value }));
                }}
              />
            </div>
            <div className="form-group">
              <label>Total Amount *</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.totalAmount}
                onChange={e => set('totalAmount', e.target.value)}
                disabled={!form.consultationFee && !form.medicationCost && !form.labCost && !form.roomCharge}
                style={{ backgroundColor: '#f5f5f5' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
            <div className="form-group">
              <label>Payment Status *</label>
              <select value={form.paymentStatus} onChange={e => set('paymentStatus', e.target.value)}>
                {PAYMENT_STATUSES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Paid Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.paidAmount}
                onChange={e => set('paidAmount', e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Payment Method</label>
            <select value={form.paymentMethod} onChange={e => set('paymentMethod', e.target.value)}>
              <option value="">Select Payment Method</option>
              <option value="CASH">Cash</option>
              <option value="CARD">Card</option>
              <option value="CHEQUE">Cheque</option>
              <option value="ONLINE">Online Transfer</option>
              <option value="INSURANCE">Insurance</option>
            </select>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Saving...' : billing?.id ? 'Update Billing' : 'Create Billing'}
          </button>
        </div>
      </div>
    </div>
  );
}

function LMBillingView({ billing, onClose, onMarkPaid }) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: '600px' }}>
        <div className="modal-header">
          <h3>Billing Details</h3>
          <button className="close-btn" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <div>
              <label>Invoice Number</label>
              <div style={{ fontWeight: 'bold' }}>{billing.invoiceNumber}</div>
            </div>
            <div>
              <label>Patient</label>
              <div>{billing.patientName}</div>
            </div>
            <div>
              <label>Payment Status</label>
              <div style={{ 
                padding: '4px 8px',
                borderRadius: '4px',
                display: 'inline-block',
                backgroundColor: billing.paymentStatus === 'PAID' ? '#c8e6c9' : billing.paymentStatus === 'PENDING' ? '#fff3cd' : '#e1bee7',
                fontWeight: 'bold'
              }}>
                {billing.paymentStatus}
              </div>
            </div>
            <div>
              <label>Payment Method</label>
              <div>{billing.paymentMethod || '—'}</div>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #eee', paddingTop: '12px', marginBottom: '12px' }}>
            <h4 style={{ marginBottom: '12px' }}>Cost Breakdown</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px', fontSize: '14px' }}>
              {billing.consultationFee > 0 && (
                <>
                  <span>Consultation Fee:</span>
                  <span style={{ textAlign: 'right' }}>₹{parseFloat(billing.consultationFee).toFixed(2)}</span>
                </>
              )}
              {billing.medicationCost > 0 && (
                <>
                  <span>Medication Cost:</span>
                  <span style={{ textAlign: 'right' }}>₹{parseFloat(billing.medicationCost).toFixed(2)}</span>
                </>
              )}
              {billing.labCost > 0 && (
                <>
                  <span>Lab Cost:</span>
                  <span style={{ textAlign: 'right' }}>₹{parseFloat(billing.labCost).toFixed(2)}</span>
                </>
              )}
              {billing.roomCharge > 0 && (
                <>
                  <span>Room Charge:</span>
                  <span style={{ textAlign: 'right' }}>₹{parseFloat(billing.roomCharge).toFixed(2)}</span>
                </>
              )}
              {billing.discount > 0 && (
                <>
                  <span>Discount:</span>
                  <span style={{ textAlign: 'right', color: '#4caf50' }}>-₹{parseFloat(billing.discount).toFixed(2)}</span>
                </>
              )}
              <span style={{ borderTop: '1px solid #ddd', paddingTop: '8px', fontWeight: 'bold', marginTop: '8px' }}>Total Amount:</span>
              <span style={{ borderTop: '1px solid #ddd', paddingTop: '8px', fontWeight: 'bold', marginTop: '8px', textAlign: 'right', color: '#1d4ed8' }}>₹{parseFloat(billing.totalAmount).toFixed(2)}</span>
              {billing.paidAmount > 0 && (
                <>
                  <span>Paid Amount:</span>
                  <span style={{ textAlign: 'right', color: '#4caf50' }}>₹{parseFloat(billing.paidAmount).toFixed(2)}</span>
                </>
              )}
              {billing.paymentStatus !== 'PAID' && (
                <>
                  <span>Outstanding Amount:</span>
                  <span style={{ textAlign: 'right', color: '#d32f2f' }}>₹{(parseFloat(billing.totalAmount) - (parseFloat(billing.paidAmount) || 0)).toFixed(2)}</span>
                </>
              )}
            </div>
          </div>

          {billing.services && (
            <div>
              <label>Services</label>
              <div>{billing.services}</div>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {billing.paymentStatus !== 'PAID' && (
            <button className="btn btn-success" onClick={() => { onMarkPaid(billing.id); onClose(); }}>
              <Check size={14} /> Mark as Paid
            </button>
          )}
          <button className="btn btn-ghost" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

export default function LMBilling() {
  const { user } = useLMAuth();
  const canManageBilling = user?.role === 'RECEPTIONIST';

  const [billings, setBillings] = useState([]);
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [showModal, setShowModal] = useState(false);
  const [editingBilling, setEditingBilling] = useState(null);
  const [viewBilling, setViewBilling] = useState(null);

  const load = async () => {
    try {
      const [b, p] = await Promise.all([
        LMApi.getBillings(),
        LMApi.getPatients()
      ]);

      setBillings(b.data);
      setPatients(p.data);
    } catch (err) {
      console.error(err);
      alert('Error loading billing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this billing record?')) return;
    try {
      await LMApi.deleteBilling(id);
      load();
    } catch (err) {
      console.error(err);
      alert('Error deleting billing record');
    }
  };

  const handleMarkAsPaid = async (id) => {
    try {
      await LMApi.markBillAsPaid(id);
      load();
    } catch (err) {
      console.error(err);
      alert('Error marking bill as paid');
    }
  };

  const filtered = billings.filter(b => {
    const q = search.toLowerCase();

    const matchSearch =
      !q ||
      b.patientName?.toLowerCase().includes(q) ||
      b.invoiceNumber?.toLowerCase().includes(q) ||
      b.services?.toLowerCase().includes(q);

    const matchStatus =
      filterStatus === 'ALL' || b.paymentStatus === filterStatus;

    return matchSearch && matchStatus;
  });

  if (loading) return <div style={{ padding: '20px' }}>Loading...</div>;

  const totalAmount = filtered.reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0);
  const paidAmount = filtered.reduce((sum, b) => sum + (parseFloat(b.paidAmount) || 0), 0);
  const pendingAmount = totalAmount - paidAmount;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">Billing Management</div>
          <div className="page-subtitle">Manage patient billing, invoices, and payment records</div>
        </div>
        {canManageBilling && (
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> New Bill
          </button>
        )}
      </div>

      {/* Summary Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Total Amount</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1d4ed8' }}>₹{totalAmount.toFixed(2)}</div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#c8e6c9', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Paid Amount</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>₹{paidAmount.toFixed(2)}</div>
        </div>
        <div style={{ padding: '12px', backgroundColor: '#ffccbc', borderRadius: '4px' }}>
          <div style={{ fontSize: '12px', color: '#666' }}>Pending Amount</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold' }}>₹{pendingAmount.toFixed(2)}</div>
        </div>
      </div>

      <div className="search-bar" style={{ marginBottom: '18px', maxWidth: '420px' }}>
        <Search className="icon" size={16} />
        <input
          placeholder="Search billing records..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '12px' }}>
        <label style={{ marginRight: '8px' }}>Filter by Status:</label>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value)}
          style={{ padding: '6px 8px' }}
        >
          <option value="ALL">All</option>
          <option value="PENDING">Pending</option>
          <option value="PAID">Paid</option>
          <option value="PARTIAL">Partial</option>
        </select>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Invoice</th>
              <th>Patient</th>
              <th>Total Amount</th>
              <th>Paid Amount</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(b => (
              <tr key={b.id}>
                <td style={{ fontWeight: 'bold' }}>{b.invoiceNumber}</td>
                <td>{b.patientName}</td>
                <td>₹{parseFloat(b.totalAmount).toFixed(2)}</td>
                <td>₹{parseFloat(b.paidAmount || 0).toFixed(2)}</td>
                <td>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    fontWeight: 'bold',
                    backgroundColor: b.paymentStatus === 'PAID' ? '#c8e6c9' : b.paymentStatus === 'PENDING' ? '#fff3cd' : '#e1bee7'
                  }}>
                    {b.paymentStatus}
                  </span>
                </td>
                <td style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-sm btn-ghost" onClick={() => setViewBilling(b)}>
                    <Eye size={14} /> View
                  </button>
                  {canManageBilling && (
                    <>
                      <button className="btn btn-sm btn-ghost" onClick={() => { setEditingBilling(b); setShowModal(true); }}>
                        <Edit2 size={14} /> Edit
                      </button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(b.id)}>
                        <Trash2 size={14} /> Delete
                      </button>
                      {b.paymentStatus !== 'PAID' && (
                        <button 
                          className="btn btn-sm" 
                          style={{ backgroundColor: '#4caf50', color: 'white' }}
                          onClick={() => handleMarkAsPaid(b.id)}
                        >
                          <Check size={14} /> Pay
                        </button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: '20px', textAlign: 'center', color: '#999' }}>
            No billing records found
          </div>
        )}
      </div>

      {showModal && (
        <LMBillingModal
          billing={editingBilling}
          patients={patients}
          onClose={() => {
            setShowModal(false);
            setEditingBilling(null);
          }}
          onSave={() => {
            setShowModal(false);
            setEditingBilling(null);
            load();
          }}
        />
      )}

      {viewBilling && (
        <LMBillingView
          billing={viewBilling}
          onClose={() => setViewBilling(null)}
          onMarkPaid={handleMarkAsPaid}
        />
      )}
    </div>
  );
}
