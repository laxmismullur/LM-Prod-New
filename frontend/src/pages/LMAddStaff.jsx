import React, { useState } from 'react';
import { LMApi } from '../services/LMApiService';
import { Plus, X } from 'lucide-react';

import LMDoctors from './LMDoctors';
import LMNurses from './LMNurses';
import LMReceptionists from './LMReceptionists';
import LMPatients from './LMPatients';

/* ── Specializations ── */
const SPECIALIZATIONS = [
  'Cardiology','Neurology','Pediatrics','Orthopedics','Dermatology',
  'General Medicine','ENT','Gynecology','Ophthalmology','Psychiatry',
  'Oncology','Urology','Endocrinology','Pulmonology','Nephrology',
];

/* ── Department Map ── */
const DEPT_MAP = {
  Cardiology: 'Cardiology',
  Neurology: 'Neurology',
  Pediatrics: 'Pediatrics',
  Orthopedics: 'Orthopedics',
  Dermatology: 'Dermatology',
  'General Medicine': 'General Medicine',
  ENT: 'ENT',
  Gynecology: 'Gynecology',
  Ophthalmology: 'Ophthalmology',
};

const NAME_RE = /^[A-Za-z][A-Za-z\s.'-]{2,}$/;
const DOCTOR_NAME_RE = /^Dr\.[A-Za-z][A-Za-z\s.'-]{1,}$/;
const PHONE_RE = /^(?:\+91[-\s]?)?[6-9]\d{9}$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AddStaff() {

  const [tab, setTab] = useState('DOCTOR');
  const [showModal, setShowModal] = useState(false);
  const [role, setRole] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);

  const [form, setForm] = useState({
    fullName: '',
    username: '',
    email: '',
    password: '',
    phone: '',
    qualification: '',
    department: '',
    specialization: '',
    consultationFee: '',
    experience: '',
    availability: '',
    address: '',
    dateOfBirth: '',
    gender: '',
    bloodGroup: '',
    assignedDoctorSpecialization: '',
    emergencyContact: '',
    active: true   // ✅ ADDED
  });

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const resetForm = () => {
    setForm({
      fullName: '',
      username: '',
      email: '',
      password: '',
      phone: '',
      qualification: '',
      department: '',
      specialization: '',
      consultationFee: '',
      experience: '',
      availability: '',
      address: '',
      dateOfBirth: '',
      gender: '',
      bloodGroup: '',
      assignedDoctorSpecialization: '',
      emergencyContact: '',
      active: true   // ✅ ADDED
    });
    setRole('');
  };

  /* ── SAVE ── */
  const handleSave = async () => {

    if (!role) return alert("Select role");

    if (!form.fullName || !form.username || !form.password || !form.email || !form.phone) {
      return alert("Please fill required fields");
    }

    if (role === "DOCTOR") {
      if (!DOCTOR_NAME_RE.test(form.fullName.trim())) {
        return alert("Doctor name must be in this format: Dr.Laxmi");
      }
      if (form.qualification !== "MBBS") {
        return alert("Doctor qualification must be MBBS only");
      }
    } else if (!NAME_RE.test(form.fullName.trim())) {
      return alert("Name must contain only letters and be at least 3 characters");
    }

    if (!EMAIL_RE.test(form.email.trim())) {
      return alert("Enter a valid email address");
    }

    if (!PHONE_RE.test(form.phone.trim())) {
      return alert("Enter a valid Indian phone number");
    }

    if ((role === "DOCTOR" || role === "NURSE") && !form.specialization) {
      return alert("Select specialization");
    }

    if (role === "PATIENT" && !form.assignedDoctorSpecialization) {
      return alert("Select doctor specialization for the patient");
    }

    try {

      if (role === "DOCTOR") {

        await LMApi.createDoctor({
          fullName: form.fullName,
          specialization: form.specialization,
          department: form.department,
          email: form.email,
          phone: form.phone,
          qualification: form.qualification,
          experience: form.experience,
          consultationFee: form.consultationFee,
          availability: form.availability,
          address: form.address,
          username: form.username,
          password: form.password,
          active: form.active   // ✅ ADDED
        });

      } else if (role === "PATIENT") {

        await LMApi.createPatient({
          fullName: form.fullName,
          username: form.username,
          password: form.password,
          email: form.email,
          phone: form.phone,
          dateOfBirth: form.dateOfBirth || null,
          gender: form.gender,
          bloodGroup: form.bloodGroup,
          assignedDoctorSpecialization: form.assignedDoctorSpecialization,
          address: form.address,
          emergencyContact: form.emergencyContact,
          status: "ACTIVE"
        });

      } else {

        await LMApi.addStaff({
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          password: form.password,
          role: role,
          phone: form.phone,
          department: form.department || "General",
          active: form.active   // ✅ ADDED
        });
      }

      alert("Saved successfully ✅");

      resetForm();
      setShowModal(false);
      setRefreshKey(prev => prev + 1);

    } catch (e) {
      console.error("SAVE ERROR:", e.response?.data || e.message);
      alert("Error saving ❌");
    }
  };

  return (
    <div>

      {/* HEADER */}
      <div className="page-header">
        <h1>Staff Management</h1>

        <button
          className="btn btn-primary"
          onClick={() => {
            setRole(tab);
            setShowModal(true);
          }}
        >
          <Plus size={14} /> Add Staff
        </button>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button className={`tab-btn ${tab === 'DOCTOR' ? 'active' : ''}`} onClick={() => setTab('DOCTOR')}>
          Doctors
        </button>

        <button className={`tab-btn ${tab === 'NURSE' ? 'active' : ''}`} onClick={() => setTab('NURSE')}>
          Nurses
        </button>

        <button className={`tab-btn ${tab === 'RECEPTIONIST' ? 'active' : ''}`} onClick={() => setTab('RECEPTIONIST')}>
          Receptionists
        </button>

        <button className={`tab-btn ${tab === 'PATIENT' ? 'active' : ''}`} onClick={() => setTab('PATIENT')}>
          Patients
        </button>
      </div>

      {/* CONTENT */}
      <div style={{ marginTop: '20px' }}>
        {tab === 'DOCTOR' && <LMDoctors key={refreshKey} />}
        {tab === 'NURSE' && <LMNurses key={refreshKey} />}
        {tab === 'RECEPTIONIST' && <LMReceptionists key={refreshKey} />}
        {tab === 'PATIENT' && <LMPatients key={refreshKey} />}
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal" style={{ maxWidth: '600px' }}>

            <div className="modal-header">
              <h3>Add New {role || 'Staff'}</h3>
              <button className="close-btn" onClick={() => setShowModal(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="modal-body">

              {/* ROLE */}
              <div className="form-group">
                <label>Role *</label>
                <select value={role} onChange={e => setRole(e.target.value)}>
                  <option value="">Select Role</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="NURSE">Nurse</option>
                  <option value="RECEPTIONIST">Receptionist</option>
                  {/*<option value="PATIENT">Patient</option>*/}
                </select>
              </div>

              {/* ACTIVE / INACTIVE (ADDED) */}
              <div className="form-group">
                <label>Status</label>
                <select value={form.active} onChange={e => set('active', e.target.value === 'true')}>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>

              {/* BASIC */}
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input value={form.fullName} onChange={e => set('fullName', e.target.value)} />
                </div>

                <div className="form-group">
                  <label>Username *</label>
                  <input value={form.username} onChange={e => set('username', e.target.value)} />
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

              <div className="form-group">
                <label>Password *</label>
                <input type="password" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>

              {/* DOCTOR EXTRA */}
              {role === "DOCTOR" && (
                <>
                  <div className="form-group">
                    <label>Qualification *</label>
                    <select value={form.qualification} onChange={e => set('qualification', e.target.value)}>
                      <option value="">Select Qualification</option>
                      <option value="MBBS">MBBS</option>
                    </select>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Experience</label>
                      <input value={form.experience} onChange={e => set('experience', e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label>Fee (₹)</label>
                      <input value={form.consultationFee} onChange={e => set('consultationFee', e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Availability</label>
                    <input value={form.availability} onChange={e => set('availability', e.target.value)} />
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <input value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                </>
              )}

              {role === "PATIENT" && (
                <>
                  <div className="form-row">
                    <div className="form-group">
                      <label>Date of Birth</label>
                      <input type="date" value={form.dateOfBirth} onChange={e => set('dateOfBirth', e.target.value)} />
                    </div>

                    <div className="form-group">
                      <label>Gender</label>
                      <select value={form.gender} onChange={e => set('gender', e.target.value)}>
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Blood Group</label>
                      <select value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                        <option value="">Select Blood Group</option>
                        {['A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bg => <option key={bg}>{bg}</option>)}
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Emergency Contact</label>
                      <input value={form.emergencyContact} onChange={e => set('emergencyContact', e.target.value)} />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Doctor Specialization *</label>
                    <select value={form.assignedDoctorSpecialization} onChange={e => set('assignedDoctorSpecialization', e.target.value)}>
                      <option value="">Select Specialization</option>
                      {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Address</label>
                    <input value={form.address} onChange={e => set('address', e.target.value)} />
                  </div>
                </>
              )}

              {/* SPECIALIZATION */}
              {(role === "DOCTOR" || role === "NURSE") && (
                <div className="form-row">
                  <div className="form-group">
                    <label>Department</label>
                    <input value={form.department} readOnly />
                  </div>

                  <div className="form-group">
                    <label>Specialization</label>
                    <select
                      value={form.specialization}
                      onChange={e => {
                        const val = e.target.value;
                        set('specialization', val);
                        set('department', DEPT_MAP[val] || val);
                      }}
                    >
                      <option value="">Select Specialization</option>
                      {SPECIALIZATIONS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </div>
              )}

            </div>

            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowModal(false)}>
                Cancel
              </button>

              <button className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
