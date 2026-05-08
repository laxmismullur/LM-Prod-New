import React, { useEffect, useState } from 'react';
import { LMApi } from '../services/LMApiService';
import { useLMAuth } from '../context/LMAuthContext';
import {
  Users, CalendarDays, FileText, Stethoscope,
  AlertTriangle, Clock, TrendingUp, Activity, BedDouble
} from 'lucide-react';

function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <div style={{
      background: '#111827', border: '1px solid #1e2a3a',
      borderRadius: '12px', padding: '18px 20px',
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: '2px',
        background: accent,
      }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '11px', color: '#5a7394', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            {label}
          </div>
          <div style={{
            fontSize: '30px', fontWeight: '700', fontFamily: 'Space Mono,monospace',
            color: accent, margin: '8px 0 4px', lineHeight: 1,
          }}>
            {value ?? '—'}
          </div>
          {sub && <div style={{ fontSize: '11px', color: '#3a4f66' }}>{sub}</div>}
        </div>
        <div style={{
          width: '38px', height: '38px', borderRadius: '10px',
          background: accent + '14',
          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <Icon size={18} color={accent} />
        </div>
      </div>
    </div>
  );
}

const GREET = { ADMIN: 'Full system overview', DOCTOR: "Your patients & schedule", NURSE: "Ward overview", RECEPTIONIST: "Front desk summary", PATIENT: "Your personal health summary" };

export default function LMDashboard() {
  const { user } = useLMAuth();
  const [stats, setStats]             = useState(null);
  const [activity, setActivity]       = useState({ recentPatients: [], recentAppointments: [] });
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    Promise.all([LMApi.getStats(), LMApi.getActivity()])
      .then(([s, a]) => {
        setStats(s.data);
        setActivity(a.data);
      })
      .finally(() => setLoading(false));
  }, [user?.role]);

  if (loading) return <div className="loading-screen"><div className="spinner" /><span>Loading dashboard...</span></div>;

  const hour = new Date().getHours();
  const greet = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const fmt   = (n) => (n ?? 0).toLocaleString();

  const todayAppts = activity.recentAppointments?.filter(a => {
    const d = new Date(a.appointmentDate);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  }) ?? [];

  return (
    <div>
      {/* Page heading */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#f0f4f8', letterSpacing: '-0.4px' }}>
          {greet}, <span style={{ color: '#f59e0b' }}>{user?.fullName?.split(' ')[0]}.</span>
        </h1>
        <p style={{ color: '#5a7394', fontSize: '13px', marginTop: '3px' }}>
          {GREET[user?.role]} · {new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '28px' }}>
        <StatCard label="Total Patients"       value={fmt(stats?.totalPatients)}      sub={`${fmt(stats?.activePatients)} active`}        accent="#14b8a6" icon={Users} />
        <StatCard label="Admitted"             value={fmt(stats?.admittedPatients)}   sub="Currently in ward"                             accent="#f59e0b" icon={BedDouble} />
        <StatCard label="Critical"             value={fmt(stats?.criticalPatients)}   sub="Needs attention"                               accent="#ef4444" icon={AlertTriangle} />
        <StatCard label="Today's Appointments" value={fmt(stats?.todayAppointments)}  sub={`${fmt(stats?.pendingAppointments)} pending`}   accent="#3b82f6" icon={CalendarDays} />
        <StatCard label="Medical Records"      value={fmt(stats?.totalMedicalRecords)} sub="Total stored"                                 accent="#a855f7" icon={FileText} />
        {['ADMIN','RECEPTIONIST'].includes(user?.role) && (
          <StatCard label="Active Doctors"     value={fmt(stats?.activeDoctors)}      sub={`of ${fmt(stats?.totalDoctors)} total`}        accent="#22c55e" icon={Stethoscope} />
        )}
        {user?.role === 'ADMIN' && (
          <StatCard label="Completed Today"    value={fmt(stats?.completedAppointments)} sub="Appointments done"                          accent="#f97316" icon={TrendingUp} />
        )}
      </div>

      {/* Two-column section */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>

        {/* Content based on role */}
        {user?.role === 'PATIENT' ? (
          <>
            {/* My Appointments */}
            <div style={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={15} color="#f59e0b" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f0f4f8' }}>My Appointments</span>
              </div>
              {todayAppts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#3a4f66' }}>
                  <CalendarDays size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                  <p style={{ fontSize: '12px' }}>No appointments scheduled</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayAppts.slice(0, 6).map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: '#0d1117',
                      borderRadius: '8px', border: '1px solid #1e2a3a',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f4f8' }}>{a.doctorName}</div>
                        <div style={{ fontSize: '11px', color: '#5a7394', marginTop: '1px' }}>
                          {a.department || a.specialization}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontFamily: 'Space Mono,monospace' }}>
                          {new Date(a.appointmentDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <span className={`badge badge-${a.status?.toLowerCase()}`} style={{ marginTop: '3px' }}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Book Appointment */}
            <div style={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <CalendarDays size={15} color="#22c55e" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f0f4f8' }}>Book Appointment</span>
              </div>
              <div style={{ textAlign: 'center', padding: '20px 0' }}>
                <p style={{ fontSize: '12px', color: '#5a7394', marginBottom: '16px' }}>
                  Schedule an appointment with your assigned doctor or browse available doctors.
                </p>
                <button 
                  className="btn btn-primary" 
                  onClick={() => window.location.href = '/patients'}
                  style={{ width: '100%' }}
                >
                  <CalendarDays size={14} style={{ marginRight: '8px' }} />
                  Book New Appointment
                </button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Today's schedule */}
            <div style={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Clock size={15} color="#f59e0b" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f0f4f8' }}>Today's Schedule</span>
                <span style={{ marginLeft: 'auto', fontSize: '11px', color: '#3a4f66' }}>
                  {new Date().toLocaleDateString('en-IN')}
                </span>
              </div>
              {todayAppts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#3a4f66' }}>
                  <CalendarDays size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                  <p style={{ fontSize: '12px' }}>No appointments scheduled today</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {todayAppts.slice(0, 6).map(a => (
                    <div key={a.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: '#0d1117',
                      borderRadius: '8px', border: '1px solid #1e2a3a',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f4f8' }}>{a.patientName}</div>
                        <div style={{ fontSize: '11px', color: '#5a7394', marginTop: '1px' }}>
                          {a.doctorName} · {a.department || a.specialization}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: '#f59e0b', fontFamily: 'Space Mono,monospace' }}>
                          {new Date(a.appointmentDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <span className={`badge badge-${a.status?.toLowerCase()}`} style={{ marginTop: '3px' }}>
                          {a.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent patients */}
            <div style={{ background: '#111827', border: '1px solid #1e2a3a', borderRadius: '12px', padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <Activity size={15} color="#14b8a6" />
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#f0f4f8' }}>Recent Registrations</span>
              </div>
              {activity.recentPatients?.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '32px 0', color: '#3a4f66' }}>
                  <Users size={28} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.4 }} />
                  <p style={{ fontSize: '12px' }}>No patients yet</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {activity.recentPatients.slice(0, 6).map(p => (
                    <div key={p.id} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 12px', background: '#0d1117',
                      borderRadius: '8px', border: '1px solid #1e2a3a',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          background: '#1a2535', border: '1px solid #1e2a3a',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '11px', fontWeight: '700', color: '#5a7394', flexShrink: 0,
                        }}>
                          {p.fullName?.split(' ').map(w => w[0]).join('').slice(0, 2)}
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: '600', color: '#f0f4f8' }}>{p.fullName}</div>
                          <div style={{ fontSize: '10px', color: '#3a4f66', fontFamily: 'Space Mono,monospace' }}>{p.patientId}</div>
                        </div>
                      </div>
                      <span className={`badge badge-${p.status?.toLowerCase()}`}>{p.status}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
